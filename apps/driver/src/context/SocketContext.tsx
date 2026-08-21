import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '@safar/shared';

interface SocketContextType {
  socket: Socket | null;
  connectionState: 'CONNECTED' | 'RECONNECTING' | 'POLLING_FALLBACK';
  emitLocationUpdate: (lat: number, lng: number, rideId?: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectionState: 'POLLING_FALLBACK',
  emitLocationUpdate: () => {},
});

const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-eff74.up.railway.app';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'POLLING_FALLBACK'>('POLLING_FALLBACK');

  useEffect(() => {
    const socketClient = io(API_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketClient.on('connect', () => {
      console.log('⚡ Driver Socket Connected');
      setConnectionState('CONNECTED');
    });

    socketClient.on('disconnect', () => {
      setConnectionState('POLLING_FALLBACK');
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, []);

  // Guarantee driver registration whenever socket connects or user profile loads
  useEffect(() => {
    if (socket && user?.driverProfile?.id) {
      socket.emit('register_driver', user.driverProfile.id);
      console.log('⚡ Driver Registered on Socket:', user.driverProfile.id);
    }
  }, [socket, user?.driverProfile?.id]);

  const emitLocationUpdate = (latitude: number, longitude: number, rideId?: string) => {
    if (!socket || !user?.driverProfile?.id) return;
    socket.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, {
      driverId: user.driverProfile.id,
      rideId,
      latitude,
      longitude,
      heading: 90,
      speed: 30,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <SocketContext.Provider value={{ socket, connectionState, emitLocationUpdate }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
