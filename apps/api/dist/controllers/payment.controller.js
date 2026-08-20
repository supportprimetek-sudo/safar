"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentInfo = getPaymentInfo;
exports.confirmPayment = confirmPayment;
const prisma_1 = require("../config/prisma");
const socket_service_1 = require("../services/socket.service");
const shared_1 = require("@safar/shared");
const UPI_ID = process.env.UPI_ID || 'safar@upi';
const UPI_MERCHANT_NAME = process.env.UPI_MERCHANT_NAME || 'SAFAR Mobility';
async function getPaymentInfo(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: { payment: true },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        const amount = ride.finalFare || ride.estimatedFare;
        const upiPayload = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_MERCHANT_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`SAFAR Ride #${ride.id.slice(0, 8)}`)}`;
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function confirmPayment(req, res) {
    try {
        const { id } = req.params;
        const { paymentMethod } = req.body; // CASH or QR
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: { payment: true, driver: true },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        // Ensure valid driverId for Payment model relation
        let driverId = ride.driverId;
        if (!driverId) {
            const anyDriver = await prisma_1.prisma.driverProfile.findFirst();
            if (anyDriver) {
                driverId = anyDriver.id;
            }
        }
        const amount = ride.finalFare || ride.estimatedFare || 100;
        let payment;
        const existingPayment = await prisma_1.prisma.payment.findUnique({
            where: { rideId: id },
        });
        if (existingPayment) {
            payment = await prisma_1.prisma.payment.update({
                where: { rideId: id },
                data: {
                    paymentMethod: paymentMethod || 'CASH',
                    paymentStatus: 'PAID',
                    confirmedBy: req.user?.id || 'RIDER',
                    confirmedAt: new Date(),
                },
            });
        }
        else if (driverId) {
            payment = await prisma_1.prisma.payment.create({
                data: {
                    rideId: id,
                    riderId: ride.riderId,
                    driverId: driverId,
                    amount: amount,
                    paymentMethod: paymentMethod || 'CASH',
                    paymentStatus: 'PAID',
                    confirmedBy: req.user?.id || 'RIDER',
                    confirmedAt: new Date(),
                },
            });
        }
        else {
            // Fallback response object if no driver profile exists
            payment = {
                id: `pay-${Date.now()}`,
                rideId: id,
                riderId: ride.riderId,
                amount: amount,
                paymentStatus: 'PAID',
                paymentMethod: paymentMethod || 'CASH',
            };
        }
        // Update ride to COMPLETED
        const updatedRide = await prisma_1.prisma.ride.update({
            where: { id },
            data: { rideStatus: 'COMPLETED' },
        });
        // Increment driver total rides
        if (driverId) {
            try {
                await prisma_1.prisma.driverProfile.update({
                    where: { id: driverId },
                    data: { totalRides: { increment: 1 } },
                });
            }
            catch (e) { }
        }
        try {
            (0, socket_service_1.getIO)().to(`user:${ride.riderId}`).emit(shared_1.SOCKET_EVENTS.PAYMENT_CONFIRMED, {
                rideId: id,
                paymentId: payment.id,
                amount: payment.amount,
                rideStatus: 'COMPLETED',
            });
            (0, socket_service_1.getIO)().to(`ride:${id}`).emit(shared_1.SOCKET_EVENTS.PAYMENT_CONFIRMED, {
                rideId: id,
                paymentId: payment.id,
                amount: payment.amount,
                rideStatus: 'COMPLETED',
            });
        }
        catch (e) { }
        return res.json({
            success: true,
            message: 'Payment confirmed successfully. Ride completed!',
            data: { ride: updatedRide, payment },
        });
    }
    catch (err) {
        console.error('confirmPayment error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
