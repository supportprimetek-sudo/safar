import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveMap } from './pages/LiveMap';
import { KycManagement } from './pages/KycManagement';
import { VehicleManagement } from './pages/VehicleManagement';
import { DestinationManagement } from './pages/DestinationManagement';
import { DriverManagement } from './pages/DriverManagement';
import { RiderManagement } from './pages/RiderManagement';
import { RideManagement } from './pages/RideManagement';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11151D] text-white flex flex-col items-center justify-center font-bold space-y-3">
        <div className="w-10 h-10 border-4 border-[#35D0B0] border-t-transparent rounded-full animate-spin" />
        <div className="text-sm tracking-wide">Loading SAFAR Control Center...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-safar-bg text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export const App: React.FC = () => {
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

  return (
    <ErrorBoundary>
      <div className="saf-status-bar-shield" />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/live-map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KycManagement /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><VehicleManagement /></ProtectedRoute>} />
            <Route path="/destinations" element={<ProtectedRoute><DestinationManagement /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><DriverManagement /></ProtectedRoute>} />
            <Route path="/riders" element={<ProtectedRoute><RiderManagement /></ProtectedRoute>} />
            <Route path="/rides" element={<ProtectedRoute><RideManagement /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};
