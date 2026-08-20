import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin } from 'lucide-react';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

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
    html: `<div class="marker-badge-pickup w-9 h-9 text-sm flex items-center justify-center font-black shadow-2xl">P</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createDropIcon = () =>
  L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-badge-drop w-9 h-9 text-sm flex items-center justify-center font-black shadow-2xl">D</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createDriverIcon = () =>
  L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-driver-teal flex items-center justify-center text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12.4V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

// Map Controller for click events and smooth bounds fit
function MapController({
  pickup,
  destination,
  onMapClick,
}: {
  pickup?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, map]);

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
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker>(null);
  const destMarkerRef = useRef<L.Marker>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  // Effective destination fallback so drop marker is ALWAYS visible and draggable on map
  const effectiveDest =
    destination ||
    (pickup
      ? { lat: pickup.lat + 0.015, lng: pickup.lng + 0.015, address: 'Tap or drag on map to set drop location' }
      : null);

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

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    if (onDestDragEnd) {
      onDestDragEnd(coords);
    }
  };

  const handleGetCurrentLocation = () => {
    setLocatingGps(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocatingGps(false);
          if (mapRef.current) {
            mapRef.current.flyTo([coords.lat, coords.lng], 16, { animate: true, duration: 1.2 });
          }
          if (onRecenterGps) onRecenterGps(coords);
        },
        (err) => {
          console.warn('GPS location error or permission denied:', err);
          setLocatingGps(false);
          const fallbackCoords = pickup ? { lat: pickup.lat, lng: pickup.lng } : { lat: 28.6139, lng: 77.209 };
          if (mapRef.current) {
            mapRef.current.flyTo([fallbackCoords.lat, fallbackCoords.lng], 16, { animate: true, duration: 1 });
          }
          if (onRecenterGps) onRecenterGps(fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocatingGps(false);
      const fallbackCoords = pickup ? { lat: pickup.lat, lng: pickup.lng } : { lat: 28.6139, lng: 77.209 };
      if (mapRef.current) {
        mapRef.current.flyTo([fallbackCoords.lat, fallbackCoords.lng], 16, { animate: true });
      }
      if (onRecenterGps) onRecenterGps(fallbackCoords);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Floating Guidance Pill */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-[#202631]/95 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center space-x-2 text-xs font-bold text-white pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-[#35D0B0] animate-bounce" />
        <span>Tap or drag markers on map to set drop location</span>
      </div>

      {/* Recenter Crosshair Floating Button */}
      <button
        onClick={handleGetCurrentLocation}
        disabled={locatingGps}
        title="Recenter Map to Device GPS Location"
        className="absolute top-20 right-4 z-20 w-11 h-11 bg-[#202631]/90 backdrop-blur-md border border-white/10 text-[#35D0B0] hover:text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all group"
      >
        {locatingGps ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#35D0B0]" />
        ) : (
          <Crosshair className="w-5 h-5 group-hover:rotate-45 transition-transform" />
        )}
      </button>

      <MapContainer
        center={defaultCenter as [number, number]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full z-0"
        ref={mapRef}
      >
        <TileLayer
          url={CARTO_URL}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <MapController pickup={pickup} destination={destination} onMapClick={handleMapClick} />

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
                <div className="text-[10px] text-[#0D9488] font-bold mt-0.5">Drag to adjust pickup</div>
              </div>
            </Popup>
          </Marker>
        )}

        {effectiveDest && (
          <Marker
            draggable={!!onDestDragEnd}
            eventHandlers={destEventHandlers}
            ref={destMarkerRef}
            position={[effectiveDest.lat, effectiveDest.lng]}
            icon={createDropIcon()}
          >
            <Popup className="custom-popup">
              <div className="text-xs font-bold text-gray-900">
                Destination: {effectiveDest.address}
                <div className="text-[10px] text-[#0D9488] font-bold mt-0.5">Drag to set drop location</div>
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
