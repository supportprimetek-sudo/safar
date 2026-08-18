import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
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
      <div className="min-h-screen bg-[#11151D] text-white flex items-center justify-center font-bold">
        Loading SAFAR Control Center...
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
  return (
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
  );
};
