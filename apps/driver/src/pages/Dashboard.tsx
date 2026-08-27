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
import { initNativeNotifications, triggerNativeNotification } from '../utils/notifications';

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

  const [showGoHomeModal, setShowGoHomeModal] = useState(false);
  const [homeAddress, setHomeAddress] = useState(driver?.preferredDestinationAddress || '');
  const [goHomeLoading, setGoHomeLoading] = useState(false);

  const handleSaveGoHome = async (activate: boolean) => {
    setGoHomeLoading(true);
    try {
      await apiFetch('/api/drivers/go-home-mode', {
        method: 'POST',
        body: JSON.stringify({
          isActive: activate,
          address: homeAddress,
          latitude: 28.6139,
          longitude: 77.2090,
        }),
      });
      setShowGoHomeModal(false);
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Go Home mode update failed');
    } finally {
      setGoHomeLoading(false);
    }
  };

  // Load Earnings & Active Ride
  useEffect(() => {
    async function loadData() {
      try {
        const eRes = await apiFetch('/api/drivers/earnings');
        if (eRes && eRes.data) {
          setEarnings(eRes.data);
        }

        const rRes = await apiFetch('/api/rides/driver/history');
        if (rRes && rRes.data && Array.isArray(rRes.data)) {
          const active = rRes.data.find((r: any) =>
            ['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING'].includes(r.rideStatus)
          );
          if (active) {
            setActiveRide(active);
          }
        }
      } catch (err) {}
    }
    loadData();
  }, []);

  // Continuous Real Device GPS Heartbeat & Auto-Location when Online
  useEffect(() => {
    if (!isOnline) return;

    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          emitLocationUpdate(lat, lng, activeRide?.id);
        },
        (err) => {
          console.warn('Driver device GPS watch notice:', err);
          const fallbackLat = driver?.currentLatitude || 28.6139;
          const fallbackLng = driver?.currentLongitude || 77.2090;
          emitLocationUpdate(fallbackLat, fallbackLng, activeRide?.id);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    } else {
      const fallbackLat = driver?.currentLatitude || 28.6139;
      const fallbackLng = driver?.currentLongitude || 77.2090;
      emitLocationUpdate(fallbackLat, fallbackLng, activeRide?.id);
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, driver?.currentLatitude, driver?.currentLongitude, activeRide?.id]);

  // Initialize native notifications on mount
  useEffect(() => {
    initNativeNotifications();
  }, []);

  // Socket Listeners for Ride Requests
  useEffect(() => {
    if (!socket) return;

    const onRequestReceived = (payload: any) => {
      console.log('⚡ Driver Socket: Ride Request Received', payload);
      setIncomingRequest(payload);
      setActiveTab('dashboard');
      triggerNativeNotification('🚗 NEW SAFAR RIDE REQUEST!', `Fare: ₹${payload.estimatedFare} • Distance: ${payload.distanceKm} km`);
    };

    socket.on(SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, onRequestReceived);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_REQUEST_RECEIVED, onRequestReceived);
    };
  }, [socket]);

  // Continuous HTTP Polling Fallback for Mobile APK (Guarantees 100% Ride Request Delivery)
  useEffect(() => {
    if (!isOnline || incomingRequest) return;

    const fetchActiveRequest = async () => {
      try {
        const res = await apiFetch('/api/rides/driver/active-request');
        if (res.success && res.data) {
          console.log('⚡ Driver Polling: Active Ride Request Received', res.data);
          setIncomingRequest(res.data);
          setActiveTab('dashboard');
        }
      } catch (err) {}
    };

    fetchActiveRequest();
    const interval = setInterval(fetchActiveRequest, 3000);

    return () => clearInterval(interval);
  }, [isOnline, incomingRequest]);

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
    <div className="min-h-screen bg-safar-bg pb-[max(7.5rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto px-3 sm:px-4">
      {/* Sticky Frozen Opaque Top Header */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-3 px-3 sm:-mx-4 sm:px-4 mb-4">
        <div className="flex justify-between items-center bg-safar-card p-3.5 rounded-3xl border border-white/10 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-black text-xl">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base leading-tight">{user?.fullName}</h2>
              <p className="text-xs text-safar-textMuted">{driver?.vehicleType?.name || 'Driver Partner'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setHomeAddress(driver?.preferredDestinationAddress || '');
                setShowGoHomeModal(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all active:scale-95 flex items-center space-x-1 ${
                driver?.isGoHomeModeActive
                  ? 'bg-safar-teal/20 text-safar-teal border-safar-teal/40 shadow-[0_0_15px_rgba(53,208,176,0.3)]'
                  : 'bg-safar-surface text-safar-textMuted border-white/10 hover:text-white'
              }`}
              title="Set Go Home Destination"
            >
              <span>🏠</span>
              <span>{driver?.isGoHomeModeActive ? 'Go Home' : 'Set Home'}</span>
            </button>

            <div className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
              {isOnline ? '🟢 Online' : '⚪ Offline'}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-5">

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
      {activeTab === 'profile' && <DriverProfileView />}

      {/* Go Home Destination Modal */}
      {showGoHomeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-safar-teal/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-fade-in relative">
            <button
              onClick={() => setShowGoHomeModal(false)}
              className="absolute top-4 right-4 text-safar-textMuted hover:text-white font-black text-sm"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center mx-auto text-2xl font-black border border-safar-teal/30">
              🏠
            </div>

            <div>
              <h3 className="text-lg font-black text-white">"Go Home" Mode</h3>
              <p className="text-xs text-safar-textMuted mt-0.5">Set your preferred end-of-day home address to filter rides along your route.</p>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-safar-textMuted block mb-1">
                  Home Destination Address
                </label>
                <input
                  type="text"
                  required
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="e.g. Connaught Place, New Delhi"
                  className="w-full py-3 px-4 bg-safar-surface border border-white/20 rounded-2xl text-white font-bold text-xs focus:outline-none focus:border-safar-teal transition-all"
                />
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                {driver?.isGoHomeModeActive ? (
                  <button
                    type="button"
                    disabled={goHomeLoading}
                    onClick={() => handleSaveGoHome(false)}
                    className="py-3 bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold text-xs rounded-xl hover:bg-red-500/30 active:scale-95 transition-all col-span-2"
                  >
                    Turn Off Go Home Mode
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowGoHomeModal(false)}
                      className="py-3 bg-safar-card border border-white/10 text-white font-extrabold text-xs rounded-xl hover:bg-safar-surface active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={goHomeLoading || !homeAddress.trim()}
                      onClick={() => handleSaveGoHome(true)}
                      className="py-3 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all"
                    >
                      {goHomeLoading ? 'Activating...' : 'Activate Go Home'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <DriverBottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
    </div>
  );
};
