"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateFare = estimateFare;
exports.createRide = createRide;
exports.getActiveRideRequestForDriver = getActiveRideRequestForDriver;
exports.getRideDetails = getRideDetails;
exports.getRideStatusFallback = getRideStatusFallback;
exports.acceptRide = acceptRide;
exports.driverArrived = driverArrived;
exports.startRide = startRide;
exports.completeRide = completeRide;
exports.cancelRide = cancelRide;
exports.getRiderHistory = getRiderHistory;
exports.getDriverHistory = getDriverHistory;
exports.getPublicRideTrack = getPublicRideTrack;
exports.triggerSosEmergency = triggerSosEmergency;
const prisma_1 = require("../config/prisma");
const geo_1 = require("../utils/geo");
const socket_service_1 = require("../services/socket.service");
const shared_1 = require("@safar/shared");
async function estimateFare(req, res) {
    try {
        const { pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude } = req.body;
        if (!pickupLatitude || !pickupLongitude || !destinationLatitude || !destinationLongitude) {
            return res.status(400).json({ success: false, message: 'Pickup and destination coordinates required' });
        }
        const distanceKm = (0, geo_1.calculateDistanceKm)(Number(pickupLatitude), Number(pickupLongitude), Number(destinationLatitude), Number(destinationLongitude));
        const durationMinutes = (0, geo_1.estimateDurationMinutes)(distanceKm);
        const vehicleTypes = await prisma_1.prisma.vehicleType.findMany({
            where: { isActive: true },
            orderBy: { baseFare: 'asc' },
        });
        // Calculate Dynamic Surge Multiplier based on real-time demand vs active drivers
        const pendingRidesCount = await prisma_1.prisma.ride.count({
            where: { rideStatus: { in: ['PENDING', 'SEARCHING'] } },
        });
        const onlineDriversCount = await prisma_1.prisma.driverProfile.count({
            where: { onlineStatus: 'ONLINE' },
        });
        let surgeMultiplier = 1.0;
        if (pendingRidesCount >= 1 && pendingRidesCount >= onlineDriversCount) {
            const demandRatio = (pendingRidesCount + 1) / Math.max(1, onlineDriversCount);
            surgeMultiplier = Math.min(1.8, Math.max(1.1, Number((1.0 + (demandRatio - 1) * 0.25).toFixed(1))));
        }
        const isSurgeActive = surgeMultiplier > 1.0;
        const estimates = vehicleTypes.map((vt) => {
            const rawFare = (vt.baseFare + distanceKm * vt.perKmRate + durationMinutes * vt.perMinuteRate) * surgeMultiplier;
            const estimatedFare = Math.round(Math.max(rawFare, vt.minimumFare * surgeMultiplier));
            const baseFareNoSurge = Math.round(Math.max(vt.baseFare + distanceKm * vt.perKmRate + durationMinutes * vt.perMinuteRate, vt.minimumFare));
            return {
                vehicleType: vt,
                distanceKm,
                durationMinutes,
                estimatedFare,
                baseFareNoSurge,
                surgeMultiplier,
                isSurgeActive,
                etaMinutes: Math.floor(Math.random() * 3) + 2, // 2-4 min ETA
            };
        });
        return res.json({ success: true, data: { distanceKm, durationMinutes, surgeMultiplier, isSurgeActive, estimates } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function createRide(req, res) {
    try {
        if (!req.user || req.user.role !== 'RIDER') {
            return res.status(403).json({ success: false, message: 'Only riders can request rides' });
        }
        const { vehicleTypeId, pickupAddress, pickupLatitude, pickupLongitude, destinationAddress, destinationLatitude, destinationLongitude, scheduledFor, intermediateStops, isWomenOnlyRequested, } = req.body;
        if (!vehicleTypeId ||
            !pickupAddress ||
            pickupLatitude === undefined ||
            pickupLongitude === undefined ||
            !destinationAddress ||
            destinationLatitude === undefined ||
            destinationLongitude === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required ride booking details' });
        }
        const vehicleType = await prisma_1.prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
        if (!vehicleType) {
            return res.status(404).json({ success: false, message: 'Vehicle type not found' });
        }
        const distanceKm = (0, geo_1.calculateDistanceKm)(Number(pickupLatitude), Number(pickupLongitude), Number(destinationLatitude), Number(destinationLongitude));
        const estimatedDurationMinutes = (0, geo_1.estimateDurationMinutes)(distanceKm);
        const calculatedFare = vehicleType.baseFare + distanceKm * vehicleType.perKmRate + estimatedDurationMinutes * vehicleType.perMinuteRate;
        const estimatedFare = Math.round(Math.max(calculatedFare, vehicleType.minimumFare));
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        // Create ride in DB
        const ride = await prisma_1.prisma.ride.create({
            data: {
                riderId: req.user.id,
                vehicleTypeId,
                pickupAddress,
                pickupLatitude: Number(pickupLatitude),
                pickupLongitude: Number(pickupLongitude),
                destinationAddress,
                destinationLatitude: Number(destinationLatitude),
                destinationLongitude: Number(destinationLongitude),
                distanceKm,
                estimatedDurationMinutes,
                estimatedFare,
                rideStatus: scheduledFor ? 'SCHEDULED' : 'SEARCHING_DRIVER',
                otpCode,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                intermediateStops: intermediateStops ? JSON.stringify(intermediateStops) : null,
                isWomenOnlyRequested: Boolean(isWomenOnlyRequested),
            },
            include: {
                rider: { select: { id: true, fullName: true, phone: true, profileImage: true } },
                vehicleType: true,
            },
        });
        // Find all online drivers (Filter female drivers if requested)
        const onlineDrivers = await prisma_1.prisma.driverProfile.findMany({
            where: {
                onlineStatus: 'ONLINE',
                ...(isWomenOnlyRequested ? { gender: 'FEMALE' } : {}),
            },
            include: {
                user: { select: { id: true, fullName: true, phone: true } },
                vehicleType: true,
            },
        });
        // Sort by distance to pickup
        const eligibleDrivers = onlineDrivers
            .map((d) => {
            const dist = d.currentLatitude && d.currentLongitude
                ? (0, geo_1.calculateDistanceKm)(Number(pickupLatitude), Number(pickupLongitude), d.currentLatitude, d.currentLongitude)
                : 999;
            return { ...d, distanceToPickup: dist };
        })
            .sort((a, b) => a.distanceToPickup - b.distanceToPickup);
        // Notify online drivers via socket
        try {
            const io = (0, socket_service_1.getIO)();
            const payload = {
                rideId: ride.id,
                pickupAddress: ride.pickupAddress,
                destinationAddress: ride.destinationAddress,
                distanceKm: ride.distanceKm,
                estimatedFare: ride.estimatedFare,
                riderName: ride.rider.fullName,
                riderPhone: ride.rider.phone,
                vehicleName: ride.vehicleType.name,
                etaToPickupMinutes: 3,
                timeoutSeconds: 30,
            };
            // Broadcast to general online_drivers room
            io.to('online_drivers').emit(shared_1.SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, payload);
            // Emit to targeted driver rooms
            for (const driver of eligibleDrivers) {
                io.to(`driver:${driver.id}`).emit(shared_1.SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, {
                    ...payload,
                    etaToPickupMinutes: Math.max(1, Math.round(driver.distanceToPickup * 2)),
                });
            }
        }
        catch (e) {
            console.error('Socket notification error during driver search:', e);
        }
        return res.status(201).json({
            success: true,
            message: 'Ride request created. Searching for nearby drivers.',
            data: ride,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getActiveRideRequestForDriver(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const activeRide = await prisma_1.prisma.ride.findFirst({
            where: {
                rideStatus: 'SEARCHING_DRIVER',
                requestedAt: { gte: twoMinutesAgo },
            },
            include: {
                rider: { select: { fullName: true, phone: true } },
                vehicleType: true,
            },
            orderBy: { requestedAt: 'desc' },
        });
        if (!activeRide) {
            return res.json({ success: true, data: null });
        }
        const payload = {
            rideId: activeRide.id,
            pickupAddress: activeRide.pickupAddress,
            destinationAddress: activeRide.destinationAddress,
            distanceKm: activeRide.distanceKm,
            estimatedFare: activeRide.estimatedFare,
            riderName: activeRide.rider.fullName,
            riderPhone: activeRide.rider.phone,
            vehicleName: activeRide.vehicleType.name,
            etaToPickupMinutes: 3,
            timeoutSeconds: 30,
        };
        return res.json({ success: true, data: payload });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getRideDetails(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: {
                rider: { select: { id: true, fullName: true, phone: true, profileImage: true } },
                driver: {
                    include: {
                        user: { select: { id: true, fullName: true, phone: true, profileImage: true } },
                        vehicleType: true,
                    },
                },
                vehicleType: true,
                payment: true,
            },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        return res.json({ success: true, data: ride });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getRideStatusFallback(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: {
                driver: {
                    select: {
                        id: true,
                        currentLatitude: true,
                        currentLongitude: true,
                        rating: true,
                        user: { select: { fullName: true, phone: true, profileImage: true } },
                        vehicleType: true,
                    },
                },
                payment: true,
            },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        return res.json({
            success: true,
            data: {
                id: ride.id,
                rideStatus: ride.rideStatus,
                driver: ride.driver,
                payment: ride.payment,
                updatedAt: ride.updatedAt,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function acceptRide(req, res) {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ success: false, message: 'Only drivers can accept rides' });
        }
        const { id } = req.params;
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }
        // Atomic acceptance check to prevent double booking
        const updatedRide = await prisma_1.prisma.$transaction(async (tx) => {
            const existing = await tx.ride.findUnique({ where: { id } });
            if (!existing)
                throw new Error('Ride not found');
            if (existing.rideStatus !== 'SEARCHING_DRIVER') {
                throw new Error('Ride is no longer available');
            }
            return tx.ride.update({
                where: { id },
                data: {
                    driverId: driverProfile.id,
                    rideStatus: 'DRIVER_ACCEPTED',
                    acceptedAt: new Date(),
                },
                include: {
                    rider: { select: { id: true, fullName: true, phone: true } },
                    driver: {
                        include: {
                            user: { select: { id: true, fullName: true, phone: true } },
                            vehicleType: true,
                        },
                    },
                    vehicleType: true,
                },
            });
        });
        // Notify Rider via socket
        try {
            const io = (0, socket_service_1.getIO)();
            io.to(`user:${updatedRide.riderId}`).emit(shared_1.SOCKET_EVENTS.RIDE_ACCEPTED, {
                rideId: updatedRide.id,
                driver: updatedRide.driver,
                rideStatus: 'DRIVER_ACCEPTED',
            });
            io.to(`ride:${updatedRide.id}`).emit(shared_1.SOCKET_EVENTS.RIDE_ACCEPTED, {
                rideId: updatedRide.id,
                driver: updatedRide.driver,
                rideStatus: 'DRIVER_ACCEPTED',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Ride accepted successfully', data: updatedRide });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
}
async function driverArrived(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.update({
            where: { id },
            data: {
                rideStatus: 'DRIVER_ARRIVED',
                driverArrivedAt: new Date(),
            },
            include: { driver: { include: { user: true } } },
        });
        try {
            (0, socket_service_1.getIO)().to(`user:${ride.riderId}`).emit(shared_1.SOCKET_EVENTS.DRIVER_ARRIVED, {
                rideId: ride.id,
                rideStatus: 'DRIVER_ARRIVED',
                message: 'Your driver has arrived at the pickup location!',
            });
            (0, socket_service_1.getIO)().to(`ride:${ride.id}`).emit(shared_1.SOCKET_EVENTS.DRIVER_ARRIVED, {
                rideId: ride.id,
                rideStatus: 'DRIVER_ARRIVED',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Status updated to DRIVER_ARRIVED', data: ride });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function startRide(req, res) {
    try {
        const { id } = req.params;
        const { otpCode } = req.body;
        const existingRide = await prisma_1.prisma.ride.findUnique({ where: { id } });
        if (!existingRide) {
            return res.status(404).json({ success: false, message: 'Ride not found' });
        }
        if (existingRide.otpCode && existingRide.otpCode !== otpCode) {
            return res.status(400).json({ success: false, message: 'Invalid 4-digit Ride OTP code. Please check with rider.' });
        }
        const ride = await prisma_1.prisma.ride.update({
            where: { id },
            data: {
                rideStatus: 'IN_PROGRESS',
                startedAt: new Date(),
            },
        });
        try {
            (0, socket_service_1.getIO)().to(`user:${ride.riderId}`).emit(shared_1.SOCKET_EVENTS.RIDE_STARTED, {
                rideId: ride.id,
                rideStatus: 'IN_PROGRESS',
                message: 'Your SAFAR ride has started. Wish you a happy journey!',
            });
            (0, socket_service_1.getIO)().to(`ride:${ride.id}`).emit(shared_1.SOCKET_EVENTS.RIDE_STARTED, {
                rideId: ride.id,
                rideStatus: 'IN_PROGRESS',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Ride started', data: ride });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function completeRide(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: { driver: true },
        });
        if (!ride || !ride.driverId) {
            return res.status(404).json({ success: false, message: 'Ride or driver not found' });
        }
        const finalFare = ride.estimatedFare; // In MVP final fare equals estimated fare unless adjusted
        const updatedRide = await prisma_1.prisma.ride.update({
            where: { id },
            data: {
                rideStatus: 'PAYMENT_PENDING',
                finalFare,
                completedAt: new Date(),
            },
        });
        // Create Payment record
        const payment = await prisma_1.prisma.payment.upsert({
            where: { rideId: id },
            update: { amount: finalFare, paymentStatus: 'PENDING' },
            create: {
                rideId: id,
                riderId: ride.riderId,
                driverId: ride.driverId || ride.riderId,
                amount: finalFare,
                paymentMethod: 'CASH',
                paymentStatus: 'PENDING',
            },
        });
        try {
            (0, socket_service_1.getIO)().to(`user:${ride.riderId}`).emit(shared_1.SOCKET_EVENTS.RIDE_COMPLETED, {
                rideId: ride.id,
                finalFare,
                paymentId: payment.id,
                rideStatus: 'PAYMENT_PENDING',
            });
            (0, socket_service_1.getIO)().to(`ride:${ride.id}`).emit(shared_1.SOCKET_EVENTS.RIDE_COMPLETED, {
                rideId: ride.id,
                finalFare,
                paymentId: payment.id,
                rideStatus: 'PAYMENT_PENDING',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Ride completed, payment pending', data: { ride: updatedRide, payment } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function cancelRide(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const ride = await prisma_1.prisma.ride.update({
            where: { id },
            data: {
                rideStatus: 'CANCELLED',
                cancelledAt: new Date(),
                cancellationReason: reason || 'Cancelled by user',
            },
        });
        try {
            (0, socket_service_1.getIO)().to(`ride:${id}`).emit(shared_1.SOCKET_EVENTS.RIDE_CANCELLED, {
                rideId: id,
                reason: reason || 'Cancelled',
            });
        }
        catch (e) { }
        return res.json({ success: true, message: 'Ride cancelled', data: ride });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function getRiderHistory(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const rides = await prisma_1.prisma.ride.findMany({
            where: { riderId: req.user.id },
            include: {
                driver: {
                    include: {
                        user: { select: { fullName: true, phone: true } },
                        vehicleType: true,
                    },
                },
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
async function getDriverHistory(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const driverProfile = await prisma_1.prisma.driverProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!driverProfile)
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        const rides = await prisma_1.prisma.ride.findMany({
            where: { driverId: driverProfile.id },
            include: {
                rider: { select: { fullName: true, phone: true } },
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
async function getPublicRideTrack(req, res) {
    try {
        const { id } = req.params;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: {
                driver: {
                    select: {
                        id: true,
                        currentLatitude: true,
                        currentLongitude: true,
                        rating: true,
                        user: { select: { fullName: true } },
                        vehicleType: true,
                    },
                },
                vehicleType: true,
            },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        return res.json({
            success: true,
            data: {
                id: ride.id,
                pickupAddress: ride.pickupAddress,
                pickupLatitude: ride.pickupLatitude,
                pickupLongitude: ride.pickupLongitude,
                destinationAddress: ride.destinationAddress,
                destinationLatitude: ride.destinationLatitude,
                destinationLongitude: ride.destinationLongitude,
                rideStatus: ride.rideStatus,
                driver: ride.driver,
                vehicleType: ride.vehicleType,
                updatedAt: ride.updatedAt,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function triggerSosEmergency(req, res) {
    try {
        const { id } = req.params;
        const { latitude, longitude, customNotes } = req.body;
        const ride = await prisma_1.prisma.ride.findUnique({
            where: { id },
            include: {
                rider: { select: { fullName: true, phone: true } },
                driver: { include: { user: { select: { fullName: true, phone: true } } } },
            },
        });
        if (!ride)
            return res.status(404).json({ success: false, message: 'Ride not found' });
        const sosPayload = {
            rideId: ride.id,
            timestamp: new Date().toISOString(),
            riderName: ride.rider?.fullName || 'Rider',
            riderPhone: ride.rider?.phone || '',
            driverName: ride.driver?.user?.fullName || 'Driver',
            driverPhone: ride.driver?.user?.phone || '',
            currentLatitude: latitude || ride.pickupLatitude,
            currentLongitude: longitude || ride.pickupLongitude,
            customNotes: customNotes || 'EMERGENCY SOS BUTTON TRIGGERED BY RIDER',
        };
        console.error('🚨 HIGH PRIORITY SOS EMERGENCY TRIGGERED:', sosPayload);
        try {
            (0, socket_service_1.getIO)().to('admin:room').emit('EMERGENCY_SOS_TRIGGERED', sosPayload);
            (0, socket_service_1.getIO)().emit('EMERGENCY_SOS_TRIGGERED', sosPayload);
        }
        catch (e) { }
        return res.json({
            success: true,
            message: '🚨 Emergency SOS alert dispatched to SAFAR Control Center.',
            data: sosPayload,
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
