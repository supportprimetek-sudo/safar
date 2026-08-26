import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { Ride } from '@safar/shared';
import { MapPin, Navigation, Phone, CheckCircle, ArrowLeft, Banknote, QrCode, MessageSquare, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { DriverChatsView } from '../components/DriverChatsView';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const ActiveTrip: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [upiPayload, setUpiPayload] = useState('');

  const fetchRide = async () => {
    if (!rideId) return;
    try {
      const res = await apiFetch(`/api/rides/${rideId}`);
      setRide(res.data);

      if (res.data.rideStatus === 'COMPLETED') {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 3000);
    return () => clearInterval(interval);
  }, [rideId]);

  const [notification, setNotification] = useState<{ title: string; message: string; onOk?: () => void } | null>(null);

  const handleArrived = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/rides/${rideId}/arrived`, { method: 'POST' });
      await fetchRide();
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Arrived update failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRide = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/rides/${rideId}/start`, { method: 'POST' });
      await fetchRide();
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Start ride failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/rides/${rideId}/complete`, { method: 'POST' });
      const pRes = await apiFetch(`/api/rides/${rideId}/payment`);
      setUpiPayload(pRes.data.upiPayload);
      await fetchRide();
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Complete ride failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPayment = async (method: 'CASH' | 'QR') => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/rides/${rideId}/payment/confirm`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: method }),
      });
      setNotification({
        title: 'Payment Confirmed',
        message: '🎉 Payment successfully received! Ride completed.',
        onOk: () => navigate('/'),
      });
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Payment confirmation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !ride) {
    return <div className="min-h-screen bg-safar-bg text-white flex items-center justify-center font-bold">Loading Trip...</div>;
  }

  const pickupIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-pickup w-8 h-8 text-sm">P</div>`,
    iconSize: [32, 32],
  });

  const dropIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-drop w-8 h-8 text-sm">D</div>`,
    iconSize: [32, 32],
  });

  return (
    <div className="relative h-screen w-screen bg-safar-bg flex flex-col">
      {/* Top Floating Bar with Safe Area Top Clearance */}
      <div className="absolute top-[max(2.5rem,calc(env(safe-area-inset-top,32px)+0.5rem))] left-4 right-4 z-20 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-2xl bg-safar-card/95 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="bg-safar-card/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-extrabold text-safar-teal shadow-xl">
          Status: {ride.rideStatus}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer
          center={[ride.pickupLatitude, ride.pickupLongitude]}
          zoom={13}
          zoomControl={false}
          className="w-full h-full"
        >
          <TileLayer url={CARTO_URL} />
          <Marker position={[ride.pickupLatitude, ride.pickupLongitude]} icon={pickupIcon} />
          <Marker position={[ride.destinationLatitude, ride.destinationLongitude]} icon={dropIcon} />
          <Polyline
            positions={[
              [ride.pickupLatitude, ride.pickupLongitude],
              [ride.destinationLatitude, ride.destinationLongitude],
            ]}
            pathOptions={{ color: '#35D0B0', weight: 6 }}
          />
        </MapContainer>
      </div>

      {/* Action Drawer with Safe Area Bottom Clearance */}
      <div className="relative z-10 w-full max-w-lg mx-auto glass-panel p-5 pb-[max(2.5rem,env(safe-area-inset-bottom,32px))] rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

        {/* Passenger Info */}
        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[10px] text-safar-textMuted font-extrabold uppercase tracking-wider">Passenger</div>
            <div className="text-base font-extrabold text-white">{ride.rider?.fullName || 'Rider Partner'}</div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowChatModal(true)}
              className="w-11 h-11 rounded-2xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30 flex items-center justify-center font-black shadow-lg active:scale-95 transition-all relative"
              title="Chat with Passenger"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <a
              href={`tel:${ride.rider?.phone}`}
              className="w-11 h-11 rounded-2xl bg-safar-teal text-safar-bg flex items-center justify-center font-black shadow-lg active:scale-95 transition-all"
              title="Call Passenger"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Action Controls based on Ride State */}
        {ride.rideStatus === 'DRIVER_ACCEPTED' || ride.rideStatus === 'DRIVER_ARRIVING' ? (
          <button
            onClick={handleArrived}
            disabled={actionLoading}
            className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <CheckCircle className="w-5 h-5" />
            <span>I Have Arrived at Pickup</span>
          </button>
        ) : ride.rideStatus === 'DRIVER_ARRIVED' ? (
          <button
            onClick={handleStartRide}
            disabled={actionLoading}
            className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <Navigation className="w-5 h-5" />
            <span>START RIDE</span>
          </button>
        ) : ride.rideStatus === 'IN_PROGRESS' ? (
          <button
            onClick={handleCompleteRide}
            disabled={actionLoading}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
          >
            <CheckCircle className="w-5 h-5" />
            <span>COMPLETE RIDE</span>
          </button>
        ) : ride.rideStatus === 'PAYMENT_PENDING' ? (
          <div className="space-y-3">
            <div className="bg-safar-card p-4 rounded-2xl border border-safar-teal/30 text-center shadow-lg">
              <div className="text-xs text-safar-textMuted uppercase font-bold">Fare Amount Due</div>
              <div className="text-3xl font-black text-safar-teal mt-1">₹{ride.finalFare || ride.estimatedFare}</div>
            </div>

            {showQr && upiPayload && (
              <div className="bg-white p-4 rounded-2xl max-w-[180px] mx-auto text-center space-y-2 shadow-xl border border-white/20">
                <QRCodeSVG value={upiPayload} size={140} />
                <span className="text-[10px] text-gray-800 font-extrabold">Rider Scans QR to Pay</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQr(!showQr)}
                className="py-3.5 bg-safar-card border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
              >
                <QrCode className="w-4 h-4 text-safar-teal" />
                <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
              </button>

              <button
                onClick={() => handleConfirmPayment('CASH')}
                disabled={actionLoading}
                className="py-3.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-lg"
              >
                <Banknote className="w-4 h-4" />
                <span>Payment Received</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dark Styled Custom Notification Modal */}
      {notification && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1E2530] border border-safar-teal/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>
            <h3 className="text-lg font-black text-white">{notification.title}</h3>
            <p className="text-sm text-safar-textMuted font-medium">{notification.message}</p>
            <button
              onClick={() => {
                const action = notification.onOk;
                setNotification(null);
                if (action) action();
              }}
              className="w-full py-3.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Slide-Up Rapido Chat Drawer Modal inside ActiveTrip */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="bg-[#11151D] border-t border-white/10 rounded-t-3xl h-[88vh] flex flex-col p-4 pb-2 animate-fade-in relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 px-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-safar-teal/20 text-safar-teal font-black flex items-center justify-center text-lg border border-safar-teal/30">
                  {ride.rider?.fullName?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">{ride.rider?.fullName || 'Passenger'}</h3>
                  <p className="text-xs text-safar-teal font-bold flex items-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-safar-teal mr-1.5 animate-pulse" />
                    Passenger Connected • Live Chat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="w-9 h-9 rounded-xl bg-safar-card border border-white/10 text-white flex items-center justify-center font-extrabold text-sm active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DriverChatsView currentRide={ride} socket={socket} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
