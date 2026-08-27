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
exports.getAnalyticsSummary = getAnalyticsSummary;
exports.listPayoutRequests = listPayoutRequests;
exports.approvePayoutRequest = approvePayoutRequest;
exports.rejectPayoutRequest = rejectPayoutRequest;
const prisma_1 = require("../config/prisma");
const socket_service_1 = require("../services/socket.service");
const shared_1 = require("@safar/shared");
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
        let pendingPayoutsCount = 0;
        try {
            pendingPayoutsCount = await prisma_1.prisma.payoutRequest.count({ where: { status: 'PENDING' } });
        }
        catch (e) { }
        return res.json({
            success: true,
            data: {
                totalRiders,
                totalDrivers,
                activeDrivers,
                pendingKyc,
                pendingPayoutsCount,
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
        const { driverStatus, upiId } = req.body;
        const updated = await prisma_1.prisma.driverProfile.update({
            where: { id: driverId },
            data: {
                driverStatus: driverStatus || undefined,
                upiId: upiId !== undefined ? (upiId ? upiId.trim() : null) : undefined,
            },
        });
        return res.json({ success: true, message: `Driver account updated successfully`, data: updated });
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
async function getAnalyticsSummary(req, res) {
    try {
        const completedRides = await prisma_1.prisma.ride.findMany({
            where: { rideStatus: 'COMPLETED' },
            select: { estimatedFare: true },
        });
        const totalGrossRevenue = completedRides.reduce((sum, r) => sum + r.estimatedFare, 0);
        const totalPlatformCommission = Math.round(totalGrossRevenue * 0.15);
        const totalNetDriverEarnings = totalGrossRevenue - totalPlatformCommission;
        const payoutRequests = await prisma_1.prisma.payoutRequest.aggregate({
            where: { status: 'APPROVED' },
            _sum: { amount: true },
            _count: { id: true },
        });
        const totalSettledPayouts = payoutRequests._sum.amount || 0;
        const totalRidesCount = await prisma_1.prisma.ride.count();
        const completedRidesCount = completedRides.length;
        const cancelledRidesCount = await prisma_1.prisma.ride.count({ where: { rideStatus: 'CANCELLED' } });
        const activeDriversCount = await prisma_1.prisma.driverProfile.count({ where: { onlineStatus: 'ONLINE' } });
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function listPayoutRequests(req, res) {
    try {
        let payouts;
        try {
            payouts = await prisma_1.prisma.payoutRequest.findMany({
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
        }
        catch (e1) {
            console.warn('Prisma payout query warning, attempting simple query:', e1.message);
            try {
                payouts = await prisma_1.prisma.payoutRequest.findMany({
                    orderBy: { createdAt: 'desc' },
                });
            }
            catch (e2) {
                console.error('Payout table error:', e2.message);
                payouts = [];
            }
        }
        return res.json({ success: true, data: payouts || [] });
    }
    catch (err) {
        return res.json({ success: true, data: [] });
    }
}
async function approvePayoutRequest(req, res) {
    try {
        const { id } = req.params;
        const payout = await prisma_1.prisma.payoutRequest.findUnique({
            where: { id },
            include: {
                driver: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
            },
        });
        if (!payout)
            return res.status(404).json({ success: false, message: 'Payout request not found' });
        if (payout.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Payout request is already ${payout.status}` });
        }
        const updated = await prisma_1.prisma.$transaction([
            prisma_1.prisma.payoutRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    processedAt: new Date(),
                },
            }),
            prisma_1.prisma.driverProfile.update({
                where: { id: payout.driverId },
                data: {
                    walletBalance: { decrement: payout.amount },
                    upiId: payout.upiId,
                },
            }),
        ]);
        try {
            const io = (0, socket_service_1.getIO)();
            const message = `🎉 Payout Approved! Your payout request of ₹${payout.amount} to ${payout.upiId} has been approved and will be transferred within 24 hours.`;
            io.to(`user:${payout.driver.userId}`).emit(shared_1.SOCKET_EVENTS.NOTIFICATION_CREATED, {
                title: 'Payout Approved (Transfer within 24h)',
                message,
                type: 'PAYOUT_APPROVED',
            });
            await prisma_1.prisma.notification.create({
                data: {
                    userId: payout.driver.userId,
                    type: 'PAYOUT_APPROVED',
                    title: 'Payout Approved (Transfer within 24h)',
                    message,
                    data: JSON.stringify({ payoutId: payout.id, amount: payout.amount, transferWindow: '24 hours' }),
                },
            });
        }
        catch (e) { }
        return res.json({
            success: true,
            message: `Payout of ₹${payout.amount} approved! Transfer will complete within 24 hours.`,
            data: updated[0],
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function rejectPayoutRequest(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const payout = await prisma_1.prisma.payoutRequest.findUnique({
            where: { id },
            include: {
                driver: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
            },
        });
        if (!payout)
            return res.status(404).json({ success: false, message: 'Payout request not found' });
        if (payout.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Payout request is already ${payout.status}` });
        }
        const rejectionReason = reason || 'Insufficient account verification / Insufficient valid fare balance';
        const updated = await prisma_1.prisma.payoutRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason,
                processedAt: new Date(),
            },
        });
        try {
            const io = (0, socket_service_1.getIO)();
            const message = `❌ Payout Rejected: Your payout request of ₹${payout.amount} was rejected (${rejectionReason}).`;
            io.to(`user:${payout.driver.userId}`).emit(shared_1.SOCKET_EVENTS.NOTIFICATION_CREATED, {
                title: 'Payout Request Rejected',
                message,
                type: 'PAYOUT_REJECTED',
            });
            await prisma_1.prisma.notification.create({
                data: {
                    userId: payout.driver.userId,
                    type: 'PAYOUT_REJECTED',
                    title: 'Payout Request Rejected',
                    message,
                    data: JSON.stringify({ payoutId: payout.id, amount: payout.amount, reason: rejectionReason }),
                },
            });
        }
        catch (e) { }
        return res.json({
            success: true,
            message: `Payout request of ₹${payout.amount} rejected. Driver notified with reason: ${rejectionReason}`,
            data: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
