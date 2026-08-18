import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'POLLING_FALLBACK';

interface SocketContextType {
  socket: Socket | null;
  connectionState: ConnectionState;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectionState: 'POLLING_FALLBACK',
});

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('POLLING_FALLBACK');

  useEffect(() => {
    const socketClient = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketClient.on('connect', () => {
      console.log('⚡ Socket.IO Connected');
      setConnectionState('CONNECTED');
      if (user?.id) {
        socketClient.emit('register_user', user.id);
      }
    });

    socketClient.on('disconnect', () => {
      console.warn('⚠️ Socket.IO Disconnected! Switching to POLLING_FALLBACK');
      setConnectionState('POLLING_FALLBACK');
    });

    socketClient.on('reconnect_attempt', () => {
      setConnectionState('RECONNECTING');
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connectionState }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
