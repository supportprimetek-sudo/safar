import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import { Ride } from '@safar/shared';
import { MapPin, Navigation, Phone, CheckCircle, ArrowLeft, Banknote, QrCode } from 'lucide-react';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

export const ActiveTrip: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
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

  const handleArrived = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/rides/${rideId}/arrived`, { method: 'POST' });
      await fetchRide();
    } catch (err: any) {
      alert(err.message);
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
      alert(err.message);
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
      alert(err.message);
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
      alert('🎉 Payment Confirmed! Ride Completed.');
      navigate('/');
    } catch (err: any) {
      alert(err.message);
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
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-2xl bg-safar-card/90 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="bg-safar-card/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold text-safar-teal">
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

      {/* Action Drawer */}
      <div className="relative z-10 w-full max-w-lg mx-auto glass-panel p-5 pb-8 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

        {/* Passenger Info */}
        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-safar-textMuted font-bold uppercase">Passenger</div>
            <div className="text-base font-bold text-white">{ride.rider?.fullName}</div>
          </div>
          <a
            href={`tel:${ride.rider?.phone}`}
            className="w-10 h-10 rounded-full bg-safar-teal text-safar-bg flex items-center justify-center font-bold"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>

        {/* Action Controls based on Ride State */}
        {ride.rideStatus === 'DRIVER_ACCEPTED' || ride.rideStatus === 'DRIVER_ARRIVING' ? (
          <button
            onClick={handleArrived}
            disabled={actionLoading}
            className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>I Have Arrived at Pickup</span>
          </button>
        ) : ride.rideStatus === 'DRIVER_ARRIVED' ? (
          <button
            onClick={handleStartRide}
            disabled={actionLoading}
            className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2"
          >
            <Navigation className="w-5 h-5" />
            <span>START RIDE</span>
          </button>
        ) : ride.rideStatus === 'IN_PROGRESS' ? (
          <button
            onClick={handleCompleteRide}
            disabled={actionLoading}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>COMPLETE RIDE</span>
          </button>
        ) : ride.rideStatus === 'PAYMENT_PENDING' ? (
          <div className="space-y-3">
            <div className="bg-safar-card p-4 rounded-2xl border border-safar-teal/30 text-center">
              <div className="text-xs text-safar-textMuted uppercase font-bold">Fare Amount Due</div>
              <div className="text-3xl font-black text-safar-teal mt-1">₹{ride.finalFare || ride.estimatedFare}</div>
            </div>

            {showQr && upiPayload && (
              <div className="bg-white p-4 rounded-2xl max-w-[180px] mx-auto text-center space-y-2">
                <QRCodeSVG value={upiPayload} size={140} />
                <span className="text-[10px] text-gray-800 font-bold">Rider Scans QR to Pay</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQr(!showQr)}
                className="py-3 bg-safar-card border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5"
              >
                <QrCode className="w-4 h-4 text-safar-teal" />
                <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
              </button>

              <button
                onClick={() => handleConfirmPayment('CASH')}
                disabled={actionLoading}
                className="py-3 bg-safar-teal text-safar-bg font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5"
              >
                <Banknote className="w-4 h-4" />
                <span>Payment Received</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
