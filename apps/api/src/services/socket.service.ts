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

    // Join driver specific room & online drivers broadcast room
    socket.on('register_driver', (driverId: string) => {
      socket.join(`driver:${driverId}`);
      socket.join('online_drivers');
      console.log(`🚕 Driver ${driverId} joined room driver:${driverId} and online_drivers`);
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

    // Real-time Ride Chat Handler
    socket.on(SOCKET_EVENTS.CHAT_SEND_MESSAGE, async (data: { rideId: string; senderRole: 'RIDER' | 'DRIVER'; text: string; senderName?: string; timestamp?: string }) => {
      if (!data.rideId || !data.text || !data.text.trim()) return;

      const messagePayload = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        rideId: data.rideId,
        senderRole: data.senderRole,
        senderName: data.senderName || (data.senderRole === 'RIDER' ? 'Rider' : 'Driver'),
        text: data.text.trim(),
        timestamp: data.timestamp || new Date().toISOString(),
      };

      // 1. Broadcast message to ride room
      io.to(`ride:${data.rideId}`).emit(SOCKET_EVENTS.CHAT_NEW_MESSAGE, messagePayload);

      // 2. Broadcast directly to driver & rider rooms for 100% guaranteed delivery
      try {
        const ride = await prisma.ride.findUnique({
          where: { id: data.rideId },
          select: { riderId: true, driverId: true },
        });

        if (ride) {
          if (ride.riderId) {
            io.to(`user:${ride.riderId}`).emit(SOCKET_EVENTS.CHAT_NEW_MESSAGE, messagePayload);
          }
          if (ride.driverId) {
            io.to(`driver:${ride.driverId}`).emit(SOCKET_EVENTS.CHAT_NEW_MESSAGE, messagePayload);
          }
        }
      } catch (err) {
        console.error('Error broadcasting direct chat message:', err);
      }

      console.log(`💬 Chat message in ride:${data.rideId} from ${data.senderRole}: ${data.text}`);
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
