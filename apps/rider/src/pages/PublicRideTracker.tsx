import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ShieldCheck, MapPin, Navigation, Car, Activity } from 'lucide-react';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const PublicRideTracker: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrack = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rides/track/${rideId}`);
      const json = await res.json();
      if (json.success) {
        setRide(json.data);
      } else {
        setError(json.message || 'Ride not found');
      }
    } catch (err: any) {
      setError('Failed to connect to tracking server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, 4000); // 4-second live position refresh
    return () => clearInterval(interval);
  }, [rideId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#11151D] text-white flex flex-col items-center justify-center font-bold space-y-3">
        <div className="w-10 h-10 border-4 border-safar-teal border-t-transparent rounded-full animate-spin" />
        <div className="text-sm tracking-wide">Loading SAFAR Live Trip Tracker...</div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-[#11151D] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-3xl font-black">
          !
        </div>
        <h2 className="text-xl font-black">Trip Unavailable</h2>
        <p className="text-sm text-safar-textMuted max-w-xs">{error || 'This live tracking link is invalid or expired.'}</p>
      </div>
    );
  }

  const driverLat = ride.driver?.currentLatitude || ride.pickupLatitude;
  const driverLng = ride.driver?.currentLongitude || ride.pickupLongitude;

  const driverIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div class="bg-safar-teal text-safar-bg p-2 rounded-full border-2 border-white shadow-[0_0_20px_rgba(53,208,176,0.8)] font-black text-xs flex items-center justify-center">🚕</div>`,
    iconSize: [36, 36],
  });

  const pickupIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-pickup w-7 h-7 text-xs font-bold">P</div>`,
    iconSize: [28, 28],
  });

  const dropIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-drop w-7 h-7 text-xs font-bold">D</div>`,
    iconSize: [28, 28],
  });

  return (
    <div className="relative h-screen w-screen bg-[#11151D] flex flex-col text-white">
      {/* Top Floating Badge Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 bg-safar-card/95 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-safar-teal text-safar-bg flex items-center justify-center font-black text-lg shadow-md">
            S
          </div>
          <div>
            <h2 className="text-sm font-black text-white leading-tight">SAFAR Live Shared Trip</h2>
            <p className="text-[10px] text-safar-teal font-extrabold flex items-center mt-0.5">
              <span className="w-2 h-2 rounded-full bg-safar-teal mr-1.5 animate-pulse" />
              Live Tracking Active
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full text-xs font-extrabold">
          {ride.rideStatus}
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer center={[driverLat, driverLng]} zoom={14} zoomControl={false} className="w-full h-full">
          <TileLayer url={CARTO_URL} />
          <Marker position={[driverLat, driverLng]} icon={driverIcon} />
          <Marker position={[ride.pickupLatitude, ride.pickupLongitude]} icon={pickupIcon} />
          <Marker position={[ride.destinationLatitude, ride.destinationLongitude]} icon={dropIcon} />
          <Polyline
            positions={[
              [driverLat, driverLng],
              [ride.destinationLatitude, ride.destinationLongitude],
            ]}
            pathOptions={{ color: '#35D0B0', weight: 5 }}
          />
        </MapContainer>
      </div>

      {/* Bottom Info Sheet */}
      <div className="relative z-10 w-full max-w-lg mx-auto glass-panel p-5 pb-6 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-3">
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />

        <div className="flex items-center justify-between bg-safar-card p-3.5 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-safar-teal/20 text-safar-teal flex items-center justify-center font-bold text-base">
              {ride.driver?.user?.fullName?.charAt(0) || 'D'}
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">{ride.driver?.user?.fullName || 'Assigned Driver'}</h4>
              <p className="text-xs text-safar-textMuted">{ride.vehicleType?.name || 'SAFAR Ride'}</p>
            </div>
          </div>

          <div className="flex items-center text-xs text-safar-teal font-extrabold bg-safar-teal/10 px-3 py-1.5 rounded-xl border border-safar-teal/20">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Verified Trip
          </div>
        </div>

        <div className="bg-safar-card/60 p-3.5 rounded-2xl border border-white/5 space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-white">
            <MapPin className="w-4 h-4 text-white flex-shrink-0" />
            <span className="truncate"><strong>Pickup:</strong> {ride.pickupAddress}</span>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <Navigation className="w-4 h-4 text-safar-teal flex-shrink-0" />
            <span className="truncate"><strong>Drop:</strong> {ride.destinationAddress}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
