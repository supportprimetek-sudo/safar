"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleOnline = toggleOnline;
exports.toggleOffline = toggleOffline;
exports.updateLocation = updateLocation;
exports.getEarnings = getEarnings;
exports.requestPayout = requestPayout;
const prisma_1 = require("../config/prisma");
async function toggleOnline(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        if (driverProfile.kycStatus !== 'APPROVED' || driverProfile.driverStatus !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Cannot go ONLINE until your KYC and account application are approved by Admin.',
            });
        }
        const { latitude, longitude } = req.body;
        const updated = await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: {
                onlineStatus: 'ONLINE',
                currentLatitude: latitude !== undefined ? Number(latitude) : driverProfile.currentLatitude,
                currentLongitude: longitude !== undefined ? Number(longitude) : driverProfile.currentLongitude,
                lastLocationUpdate: new Date(),
            },
        });
        return res.json({ success: true, message: 'You are now ONLINE', data: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function toggleOffline(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const updated = await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: { onlineStatus: 'OFFLINE' },
        });
        return res.json({ success: true, message: 'You are now OFFLINE', data: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updateLocation(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
        }
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const updated = await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: {
                currentLatitude: Number(latitude),
                currentLongitude: Number(longitude),
                lastLocationUpdate: new Date(),
            },
        });
        return res.json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getEarnings(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const completedPayments = await prisma_1.prisma.payment.findMany({
            where: {
                driverId: driverProfile.id,
                paymentStatus: 'PAID',
            },
        });
        const payoutHistory = await prisma_1.prisma.payoutRequest.findMany({
            where: { driverId: driverProfile.id },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        const grossEarnings = completedPayments.reduce((acc, p) => acc + p.amount, 0);
        const netEarnings = Math.round(grossEarnings * 0.85); // 85% driver share after 15% platform commission
        const cashEarnings = completedPayments.filter((p) => p.paymentMethod === 'CASH').reduce((acc, p) => acc + p.amount, 0);
        const qrEarnings = completedPayments.filter((p) => p.paymentMethod === 'QR').reduce((acc, p) => acc + p.amount, 0);
        return res.json({
            success: true,
            data: {
                totalRides: driverProfile.totalRides,
                walletBalance: driverProfile.walletBalance || 0,
                upiId: driverProfile.upiId || '',
                grossEarnings,
                netEarnings,
                cashEarnings,
                qrEarnings,
                platformCommission: grossEarnings - netEarnings,
                rating: driverProfile.rating,
                payoutHistory,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function requestPayout(req, res) {
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
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        if (driverProfile.walletBalance < reqAmount) {
            return res.status(400).json({ success: false, message: `Insufficient wallet balance. Available: ₹${driverProfile.walletBalance}` });
        }
        const cleanUpiId = upiId.trim();
        // Create payout request and deduct from wallet
        const [payout] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.payoutRequest.create({
                data: {
                    driverId: driverProfile.id,
                    amount: reqAmount,
                    upiId: cleanUpiId,
                    status: 'APPROVED', // Instant settlement
                    processedAt: new Date(),
                },
            }),
            prisma_1.prisma.driverProfile.update({
                where: { id: driverProfile.id },
                data: {
                    walletBalance: { decrement: reqAmount },
                    upiId: cleanUpiId,
                },
            }),
        ]);
        return res.json({
            success: true,
            message: `🎉 Payout of ₹${reqAmount} processed to ${cleanUpiId}`,
            data: payout,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
