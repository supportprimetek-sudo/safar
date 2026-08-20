import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SplashScreen } from './components/SplashScreen';
import { IntroSlider } from './components/IntroSlider';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ActiveTrip } from './pages/ActiveTrip';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#11151D] text-white flex items-center justify-center font-bold">Loading SAFAR Partner...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('safar_driver_intro_seen'));

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (showIntro) {
    return <IntroSlider onFinish={() => setShowIntro(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:rideId"
          element={
            <ProtectedRoute>
              <ActiveTrip />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};
