import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';

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
