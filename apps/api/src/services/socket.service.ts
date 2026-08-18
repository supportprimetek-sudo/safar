import { Server as SocketIOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS, DriverLocationPayload } from '@safar/shared';
import { prisma } from '../config/prisma';

let ioInstance: SocketIOServer | null = null;

export function initializeSocketService(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join user specific room
    socket.on('register_user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined room user:${userId}`);
    });

    // Join driver specific room
    socket.on('register_driver', (driverId: string) => {
      socket.join(`driver:${driverId}`);
      console.log(`🚕 Driver ${driverId} joined room driver:${driverId}`);
    });

    // Join ride room
    socket.on(SOCKET_EVENTS.JOIN_RIDE_ROOM, (rideId: string) => {
      socket.join(`ride:${rideId}`);
      console.log(`🚖 Socket ${socket.id} joined ride:${rideId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_RIDE_ROOM, (rideId: string) => {
      socket.leave(`ride:${rideId}`);
    });

    // Driver location updates via WebSocket
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (payload: DriverLocationPayload) => {
      const { driverId, rideId, latitude, longitude, heading, speed } = payload;
      if (!driverId || latitude === undefined || longitude === undefined) return;

      try {
        // Update driver location in database
        await prisma.driverProfile.update({
          where: { id: driverId },
          data: {
            currentLatitude: latitude,
            currentLongitude: longitude,
            lastLocationUpdate: new Date(),
          },
        });

        // Broadcast to ride room if active
        if (rideId) {
          io.to(`ride:${rideId}`).emit(SOCKET_EVENTS.RIDE_LOCATION_UPDATE, {
            rideId,
            driverId,
            latitude,
            longitude,
            heading: heading || 0,
            speed: speed || 0,
            timestamp: new Date().toISOString(),
          });

          // Save location history in DB
          await prisma.rideLocation.create({
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
        io.to('admin:room').emit(SOCKET_EVENTS.DRIVER_LOCATION_BROADCAST, {
          driverId,
          latitude,
          longitude,
          lastUpdated: new Date().toISOString(),
        });
      } catch (err) {
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

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
}
