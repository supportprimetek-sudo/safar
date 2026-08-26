import React, { useState } from 'react';
import { Ride } from '@safar/shared';
import { Phone, Star, Shield, MapPin, Navigation, Share2, AlertTriangle, Clock } from 'lucide-react';
import { apiFetch } from '../api';

interface ActiveRideSheetProps {
  ride: Ride;
  onCancelRide?: () => void;
}

export const ActiveRideSheet: React.FC<ActiveRideSheetProps> = ({ ride, onCancelRide }) => {
  const driverUser = ride.driver?.user;
  const vehicle = ride.vehicleType;

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Calculate Haversine live driver distance & ETA
  const getDriverEtaAndDistance = () => {
    if (!ride.driver?.currentLatitude || !ride.driver?.currentLongitude) {
      return { distanceKm: '0.8', etaMin: 3 };
    }

    const targetLat = ride.rideStatus === 'IN_PROGRESS' ? ride.destinationLatitude : ride.pickupLatitude;
    const targetLng = ride.rideStatus === 'IN_PROGRESS' ? ride.destinationLongitude : ride.pickupLongitude;

    const R = 6371; // Earth radius in km
    const dLat = ((targetLat - ride.driver.currentLatitude) * Math.PI) / 180;
    const dLon = ((targetLng - ride.driver.currentLongitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((ride.driver.currentLatitude * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    const distanceKm = dist < 0.1 ? '0.1' : dist.toFixed(1);
    const etaMin = Math.max(1, Math.round(dist * 3));
    return { distanceKm, etaMin };
  };

  const { distanceKm, etaMin } = getDriverEtaAndDistance();

  const handleShareLiveTrip = async () => {
    const shareUrl = `${window.location.origin}/track/${ride.id}`;
    const shareData = {
      title: 'SAFAR Live Ride Tracking',
      text: `Track my live SAFAR ride to ${ride.destinationAddress}:`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
        setToastMessage('📋 Live tracking link copied to clipboard!');
        setTimeout(() => setToastMessage(''), 3000);
      } catch (e) {}
    }
  };

  const handleTriggerSos = async () => {
    setSosLoading(true);
    try {
      await apiFetch(`/api/rides/${ride.id}/sos`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: ride.driver?.currentLatitude || ride.pickupLatitude,
          longitude: ride.driver?.currentLongitude || ride.pickupLongitude,
        }),
      });
      setSosTriggered(true);
    } catch (err: any) {
      alert(err.message || 'SOS Trigger Failed');
    } finally {
      setSosLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (ride.rideStatus) {
      case 'DRIVER_ACCEPTED':
      case 'DRIVER_ARRIVING':
        return (
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold animate-pulse">
            Driver On The Way
          </span>
        );
      case 'DRIVER_ARRIVED':
        return (
          <span className="px-3 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full text-xs font-bold animate-bounce">
            Driver Has Arrived!
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold">
            Trip In Progress 🚕
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4 relative">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

      {/* Real-Time Driver ETA & Live Distance Counter Badge */}
      {['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.rideStatus) && (
        <div className="bg-safar-card p-3 rounded-2xl border border-safar-teal/30 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Clock className="w-4 h-4 text-safar-teal animate-spin" />
            <span>
              {ride.rideStatus === 'IN_PROGRESS' ? 'ETA to Destination:' : 'Driver Arrival:'}{' '}
              <strong className="text-safar-teal">{etaMin} mins</strong>
            </span>
          </div>
          <span className="text-xs font-extrabold text-safar-textMuted bg-safar-surface px-2.5 py-1 rounded-xl border border-white/5">
            {distanceKm} km away
          </span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-white">Active SAFAR Trip</h3>
          <p className="text-xs text-safar-textMuted">{vehicle?.name} • ₹{ride.estimatedFare}</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* 4-Digit Ride Start OTP Banner */}
      {ride.otpCode && ride.rideStatus !== 'IN_PROGRESS' && (
        <div className="bg-safar-teal/15 border border-safar-teal/40 p-3.5 rounded-2xl flex items-center justify-between shadow-lg animate-pulse-subtle">
          <div>
            <div className="text-[10px] font-black uppercase text-safar-teal tracking-wider">Start Trip OTP</div>
            <div className="text-xs text-white/80 font-medium">Give to driver to verify</div>
          </div>
          <div className="flex space-x-1.5 font-black text-xl text-safar-bg">
            {ride.otpCode.split('').map((digit, idx) => (
              <span key={idx} className="w-8 h-9 rounded-xl bg-safar-teal flex items-center justify-center shadow-md border border-white/20">
                {digit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Driver & Vehicle Details Card */}
      {ride.driver && (
        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-safar-teal/20 border border-safar-teal flex items-center justify-center font-bold text-safar-teal text-lg shadow-md">
              {driverUser?.fullName?.charAt(0) || 'D'}
            </div>
            <div>
              <h4 className="font-bold text-white text-base">{driverUser?.fullName || 'Assigned Driver'}</h4>
              <div className="flex items-center space-x-2 text-xs text-safar-textMuted mt-0.5">
                <span className="flex items-center text-yellow-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                  {ride.driver.rating?.toFixed(1) || '4.9'}
                </span>
                <span>•</span>
                <span>{ride.driver.totalRides || 120} rides</span>
              </div>
            </div>
          </div>

          <a
            href={`tel:${driverUser?.phone}`}
            className="w-11 h-11 rounded-full bg-safar-teal text-safar-bg flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            title="Call Driver"
          >
            <Phone className="w-5 h-5 fill-current" />
          </a>
        </div>
      )}

      {/* Trip Address Timeline */}
      <div className="bg-safar-card/60 p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-safar-textMuted uppercase font-bold">Pickup Location</div>
            <div className="text-sm font-semibold text-white">{ride.pickupAddress}</div>
          </div>
        </div>

        <div className="border-l-2 border-dashed border-white/20 ml-2.5 h-4" />

        <div className="flex items-start space-x-3">
          <Navigation className="w-5 h-5 text-safar-teal mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-safar-textMuted uppercase font-bold">Destination</div>
            <div className="text-sm font-semibold text-white">{ride.destinationAddress}</div>
          </div>
        </div>
      </div>

      {/* Safety Actions & Share Live Trip */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={handleShareLiveTrip}
          className="py-3 bg-safar-surface hover:bg-safar-card border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4 text-safar-teal" />
          <span>Share Live Trip</span>
        </button>

        <button
          onClick={() => setSosModalOpen(true)}
          className="py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg animate-pulse"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>SOS Emergency</span>
        </button>
      </div>

      {['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(ride.rideStatus) && onCancelRide && (
        <button
          onClick={onCancelRide}
          className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs active:scale-95 transition-all"
        >
          Cancel Trip
        </button>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-safar-teal text-safar-bg font-extrabold text-xs py-3 px-4 rounded-2xl text-center shadow-2xl animate-fade-in max-w-sm mx-auto">
          {toastMessage}
        </div>
      )}

      {/* SOS Emergency Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-red-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-fade-in relative">
            <button
              onClick={() => { setSosModalOpen(false); setSosTriggered(false); }}
              className="absolute top-4 right-4 text-safar-textMuted hover:text-white font-black text-sm"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-3xl font-black border border-red-500/30 animate-ping">
              🚨
            </div>

            {sosTriggered ? (
              <div className="space-y-3">
                <h3 className="text-xl font-black text-red-400">SOS ALERT DISPATCHED</h3>
                <p className="text-xs text-white/90 leading-relaxed font-medium">
                  Your live GPS coordinates, vehicle details, and driver info have been sent to SAFAR Control Center & Emergency Response.
                </p>
                <button
                  onClick={() => { setSosModalOpen(false); setSosTriggered(false); }}
                  className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  Close & Stay Safe
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-white">Trigger Emergency SOS?</h3>
                <p className="text-xs text-safar-textMuted leading-relaxed">
                  This will immediately alert SAFAR Fleet Operations with your live GPS location and vehicle details.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setSosModalOpen(false)}
                    className="py-3 bg-safar-card border border-white/10 text-white font-extrabold text-xs rounded-xl hover:bg-safar-surface active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTriggerSos}
                    disabled={sosLoading}
                    className="py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all"
                  >
                    {sosLoading ? 'Alerting...' : 'CONFIRM SOS'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
