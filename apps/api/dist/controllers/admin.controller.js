"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getLiveMapData = getLiveMapData;
exports.listDrivers = listDrivers;
exports.listRiders = listRiders;
exports.listAllRides = listAllRides;
exports.updateDriverStatus = updateDriverStatus;
exports.getPopularDestinations = getPopularDestinations;
exports.createPopularDestination = createPopularDestination;
exports.updatePopularDestination = updatePopularDestination;
exports.deletePopularDestination = deletePopularDestination;
const prisma_1 = require("../config/prisma");
async function getDashboardStats(req, res) {
    try {
        const totalRiders = await prisma_1.prisma.user.count({ where: { role: 'RIDER' } });
        const totalDrivers = await prisma_1.prisma.driverProfile.count();
        const activeDrivers = await prisma_1.prisma.driverProfile.count({ where: { onlineStatus: 'ONLINE' } });
        const pendingKyc = await prisma_1.prisma.driverProfile.count({ where: { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } });
        const totalRides = await prisma_1.prisma.ride.count();
        const activeRides = await prisma_1.prisma.ride.count({ where: { rideStatus: { in: ['SEARCHING_DRIVER', 'DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'] } } });
        const completedRides = await prisma_1.prisma.ride.count({ where: { rideStatus: 'COMPLETED' } });
        const cancelledRides = await prisma_1.prisma.ride.count({ where: { rideStatus: 'CANCELLED' } });
        const payments = await prisma_1.prisma.payment.findMany({ where: { paymentStatus: 'PAID' } });
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getLiveMapData(req, res) {
    try {
        const onlineDrivers = await prisma_1.prisma.driverProfile.findMany({
            where: { onlineStatus: 'ONLINE' },
            include: {
                user: { select: { fullName: true, phone: true, profileImage: true } },
                vehicleType: true,
            },
        });
        const activeRides = await prisma_1.prisma.ride.findMany({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function listDrivers(req, res) {
    try {
        const drivers = await prisma_1.prisma.driverProfile.findMany({
            include: {
                user: { select: { id: true, fullName: true, email: true, phone: true, profileImage: true, status: true } },
                vehicleType: true,
                kycDocuments: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: drivers });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function listRiders(req, res) {
    try {
        const riders = await prisma_1.prisma.user.findMany({
            where: { role: 'RIDER' },
            include: {
                riderProfile: true,
                ridesAsRider: { select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: riders });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function listAllRides(req, res) {
    try {
        const rides = await prisma_1.prisma.ride.findMany({
            include: {
                rider: { select: { fullName: true, email: true, phone: true } },
                driver: { include: { user: { select: { fullName: true, phone: true } } } },
                vehicleType: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: rides });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updateDriverStatus(req, res) {
    try {
        const { driverId } = req.params;
        const { driverStatus } = req.body; // APPROVED, SUSPENDED, BLOCKED
        const updated = await prisma_1.prisma.driverProfile.update({
            where: { id: driverId },
            data: { driverStatus },
        });
        return res.json({ success: true, message: `Driver status updated to ${driverStatus}`, data: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getPopularDestinations(req, res) {
    try {
        const destinations = await prisma_1.prisma.popularDestination.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: destinations });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function createPopularDestination(req, res) {
    try {
        const { name, address, latitude, longitude, imageUrl, rating, category } = req.body;
        const created = await prisma_1.prisma.popularDestination.create({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updatePopularDestination(req, res) {
    try {
        const { id } = req.params;
        const { name, address, latitude, longitude, imageUrl, rating, category, isActive } = req.body;
        const updated = await prisma_1.prisma.popularDestination.update({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function deletePopularDestination(req, res) {
    try {
        const { id } = req.params;
        await prisma_1.prisma.popularDestination.delete({ where: { id } });
        return res.json({ success: true, message: 'Popular destination deleted' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
