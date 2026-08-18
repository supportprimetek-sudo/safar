import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

interface MapProps {
  pickup?: { lat: number; lng: number; address: string } | null;
  destination?: { lat: number; lng: number; address: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
  onPickupDragEnd?: (coords: { lat: number; lng: number }) => void;
  onDestDragEnd?: (coords: { lat: number; lng: number }) => void;
  onRecenterGps?: (coords: { lat: number; lng: number }) => void;
}

// Custom DivIcon Badges
const createPickupIcon = () =>
  L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-pickup w-8 h-8 text-sm flex items-center justify-center font-bold">P</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createDropIcon = () =>
  L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-drop w-8 h-8 text-sm flex items-center justify-center font-bold">D</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createDriverIcon = () =>
  L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-driver-teal flex items-center justify-center text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function MapRecenter({ pickup, destination }: MapProps) {
  const map = useMap();

  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14, { animate: true });
    }
  }, [pickup, destination, map]);

  return null;
}

export const MapComponent: React.FC<MapProps> = ({
  pickup,
  destination,
  driverLocation,
  className = 'w-full h-full',
  onPickupDragEnd,
  onDestDragEnd,
  onRecenterGps,
}) => {
  const defaultCenter = pickup ? [pickup.lat, pickup.lng] : [28.6139, 77.209];
  const pickupMarkerRef = useRef<L.Marker>(null);
  const destMarkerRef = useRef<L.Marker>(null);

  const polylineCoords =
    pickup && destination
      ? [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ]
      : [];

  const pickupEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = pickupMarkerRef.current;
        if (marker != null && onPickupDragEnd) {
          const latLng = marker.getLatLng();
          onPickupDragEnd({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onPickupDragEnd]
  );

  const destEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = destMarkerRef.current;
        if (marker != null && onDestDragEnd) {
          const latLng = marker.getLatLng();
          onDestDragEnd({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onDestDragEnd]
  );

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (onRecenterGps) onRecenterGps(coords);
        },
        (err) => {
          console.warn('GPS location error:', err);
          // Fallback Delhi GPS
          if (onRecenterGps) onRecenterGps({ lat: 28.6139, lng: 77.209 });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Recenter Crosshair Floating Button */}
      <button
        onClick={handleGetCurrentLocation}
        title="Recenter Map to Current GPS Location"
        className="absolute top-20 right-4 z-20 w-11 h-11 bg-safar-card/90 backdrop-blur-md border border-white/10 text-safar-teal hover:text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all group"
      >
        <Crosshair className="w-5 h-5 group-hover:rotate-45 transition-transform" />
      </button>

      <MapContainer
        center={defaultCenter as [number, number]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          url={CARTO_URL}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <MapRecenter pickup={pickup} destination={destination} />

        {pickup && (
          <Marker
            draggable={!!onPickupDragEnd}
            eventHandlers={pickupEventHandlers}
            ref={pickupMarkerRef}
            position={[pickup.lat, pickup.lng]}
            icon={createPickupIcon()}
          >
            <Popup className="custom-popup">
              <div className="text-xs font-bold text-gray-900">
                Pickup: {pickup.address}
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Drag marker to adjust location</div>
              </div>
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker
            draggable={!!onDestDragEnd}
            eventHandlers={destEventHandlers}
            ref={destMarkerRef}
            position={[destination.lat, destination.lng]}
            icon={createDropIcon()}
          >
            <Popup className="custom-popup">
              <div className="text-xs font-bold text-gray-900">
                Destination: {destination.address}
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Drag marker to adjust location</div>
              </div>
            </Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={createDriverIcon()}>
            <Popup className="custom-popup">
              <div className="text-xs font-bold text-gray-900">Driver Location</div>
            </Popup>
          </Marker>
        )}

        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords as [number, number][]}
            pathOptions={{ color: '#35D0B0', weight: 6, opacity: 0.95 }}
          />
        )}
      </MapContainer>
    </div>
  );
};
