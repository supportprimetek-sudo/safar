"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleOnline = toggleOnline;
exports.toggleOffline = toggleOffline;
exports.updateLocation = updateLocation;
exports.getEarnings = getEarnings;
exports.requestPayout = requestPayout;
exports.toggleGoHomeMode = toggleGoHomeMode;
const prisma_1 = require("../config/prisma");
const socket_service_1 = require("../services/socket.service");
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
        // Fetch all completed rides for this driver
        const completedRides = await prisma_1.prisma.ride.findMany({
            where: {
                driverId: driverProfile.id,
                rideStatus: 'COMPLETED',
            },
            include: {
                payment: true,
            },
        });
        // Fetch all payments associated with this driver or driver's rides
        const payments = await prisma_1.prisma.payment.findMany({
            where: {
                OR: [
                    { driverId: driverProfile.id },
                    { ride: { driverId: driverProfile.id, rideStatus: 'COMPLETED' } },
                ],
            },
        });
        const payoutHistory = await prisma_1.prisma.payoutRequest.findMany({
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
            }
            else {
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
                }
                else {
                    cashEarnings += fare;
                }
            }
        }
        // 3. Guarantee grossEarnings is at least cashEarnings + qrEarnings
        grossEarnings = Math.max(grossEarnings, cashEarnings + qrEarnings);
        // 4. 85% Net Driver Share Breakdown
        const netCashEarnings = Math.round(cashEarnings * 0.85);
        const netQrEarnings = Math.round(qrEarnings * 0.85);
        const netEarnings = netCashEarnings + netQrEarnings;
        const platformCommission = grossEarnings - netEarnings;
        // 5. Calculate total requested/approved payouts
        const totalPayoutsRequested = payoutHistory
            .filter((p) => p.status !== 'REJECTED')
            .reduce((acc, p) => acc + Number(p.amount), 0);
        // 6. Available Wallet Balance for Payout (Calculated ONLY from QR / Digital Pay as Cash is in-hand)
        const walletBalance = Math.max(0, netQrEarnings - totalPayoutsRequested);
        // Sync DB walletBalance if needed
        await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: { walletBalance, totalRides: Math.max(driverProfile.totalRides, completedRides.length) },
        }).catch(() => { });
        return res.json({
            success: true,
            data: {
                totalRides: Math.max(driverProfile.totalRides, completedRides.length),
                walletBalance,
                upiId: driverProfile.upiId || '',
                grossEarnings,
                netEarnings,
                netQrEarnings,
                netCashEarnings,
                cashEarnings,
                qrEarnings,
                platformCommission,
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
        // Fetch all completed rides & payments for QR calculation
        const completedRides = await prisma_1.prisma.ride.findMany({
            where: { driverId: driverProfile.id, rideStatus: 'COMPLETED' },
            include: { payment: true },
        });
        const payoutHistory = await prisma_1.prisma.payoutRequest.findMany({
            where: { driverId: driverProfile.id },
        });
        let qrEarnings = 0;
        for (const r of completedRides) {
            const fare = Number(r.finalFare || r.estimatedFare || r.payment?.amount || 0);
            const pMethod = r.payment?.paymentMethod || 'CASH';
            if (pMethod === 'QR' || pMethod === 'UPI' || pMethod === 'ONLINE') {
                qrEarnings += fare;
            }
        }
        const netQrEarnings = Math.round(qrEarnings * 0.85);
        const totalPayoutsRequested = payoutHistory
            .filter((p) => p.status !== 'REJECTED')
            .reduce((acc, p) => acc + Number(p.amount), 0);
        const availableBalance = Math.max(0, netQrEarnings - totalPayoutsRequested);
        if (availableBalance < reqAmount) {
            return res.status(400).json({
                success: false,
                message: `Insufficient digital payout balance. Available QR/Digital Balance: ₹${availableBalance} (Cash trips collected in hand are excluded from payout withdrawal).`,
            });
        }
        const cleanUpiId = upiId.trim();
        // Create payout request with status PENDING for Admin Review & Approval
        const payout = await prisma_1.prisma.payoutRequest.create({
            data: {
                driverId: driverProfile.id,
                amount: reqAmount,
                upiId: cleanUpiId,
                status: 'PENDING',
            },
        });
        // Also update driver's default upiId in profile
        await prisma_1.prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: { upiId: cleanUpiId },
        }).catch(() => { });
        // Emit Socket.IO event to Admin room so Admin App instantly shows the new payout request
        try {
            const io = (0, socket_service_1.getIO)();
            io.to('role:ADMIN').emit('PAYOUT_REQUEST_CREATED', {
                id: payout.id,
                amount: reqAmount,
                upiId: cleanUpiId,
                driverName: req.user.email,
                status: 'PENDING',
            });
        }
        catch (e) { }
        return res.json({
            success: true,
            message: `🎉 Your payout request of ₹${reqAmount} to ${cleanUpiId} has been submitted for Admin approval! (Funds will be transferred within 24 hours).`,
            data: payout,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function toggleGoHomeMode(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const { isActive, address, latitude, longitude } = req.body;
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const updated = await prisma_1.prisma.driverProfile.update({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
