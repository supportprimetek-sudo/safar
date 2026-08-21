"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateFare = estimateFare;
exports.createRide = createRide;
exports.getRideDetails = getRideDetails;
exports.getRideStatusFallback = getRideStatusFallback;
exports.acceptRide = acceptRide;
exports.driverArrived = driverArrived;
exports.startRide = startRide;
exports.completeRide = completeRide;
exports.cancelRide = cancelRide;
exports.getRiderHistory = getRiderHistory;
exports.getDriverHistory = getDriverHistory;
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
        const estimates = vehicleTypes.map((vt) => {
            const calculatedFare = vt.baseFare + distanceKm * vt.perKmRate + durationMinutes * vt.perMinuteRate;
            const estimatedFare = Math.round(Math.max(calculatedFare, vt.minimumFare));
            return {
                vehicleType: vt,
                distanceKm,
                durationMinutes,
                estimatedFare,
                etaMinutes: Math.floor(Math.random() * 4) + 2, // 2-5 min ETA mock
            };
        });
        return res.json({ success: true, data: { distanceKm, durationMinutes, estimates } });
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
        const { vehicleTypeId, pickupAddress, pickupLatitude, pickupLongitude, destinationAddress, destinationLatitude, destinationLongitude, } = req.body;
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
                rideStatus: 'SEARCHING_DRIVER',
            },
            include: {
                rider: { select: { id: true, fullName: true, phone: true, profileImage: true } },
                vehicleType: true,
            },
        });
        // Find all online drivers
        const onlineDrivers = await prisma_1.prisma.driverProfile.findMany({
            where: {
                onlineStatus: 'ONLINE',
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
