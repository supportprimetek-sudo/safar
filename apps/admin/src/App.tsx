import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LiveMap } from './pages/LiveMap';
import { KycManagement } from './pages/KycManagement';
import { VehicleManagement } from './pages/VehicleManagement';
import { DriverManagement } from './pages/DriverManagement';
import { RiderManagement } from './pages/RiderManagement';
import { RideManagement } from './pages/RideManagement';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#11151D] text-white flex items-center justify-center font-bold">Loading SAFAR Control Center...</div>;
  if (!user) return <Navigate to="/login" replace />;

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
          <Route
            path="/*"
            element={
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/live-map" element={<LiveMap />} />
                  <Route path="/kyc" element={<KycManagement />} />
                  <Route path="/vehicles" element={<VehicleManagement />} />
                  <Route path="/drivers" element={<DriverManagement />} />
                  <Route path="/riders" element={<RiderManagement />} />
                  <Route path="/rides" element={<RideManagement />} />
                </Routes>
              </AdminLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
