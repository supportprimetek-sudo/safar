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

    // Fetch all completed rides for this driver
    const completedRides = await prisma.ride.findMany({
      where: {
        driverId: driverProfile.id,
        rideStatus: 'COMPLETED',
      },
      include: {
        payment: true,
      },
    });

    // Fetch all payments associated with this driver or driver's rides
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { driverId: driverProfile.id },
          { ride: { driverId: driverProfile.id, rideStatus: 'COMPLETED' } },
        ],
      },
    });

    const payoutHistory = await prisma.payoutRequest.findMany({
      where: { driverId: driverProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let grossEarnings = 0;
    let cashEarnings = 0;
    let qrEarnings = 0;

    // 1. Calculate from completed rides
    for (const r of completedRides) {
      const fare = Number(r.finalFare || r.estimatedFare || r.payment?.amount || 0);
      grossEarnings += fare;
      const pMethod = r.payment?.paymentMethod || 'CASH';
      if (pMethod === 'QR' || pMethod === 'UPI' || pMethod === 'ONLINE') {
        qrEarnings += fare;
      } else {
        cashEarnings += fare;
      }
    }

    // 2. Include any payment records with status PAID not captured in completedRides above
    for (const p of payments) {
      if (p.paymentStatus === 'PAID' && !completedRides.some((r) => r.id === p.rideId)) {
        const fare = Number(p.amount || 0);
        grossEarnings += fare;
        if (p.paymentMethod === 'QR' || p.paymentMethod === 'UPI' || p.paymentMethod === 'ONLINE') {
          qrEarnings += fare;
        } else {
          cashEarnings += fare;
        }
      }
    }

    // 3. Guarantee grossEarnings is at least cashEarnings + qrEarnings
    grossEarnings = Math.max(grossEarnings, cashEarnings + qrEarnings);

    // 4. 85% Net Driver Share & 15% Platform Commission
    const netEarnings = Math.round(grossEarnings * 0.85);
    const platformCommission = grossEarnings - netEarnings;

    // 5. Calculate total requested/approved payouts
    const totalPayoutsRequested = payoutHistory
      .filter((p) => p.status !== 'REJECTED')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    // 6. Effective available wallet balance
    const walletBalance = Math.max(driverProfile.walletBalance || 0, Math.max(0, netEarnings - totalPayoutsRequested));

    // Sync DB walletBalance if needed
    if ((driverProfile.walletBalance || 0) < walletBalance) {
      await prisma.driverProfile.update({
        where: { id: driverProfile.id },
        data: { walletBalance, totalRides: Math.max(driverProfile.totalRides, completedRides.length) },
      }).catch(() => {});
    }

    return res.json({
      success: true,
      data: {
        totalRides: Math.max(driverProfile.totalRides, completedRides.length),
        walletBalance,
        upiId: driverProfile.upiId || '',
        grossEarnings,
        netEarnings,
        cashEarnings,
        qrEarnings,
        platformCommission,
        rating: driverProfile.rating,
        payoutHistory,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function requestPayout(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { amount, upiId } = req.body;
    const reqAmount = Number(amount);

    if (!reqAmount || reqAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum payout withdrawal amount is ₹100' });
    }

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({ success: false, message: 'Valid UPI ID is required for payout transfer' });
    }

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    // Fetch all completed rides & payouts for accurate available balance calculation
    const completedRides = await prisma.ride.findMany({
      where: { driverId: driverProfile.id, rideStatus: 'COMPLETED' },
    });

    const payoutHistory = await prisma.payoutRequest.findMany({
      where: { driverId: driverProfile.id },
    });

    const grossEarnings = completedRides.reduce((acc, r) => acc + Number(r.finalFare || r.estimatedFare || 0), 0);
    const netEarnings = Math.round(grossEarnings * 0.85);
    const totalPayoutsRequested = payoutHistory
      .filter((p) => p.status !== 'REJECTED')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    const availableBalance = Math.max(driverProfile.walletBalance || 0, Math.max(0, netEarnings - totalPayoutsRequested));

    if (availableBalance < reqAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Available for payout: ₹${availableBalance}`,
      });
    }

    const cleanUpiId = upiId.trim();

    // Create payout request and update wallet balance
    const [payout] = await prisma.$transaction([
      prisma.payoutRequest.create({
        data: {
          driverId: driverProfile.id,
          amount: reqAmount,
          upiId: cleanUpiId,
          status: 'APPROVED', // Instant settlement
          processedAt: new Date(),
        },
      }),
      prisma.driverProfile.update({
        where: { id: driverProfile.id },
        data: {
          walletBalance: Math.max(0, availableBalance - reqAmount),
          upiId: cleanUpiId,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: `🎉 Payout of ₹${reqAmount} processed to ${cleanUpiId}`,
      data: payout,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function toggleGoHomeMode(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { isActive, address, latitude, longitude } = req.body;

    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!driverProfile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    const updated = await prisma.driverProfile.update({
      where: { id: driverProfile.id },
      data: {
        isGoHomeModeActive: Boolean(isActive),
        preferredDestinationAddress: address !== undefined ? address : driverProfile.preferredDestinationAddress,
        preferredDestinationLat: latitude !== undefined ? Number(latitude) : driverProfile.preferredDestinationLat,
        preferredDestinationLng: longitude !== undefined ? Number(longitude) : driverProfile.preferredDestinationLng,
      },
    });

    return res.json({
      success: true,
      message: isActive ? '🏠 Go Home Mode Activated! Receiving rides towards home.' : 'Go Home Mode Deactivated.',
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
