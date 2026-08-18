import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { User, DriverProfile } from '@safar/shared';

interface DriverUser extends User {
  driverProfile: DriverProfile;
}

interface AuthContextType {
  user: DriverUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DriverUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('safar_driver_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('safar_driver_token') || token;
    if (!currentToken) return;
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.data.role !== 'DRIVER') {
        throw new Error('Account role mismatch for Driver portal');
      }
      setUser(res.data);
    } catch (err) {
      console.error('Auth verification failed:', err);
      logout();
    }
  };

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      await refreshUser();
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data.user.role !== 'DRIVER') {
      throw new Error('This account is registered as ' + res.data.user.role + '. Please use the appropriate SAFAR portal.');
    }

    localStorage.setItem('safar_driver_token', res.data.token);
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const register = async (payload: any) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, role: 'DRIVER' }),
    });
    localStorage.setItem('safar_driver_token', res.data.token);
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const logout = () => {
    localStorage.removeItem('safar_driver_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
