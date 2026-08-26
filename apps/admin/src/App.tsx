import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AdminBottomNav } from './components/AdminBottomNav';
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
    <div className="flex flex-col md:flex-row min-h-screen bg-safar-bg text-white relative">
      {/* Mobile Top Header with Safe Area Notch Clearance */}
      <div className="md:hidden sticky top-0 z-30 pt-[max(2.5rem,calc(env(safe-area-inset-top,32px)+0.5rem))] pb-3 px-4 bg-[#11151D]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-safar-teal text-safar-bg flex items-center justify-center font-black text-base shadow-[0_0_15px_rgba(53,208,176,0.5)]">
            S
          </div>
          <div>
            <div className="text-sm font-black text-white leading-tight">SAFAR ADMIN</div>
            <div className="text-[9px] font-extrabold text-safar-teal uppercase">Control Center</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full text-xs font-extrabold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-safar-teal mr-1.5 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-[max(6.5rem,calc(env(safe-area-inset-bottom,32px)+4rem))] md:pb-8">
        {children}
      </main>
      <AdminBottomNav />
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
