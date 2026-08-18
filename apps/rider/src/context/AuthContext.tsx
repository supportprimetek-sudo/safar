import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { User } from '@safar/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('safar_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.data.role !== 'RIDER') {
          throw new Error('Account role mismatch for Rider portal');
        }
        setUser(res.data);
      } catch (err) {
        console.error('Auth verification failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data.user.role !== 'RIDER') {
      throw new Error('This account is registered as ' + res.data.user.role + '. Please use the appropriate SAFAR portal.');
    }

    localStorage.setItem('safar_token', res.data.token);
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const register = async (payload: any) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...payload, role: 'RIDER' }),
    });
    localStorage.setItem('safar_token', res.data.token);
    setUser(res.data.user);
    setToken(res.data.token);
  };

  const logout = () => {
    localStorage.removeItem('safar_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
