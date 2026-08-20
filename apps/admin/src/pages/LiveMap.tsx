import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const LiveMap: React.FC = () => {
  const [data, setData] = useState<{ onlineDrivers: any[]; activeRides: any[] }>({
    onlineDrivers: [],
    activeRides: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchLiveMap = async () => {
    try {
      const res = await apiFetch('/api/admin/live-map');
      if (res && res.data) {
        setData({
          onlineDrivers: res.data.onlineDrivers || [],
          activeRides: res.data.activeRides || [],
        });
      }
    } catch (err) {
      console.error('Error fetching live map:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMap();
    const interval = setInterval(fetchLiveMap, 4000);
    return () => clearInterval(interval);
  }, []);

  const createDriverIcon = (vehicleName: string) =>
    L.divIcon({
      className: 'custom-icon',
      html: `<div class="bg-safar-teal text-safar-bg p-2 rounded-full border-2 border-white shadow-[0_0_20px_rgba(53,208,176,0.8)] font-black text-xs flex items-center justify-center space-x-1"><span>🚕</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

  const getPickupIcon = () =>
    L.divIcon({
      className: 'custom-icon',
      html: `<div class="bg-white text-safar-bg border-2 border-safar-teal font-extrabold w-7 h-7 rounded-full flex items-center justify-center text-xs">P</div>`,
      iconSize: [28, 28],
    });

  const getDropIcon = () =>
    L.divIcon({
      className: 'custom-icon',
      html: `<div class="bg-safar-teal text-safar-bg border-2 border-white font-extrabold w-7 h-7 rounded-full flex items-center justify-center text-xs">D</div>`,
      iconSize: [28, 28],
    });

  return (
    <div className="h-screen w-full relative flex flex-col">
      {/* Top Header */}
      <div className="absolute top-6 left-6 z-20 bg-safar-card/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center space-x-4">
        <div>
          <h2 className="text-lg font-black text-white">SAFAR Fleet Operations Map</h2>
          <p className="text-xs text-safar-textMuted mt-0.5">
            Active Drivers: <strong className="text-safar-teal">{data.onlineDrivers.length}</strong> • Active Trips: <strong className="text-yellow-400">{data.activeRides.length}</strong>
          </p>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer center={[28.6139, 77.209]} zoom={12} zoomControl={false} className="w-full h-full">
          <TileLayer url={CARTO_URL} />

          {/* Render Online Drivers */}
          {data.onlineDrivers.map((driver) => {
            if (!driver.currentLatitude || !driver.currentLongitude) return null;
            return (
              <Marker
                key={driver.id}
                position={[driver.currentLatitude, driver.currentLongitude]}
                icon={createDriverIcon(driver.vehicleType?.name || 'Vehicle')}
              >
                <Popup>
                  <div className="text-xs space-y-1 p-1">
                    <div className="font-bold text-gray-900 text-sm">{driver.user?.fullName}</div>
                    <div className="text-gray-700">Vehicle: {driver.vehicleType?.name}</div>
                    <div className="text-gray-700">Phone: {driver.user?.phone}</div>
                    <div className="text-emerald-700 font-bold">Status: {driver.onlineStatus}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render Active Rides */}
          {data.activeRides.map((ride) => (
            <React.Fragment key={ride.id}>
              <Marker position={[ride.pickupLatitude, ride.pickupLongitude]} icon={getPickupIcon()} />
              <Marker position={[ride.destinationLatitude, ride.destinationLongitude]} icon={getDropIcon()} />
              <Polyline
                positions={[
                  [ride.pickupLatitude, ride.pickupLongitude],
                  [ride.destinationLatitude, ride.destinationLongitude],
                ]}
                pathOptions={{ color: '#35D0B0', weight: 5, opacity: 0.9 }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
