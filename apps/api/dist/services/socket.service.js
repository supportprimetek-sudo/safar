"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketService = initializeSocketService;
exports.getIO = getIO;
const shared_1 = require("@safar/shared");
const prisma_1 = require("../config/prisma");
let ioInstance = null;
function initializeSocketService(io) {
    ioInstance = io;
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);
        // Join user specific room
        socket.on('register_user', (userId) => {
            socket.join(`user:${userId}`);
            console.log(`👤 User ${userId} joined room user:${userId}`);
        });
        // Join driver specific room & online drivers broadcast room
        socket.on('register_driver', (driverId) => {
            socket.join(`driver:${driverId}`);
            socket.join('online_drivers');
            console.log(`🚕 Driver ${driverId} joined room driver:${driverId} and online_drivers`);
        });
        // Join ride room
        socket.on(shared_1.SOCKET_EVENTS.JOIN_RIDE_ROOM, (rideId) => {
            socket.join(`ride:${rideId}`);
            console.log(`🚖 Socket ${socket.id} joined ride:${rideId}`);
        });
        socket.on(shared_1.SOCKET_EVENTS.LEAVE_RIDE_ROOM, (rideId) => {
            socket.leave(`ride:${rideId}`);
        });
        // Driver location updates via WebSocket
        socket.on(shared_1.SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (payload) => {
            const { driverId, rideId, latitude, longitude, heading, speed } = payload;
            if (!driverId || latitude === undefined || longitude === undefined)
                return;
            try {
                // Update driver location in database
                await prisma_1.prisma.driverProfile.update({
                    where: { id: driverId },
                    data: {
                        currentLatitude: latitude,
                        currentLongitude: longitude,
                        lastLocationUpdate: new Date(),
                    },
                });
                // Broadcast to ride room if active
                if (rideId) {
                    io.to(`ride:${rideId}`).emit(shared_1.SOCKET_EVENTS.RIDE_LOCATION_UPDATE, {
                        rideId,
                        driverId,
                        latitude,
                        longitude,
                        heading: heading || 0,
                        speed: speed || 0,
                        timestamp: new Date().toISOString(),
                    });
                    // Save location history in DB
                    await prisma_1.prisma.rideLocation.create({
                        data: {
                            rideId,
                            driverId,
                            latitude,
                            longitude,
                            heading: heading || 0,
                            speed: speed || 0,
                        },
                    });
                }
                // Broadcast to Admin Live Map
                io.to('admin:room').emit(shared_1.SOCKET_EVENTS.DRIVER_LOCATION_BROADCAST, {
                    driverId,
                    latitude,
                    longitude,
                    lastUpdated: new Date().toISOString(),
                });
            }
            catch (err) {
                console.error('Error updating driver location:', err);
            }
        });
        // Join Admin room
        socket.on('register_admin', () => {
            socket.join('admin:room');
            console.log(`👑 Admin joined room admin:room`);
        });
        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });
}
function getIO() {
    if (!ioInstance) {
        throw new Error('Socket.IO not initialized');
    }
    return ioInstance;
}
