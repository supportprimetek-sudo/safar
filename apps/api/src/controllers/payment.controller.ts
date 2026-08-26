import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../services/socket.service';
import { SOCKET_EVENTS } from '@safar/shared';

const UPI_ID = process.env.UPI_ID || 'safar@upi';
const UPI_MERCHANT_NAME = process.env.UPI_MERCHANT_NAME || 'SAFAR Mobility';

export async function getPaymentInfo(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const amount = ride.finalFare || ride.estimatedFare;
    const upiPayload = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
      UPI_MERCHANT_NAME
    )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SAFAR Ride #${ride.id.slice(0, 8)}`)}`;

    return res.json({
      success: true,
      data: {
        rideId: ride.id,
        amount,
        paymentStatus: ride.payment?.paymentStatus || 'PENDING',
        paymentMethod: ride.payment?.paymentMethod || 'CASH',
        upiId: UPI_ID,
        merchantName: UPI_MERCHANT_NAME,
        upiPayload,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function confirmPayment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body; // CASH or QR

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const amount = ride.finalFare || ride.estimatedFare || 100;

    // Upsert payment safely
    const payment = await prisma.payment.upsert({
      where: { rideId: id },
      update: {
        driverId: ride.driverId || undefined,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: 'PAID',
        confirmedBy: req.user?.id || 'RIDER',
        confirmedAt: new Date(),
      },
      create: {
        rideId: id,
        riderId: ride.riderId,
        driverId: ride.driverId || null,
        amount: amount,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: 'PAID',
        confirmedBy: req.user?.id || 'RIDER',
        confirmedAt: new Date(),
      },
    });

    // Update ride to COMPLETED
    const updatedRide = await prisma.ride.update({
      where: { id },
      data: { rideStatus: 'COMPLETED' },
    });

    // Increment driver total rides and credit 85% earnings to wallet if driver exists
    if (ride.driverId) {
      try {
        const netDriverShare = Math.round(amount * 0.85); // 85% net fare after 15% platform fee
        await prisma.driverProfile.update({
          where: { id: ride.driverId },
          data: {
            totalRides: { increment: 1 },
            walletBalance: { increment: netDriverShare },
          },
        });
      } catch (e) {}
    }

    try {
      getIO().to(`user:${ride.riderId}`).emit(SOCKET_EVENTS.PAYMENT_CONFIRMED, {
        rideId: id,
        paymentId: payment.id,
        amount: payment.amount,
        rideStatus: 'COMPLETED',
      });
      getIO().to(`ride:${id}`).emit(SOCKET_EVENTS.PAYMENT_CONFIRMED, {
        rideId: id,
        paymentId: payment.id,
        amount: payment.amount,
        rideStatus: 'COMPLETED',
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: 'Payment confirmed successfully. Ride completed!',
      data: { ride: updatedRide, payment },
    });
  } catch (err: any) {
    console.error('confirmPayment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
