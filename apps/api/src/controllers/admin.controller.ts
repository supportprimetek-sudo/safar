import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../services/socket.service';
import { SOCKET_EVENTS } from '@safar/shared';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const totalRiders = await prisma.user.count({ where: { role: 'RIDER' } });
    const totalDrivers = await prisma.driverProfile.count();
    const activeDrivers = await prisma.driverProfile.count({ where: { onlineStatus: 'ONLINE' } });
    const pendingKyc = await prisma.driverProfile.count({ where: { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } });

    const totalRides = await prisma.ride.count();
    const activeRides = await prisma.ride.count({ where: { rideStatus: { in: ['SEARCHING_DRIVER', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } } });
    const completedRides = await prisma.ride.count({ where: { rideStatus: 'COMPLETED' } });
    const cancelledRides = await prisma.ride.count({ where: { rideStatus: 'CANCELLED' } });

    const payments = await prisma.payment.findMany({ where: { paymentStatus: 'PAID' } });
    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

    return res.json({
      success: true,
      data: {
        totalRiders,
        totalDrivers,
        activeDrivers,
        pendingKyc,
        totalRides,
        activeRides,
        completedRides,
        cancelledRides,
        totalRevenue,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getLiveMapData(req: AuthRequest, res: Response) {
  try {
    const onlineDrivers = await prisma.driverProfile.findMany({
      where: { onlineStatus: 'ONLINE' },
      include: {
        user: { select: { fullName: true, phone: true, profileImage: true } },
        vehicleType: true,
      },
    });

    const activeRides = await prisma.ride.findMany({
      where: {
        rideStatus: { in: ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'] },
      },
      include: {
        rider: { select: { fullName: true, phone: true } },
        driver: { include: { user: { select: { fullName: true } } } },
        vehicleType: true,
      },
    });

    return res.json({
      success: true,
      data: {
        onlineDrivers,
        activeRides,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function listDrivers(req: AuthRequest, res: Response) {
  try {
    const drivers = await prisma.driverProfile.findMany({
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, profileImage: true, status: true } },
        vehicleType: true,
        kycDocuments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: drivers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function listRiders(req: AuthRequest, res: Response) {
  try {
    const riders = await prisma.user.findMany({
      where: { role: 'RIDER' },
      include: {
        riderProfile: true,
        ridesAsRider: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: riders });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function listAllRides(req: AuthRequest, res: Response) {
  try {
    const rides = await prisma.ride.findMany({
      include: {
        rider: { select: { fullName: true, email: true, phone: true } },
        driver: { include: { user: { select: { fullName: true, phone: true } } } },
        vehicleType: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: rides });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateDriverStatus(req: AuthRequest, res: Response) {
  try {
    const { driverId } = req.params;
    const { driverStatus } = req.body; // APPROVED, SUSPENDED, BLOCKED

    const updated = await prisma.driverProfile.update({
      where: { id: driverId },
      data: { driverStatus },
    });

    return res.json({ success: true, message: `Driver status updated to ${driverStatus}`, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getPopularDestinations(req: AuthRequest, res: Response) {
  try {
    const destinations = await prisma.popularDestination.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: destinations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createPopularDestination(req: AuthRequest, res: Response) {
  try {
    const { name, address, latitude, longitude, imageUrl, rating, category } = req.body;
    const created = await prisma.popularDestination.create({
      data: {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
        rating: rating ? parseFloat(rating) : 4.8,
        category: category || 'Popular',
      },
    });
    return res.json({ success: true, message: 'Popular destination created', data: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updatePopularDestination(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, imageUrl, rating, category, isActive } = req.body;
    const updated = await prisma.popularDestination.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
        ...(imageUrl && { imageUrl }),
        ...(rating !== undefined && { rating: parseFloat(rating) }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return res.json({ success: true, message: 'Popular destination updated', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function deletePopularDestination(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.popularDestination.delete({ where: { id } });
    return res.json({ success: true, message: 'Popular destination deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getAnalyticsSummary(req: AuthRequest, res: Response) {
  try {
    const completedRides = await prisma.ride.findMany({
      where: { rideStatus: 'COMPLETED' },
      select: { estimatedFare: true },
    });

    const totalGrossRevenue = completedRides.reduce((sum, r) => sum + r.estimatedFare, 0);
    const totalPlatformCommission = Math.round(totalGrossRevenue * 0.15);
    const totalNetDriverEarnings = totalGrossRevenue - totalPlatformCommission;

    const payoutRequests = await prisma.payoutRequest.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalSettledPayouts = payoutRequests._sum.amount || 0;

    const totalRidesCount = await prisma.ride.count();
    const completedRidesCount = completedRides.length;
    const cancelledRidesCount = await prisma.ride.count({ where: { rideStatus: 'CANCELLED' } });
    const activeDriversCount = await prisma.driverProfile.count({ where: { onlineStatus: 'ONLINE' } });

    return res.json({
      success: true,
      data: {
        totalGrossRevenue,
        totalPlatformCommission,
        totalNetDriverEarnings,
        totalSettledPayouts,
        totalRidesCount,
        completedRidesCount,
        cancelledRidesCount,
        activeDriversCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function listPayoutRequests(req: AuthRequest, res: Response) {
  try {
    let payouts;
    try {
      payouts = await prisma.payoutRequest.findMany({
        include: {
          driver: {
            include: {
              user: { select: { id: true, fullName: true, phone: true, email: true, profileImage: true } },
              vehicleType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e1: any) {
      console.warn('Prisma payout query warning, attempting simple query:', e1.message);
      try {
        payouts = await prisma.payoutRequest.findMany({
          orderBy: { createdAt: 'desc' },
        });
      } catch (e2: any) {
        console.error('Payout table error:', e2.message);
        payouts = [];
      }
    }

    return res.json({ success: true, data: payouts || [] });
  } catch (err: any) {
    return res.json({ success: true, data: [] });
  }
}

export async function approvePayoutRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: {
        driver: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
    });

    if (!payout) return res.status(404).json({ success: false, message: 'Payout request not found' });
    if (payout.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Payout request is already ${payout.status}` });
    }

    const updated = await prisma.$transaction([
      prisma.payoutRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
        },
      }),
      prisma.driverProfile.update({
        where: { id: payout.driverId },
        data: {
          walletBalance: { decrement: payout.amount },
          upiId: payout.upiId,
        },
      }),
    ]);

    try {
      const io = getIO();
      const message = `🎉 Payout Approved! Your payout request of ₹${payout.amount} to ${payout.upiId} has been approved and will be transferred within 24 hours.`;

      io.to(`user:${payout.driver.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        title: 'Payout Approved (Transfer within 24h)',
        message,
        type: 'PAYOUT_APPROVED',
      });

      await prisma.notification.create({
        data: {
          userId: payout.driver.userId,
          type: 'PAYOUT_APPROVED',
          title: 'Payout Approved (Transfer within 24h)',
          message,
          data: JSON.stringify({ payoutId: payout.id, amount: payout.amount, transferWindow: '24 hours' }),
        },
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: `Payout of ₹${payout.amount} approved! Transfer will complete within 24 hours.`,
      data: updated[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function rejectPayoutRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payout = await prisma.payoutRequest.findUnique({
      where: { id },
      include: {
        driver: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
      },
    });

    if (!payout) return res.status(404).json({ success: false, message: 'Payout request not found' });
    if (payout.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Payout request is already ${payout.status}` });
    }

    const rejectionReason = reason || 'Insufficient account verification / Insufficient valid fare balance';

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        processedAt: new Date(),
      },
    });

    try {
      const io = getIO();
      const message = `❌ Payout Rejected: Your payout request of ₹${payout.amount} was rejected (${rejectionReason}).`;

      io.to(`user:${payout.driver.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, {
        title: 'Payout Request Rejected',
        message,
        type: 'PAYOUT_REJECTED',
      });

      await prisma.notification.create({
        data: {
          userId: payout.driver.userId,
          type: 'PAYOUT_REJECTED',
          title: 'Payout Request Rejected',
          message,
          data: JSON.stringify({ payoutId: payout.id, amount: payout.amount, reason: rejectionReason }),
        },
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: `Payout request of ₹${payout.amount} rejected. Driver notified with reason: ${rejectionReason}`,
      data: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
