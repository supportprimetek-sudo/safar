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

const API_URL = import.meta.env.VITE_API_URL || 'https://api-production-eff74.up.railway.app';

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

    socketClient.on('chat_new_message', (msg: any) => {
      console.log('💬 Background Chat Message Received in Rider App:', msg);
      if (msg && msg.rideId) {
        const storageKey = `safar_chat_${msg.rideId}`;
        const saved = localStorage.getItem(storageKey);
        let existing: any[] = [];
        if (saved) {
          try {
            existing = JSON.parse(saved);
          } catch (e) {}
        }
        if (!existing.some((m: any) => m.id === msg.id)) {
          const updated = [...existing, msg];
          localStorage.setItem(storageKey, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('safar_new_chat_message', { detail: msg }));
          try {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          } catch (e) {}
        }
      }
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
