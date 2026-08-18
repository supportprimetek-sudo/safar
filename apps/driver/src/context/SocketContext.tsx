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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'POLLING_FALLBACK'>('POLLING_FALLBACK');

  useEffect(() => {
    const socketClient = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketClient.on('connect', () => {
      console.log('⚡ Driver Socket Connected');
      setConnectionState('CONNECTED');

      if (user?.driverProfile?.id) {
        socketClient.emit('register_driver', user.driverProfile.id);
      }
    });

    socketClient.on('disconnect', () => {
      setConnectionState('POLLING_FALLBACK');
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, [user?.driverProfile?.id]);

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
