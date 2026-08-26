import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SplashScreen } from './components/SplashScreen';
import { IntroSlider } from './components/IntroSlider';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { History } from './pages/History';
import { PublicRideTracker } from './pages/PublicRideTracker';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#11151D] text-white flex items-center justify-center font-bold">Loading SAFAR...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('safar_intro_seen'));

  useEffect(() => {
    const initStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#11151D' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {}
    };
    initStatusBar();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (showIntro) {
    return <IntroSlider onFinish={() => setShowIntro(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/track/:rideId" element={<PublicRideTracker />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
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
        <div className="saf-status-bar-shield" />
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
};
