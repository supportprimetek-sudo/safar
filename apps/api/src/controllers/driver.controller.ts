import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

export async function toggleOnline(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    if (driverProfile.kycStatus !== 'APPROVED' || driverProfile.driverStatus !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot go ONLINE until your KYC and account application are approved by Admin.',
      });
    }

    const { latitude, longitude } = req.body;

    const updated = await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        onlineStatus: 'ONLINE',
        currentLatitude: latitude !== undefined ? Number(latitude) : driverProfile.currentLatitude,
        currentLongitude: longitude !== undefined ? Number(longitude) : driverProfile.currentLongitude,
        lastLocationUpdate: new Date(),
      },
    });

    return res.json({ success: true, message: 'You are now ONLINE', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleOffline(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    const updated = await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: { onlineStatus: 'OFFLINE' },
    });

    return res.json({ success: true, message: 'You are now OFFLINE', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateLocation(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    const updated = await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        currentLatitude: Number(latitude),
        currentLongitude: Number(longitude),
        lastLocationUpdate: new Date(),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getEarnings(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    const completedPayments = await prisma.payment.findMany({
      where: {
        driverId: driverProfile.id,
        paymentStatus: 'PAID',
      },
    });

    const totalEarnings = completedPayments.reduce((acc, p) => acc + p.amount, 0);
    const cashEarnings = completedPayments.filter((p) => p.paymentMethod === 'CASH').reduce((acc, p) => acc + p.amount, 0);
    const qrEarnings = completedPayments.filter((p) => p.paymentMethod === 'QR').reduce((acc, p) => acc + p.amount, 0);

    return res.json({
      success: true,
      data: {
        totalRides: driverProfile.totalRides,
        totalEarnings,
        cashEarnings,
        qrEarnings,
        rating: driverProfile.rating,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
