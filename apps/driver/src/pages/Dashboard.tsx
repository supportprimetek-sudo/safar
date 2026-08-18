import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../api';
import { RideRequestModal } from '../components/RideRequestModal';
import { KycUploader } from '../components/KycUploader';
import { DriverBottomNav, DriverTab } from '../components/DriverBottomNav';
import { EarningsView } from '../components/EarningsView';
import { DriverChatsView } from '../components/DriverChatsView';
import { DriverProfileView } from '../components/DriverProfileView';
import { SOCKET_EVENTS } from '@safar/shared';
import { Power, DollarSign, Award, Car, LogOut, AlertCircle, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { socket, emitLocationUpdate } = useSocket();
  const navigate = useNavigate();

  // Tab State: 'dashboard' | 'earnings' | 'chats' | 'profile'
  const [activeTab, setActiveTab] = useState<DriverTab>('dashboard');

  const driver = user?.driverProfile;
  const isKycApproved = driver?.kycStatus === 'APPROVED' && driver?.driverStatus === 'APPROVED';
  const isOnline = driver?.onlineStatus === 'ONLINE';

  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>({ totalEarnings: 0, totalRides: 0, cashEarnings: 0, qrEarnings: 0 });
  const [activeRide, setActiveRide] = useState<any>(null);

  // Load Earnings & Active Ride
  useEffect(() => {
    async function loadData() {
      try {
        const eRes = await apiFetch('/api/drivers/earnings');
        setEarnings(eRes.data);

        const rRes = await apiFetch('/api/rides/driver/history');
        const active = rRes.data.find((r: any) =>
          ['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING'].includes(r.rideStatus)
        );
        if (active) {
          setActiveRide(active);
        }
      } catch (err) {}
    }
    loadData();
  }, []);

  // Continuous GPS Heartbeat when Online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      const lat = (driver?.currentLatitude || 28.6139) + (Math.random() - 0.5) * 0.001;
      const lng = (driver?.currentLongitude || 77.2090) + (Math.random() - 0.5) * 0.001;
      emitLocationUpdate(lat, lng, activeRide?.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline, driver?.currentLatitude, driver?.currentLongitude, activeRide?.id]);

  // Socket Listeners for Ride Requests
  useEffect(() => {
    if (!socket) return;

    const onRequestReceived = (payload: any) => {
      console.log('⚡ Driver Socket: Ride Request Received', payload);
      setIncomingRequest(payload);
      setActiveTab('dashboard');
    };

    socket.on(SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, onRequestReceived);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, onRequestReceived);
    };
  }, [socket]);

  // Online / Offline Toggle
  const handleToggleOnline = async () => {
    try {
      if (isOnline) {
        await apiFetch('/api/drivers/offline', { method: 'POST' });
      } else {
        await apiFetch('/api/drivers/online', {
          method: 'POST',
          body: JSON.stringify({ latitude: 28.6139, longitude: 77.2090 }),
        });
      }
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Status toggle failed');
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async (rideId: string) => {
    try {
      await apiFetch(`/api/rides/${rideId}/accept`, { method: 'POST' });
      setIncomingRequest(null);
      navigate(`/trip/${rideId}`);
    } catch (err: any) {
      alert(err.message || 'Accept failed');
      setIncomingRequest(null);
    }
  };

  // Reject Ride Request
  const handleRejectRide = async (rideId: string) => {
    setIncomingRequest(null);
  };

  return (
    <div className="min-h-screen bg-safar-bg pb-28 max-w-lg mx-auto px-3 sm:px-4">
      {activeTab === 'dashboard' && (
        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="flex justify-between items-center bg-safar-card p-4 rounded-3xl border border-white/10 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-black text-xl">
                {user?.fullName?.charAt(0) || 'D'}
              </div>
              <div>
                <h2 className="font-extrabold text-white text-base">{user?.fullName}</h2>
                <p className="text-xs text-safar-textMuted">{driver?.vehicleType?.name || 'Driver Partner'}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-10 h-10 rounded-2xl bg-safar-surface border border-white/10 flex items-center justify-center text-red-400 hover:bg-safar-card"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Online / Offline Switch Container */}
          {isKycApproved ? (
            <div className="bg-safar-card p-5 rounded-3xl border border-white/10 text-center space-y-3">
              <div className="flex justify-center">
                <button
                  onClick={handleToggleOnline}
                  className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                    isOnline
                      ? 'bg-safar-teal border-white text-safar-bg shadow-[0_0_40px_rgba(53,208,176,0.8)] scale-105'
                      : 'bg-safar-surface border-white/20 text-safar-textMuted hover:border-safar-teal'
                  }`}
                >
                  <Power className="w-9 h-9 stroke-[2.5]" />
                  <span className="text-xs font-black uppercase mt-1">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </button>
              </div>

              <p className="text-xs font-bold text-safar-textMuted">
                {isOnline ? '⚡ You are ONLINE and ready to receive ride requests!' : 'Switch ONLINE to start accepting passenger rides'}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <strong>Account Pending Verification:</strong> Complete your KYC document upload below to get approved by Admin.
              </div>
            </div>
          )}

          {/* Active Trip Banner */}
          {activeRide && (
            <div className="bg-safar-teal/20 border-2 border-safar-teal p-4 rounded-3xl flex items-center justify-between shadow-[0_0_25px_rgba(53,208,176,0.3)]">
              <div>
                <span className="text-[10px] font-extrabold bg-safar-teal text-safar-bg px-2 py-0.5 rounded-full uppercase">
                  Ongoing Trip
                </span>
                <h4 className="font-bold text-white text-sm mt-1">Trip to {activeRide.destinationAddress}</h4>
              </div>
              <button
                onClick={() => navigate(`/trip/${activeRide.id}`)}
                className="px-4 py-2.5 bg-safar-teal text-safar-bg font-extrabold rounded-2xl text-xs flex items-center space-x-1.5"
              >
                <Navigation className="w-4 h-4" />
                <span>Open Navigation</span>
              </button>
            </div>
          )}

          {/* Earnings & Stats Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setActiveTab('earnings')}
              className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-1 cursor-pointer hover:border-safar-teal/30 transition-all active:scale-98"
            >
              <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold">
                <span>Today's Earnings</span>
                <DollarSign className="w-4 h-4 text-safar-teal" />
              </div>
              <div className="text-2xl font-black text-safar-teal">₹{earnings.totalEarnings}</div>
              <div className="text-[10px] text-safar-textMuted">Cash: ₹{earnings.cashEarnings} • QR: ₹{earnings.qrEarnings}</div>
            </div>

            <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-1">
              <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold">
                <span>Total Rides</span>
                <Car className="w-4 h-4 text-safar-teal" />
              </div>
              <div className="text-2xl font-black text-white">{earnings.totalRides}</div>
              <div className="text-[10px] text-safar-textMuted">Rating: {earnings.rating?.toFixed(1) || '4.9'} ★</div>
            </div>
          </div>

          {/* KYC Onboarding Section */}
          {!isKycApproved && <KycUploader />}

          {/* Realtime Request Popup Modal */}
          {incomingRequest && (
            <RideRequestModal
              request={incomingRequest}
              onAccept={handleAcceptRide}
              onReject={handleRejectRide}
            />
          )}
        </div>
      )}

      {activeTab === 'earnings' && <EarningsView />}
      {activeTab === 'chats' && <DriverChatsView />}
      {activeTab === 'profile' && <DriverProfileView />}

      {/* Fixed Bottom Navigation Bar */}
      <DriverBottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
    </div>
  );
};
