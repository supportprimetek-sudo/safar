import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin } from 'lucide-react';

const CARTO_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

interface MapProps {
  pickup?: { lat: number; lng: number; address: string } | null;
  destination?: { lat: number; lng: number; address: string } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
  isPinningMode?: boolean;
  onPickupDragEnd?: (coords: { lat: number; lng: number }) => void;
  onDestDragEnd?: (coords: { lat: number; lng: number }) => void;
  onRecenterGps?: (coords: { lat: number; lng: number }) => void;
  onCenterChange?: (coords: { lat: number; lng: number }) => void;
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

// Map Controller for click events and smooth bounds fit without snapping during drag
function MapController({
  pickup,
  destination,
  isPinningMode,
  onMapClick,
  onCenterChange,
}: {
  pickup?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  isPinningMode?: boolean;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onCenterChange?: (coords: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
    moveend() {
      if (isPinningMode && onCenterChange) {
        const center = map.getCenter();
        onCenterChange({ lat: center.lat, lng: center.lng });
      }
    },
  });

  const hasFittedRef = useRef(false);

  useEffect(() => {
    // Fit bounds initial load when destination is set, NOT during dragging
    if (pickup && destination && !hasFittedRef.current && !isPinningMode) {
      hasFittedRef.current = true;
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      );
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, isPinningMode, map]);

  return null;
}

export const MapComponent: React.FC<MapProps> = ({
  pickup,
  destination,
  driverLocation,
  className = 'w-full h-full',
  isPinningMode = false,
  onPickupDragEnd,
  onDestDragEnd,
  onRecenterGps,
  onCenterChange,
}) => {
  const defaultCenter = pickup ? [pickup.lat, pickup.lng] : [28.6139, 77.209];
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker>(null);
  const destMarkerRef = useRef<L.Marker>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);

  // OSRM Road-Following Polyline Engine
  useEffect(() => {
    if (!pickup || !destination) {
      setRoadRouteCoords([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]?.geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setRoadRouteCoords(coords);
        } else {
          setRoadRouteCoords([[pickup.lat, pickup.lng], [destination.lat, destination.lng]]);
        }
      } catch (err) {
        console.warn('OSRM road routing error:', err);
        setRoadRouteCoords([[pickup.lat, pickup.lng], [destination.lat, destination.lng]]);
      }
    };

    fetchRoute();
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  // Effective destination fallback so drop marker is ALWAYS visible and draggable anywhere on map
  const effectiveDest =
    destination ||
    (pickup
      ? { lat: pickup.lat + 0.012, lng: pickup.lng + 0.012, address: 'Tap or drag on map to set drop location' }
      : null);

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
          setUserGpsCoords(coords);
          if (mapRef.current) {
            mapRef.current.flyTo([coords.lat, coords.lng], 17, { animate: true, duration: 1.5 });
          }
          if (onRecenterGps) onRecenterGps(coords);
        },
        (err) => {
          console.warn('GPS location error or permission denied:', err);
          setLocatingGps(false);
          const fallbackCoords = pickup ? { lat: pickup.lat, lng: pickup.lng } : { lat: 28.6139, lng: 77.209 };
          setUserGpsCoords(fallbackCoords);
          if (mapRef.current) {
            mapRef.current.flyTo([fallbackCoords.lat, fallbackCoords.lng], 17, { animate: true, duration: 1.2 });
          }
          if (onRecenterGps) onRecenterGps(fallbackCoords);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setLocatingGps(false);
      const fallbackCoords = pickup ? { lat: pickup.lat, lng: pickup.lng } : { lat: 28.6139, lng: 77.209 };
      setUserGpsCoords(fallbackCoords);
      if (mapRef.current) {
        mapRef.current.flyTo([fallbackCoords.lat, fallbackCoords.lng], 17, { animate: true });
      }
      if (onRecenterGps) onRecenterGps(fallbackCoords);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Floating Guidance Pill */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-[#202631]/95 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl flex items-center space-x-2 text-xs font-bold text-white pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-[#35D0B0] animate-bounce" />
        <span>{isPinningMode ? 'Move map to position central drop pin' : 'Tap map or drag marker to set drop location'}</span>
      </div>

      {/* Central Target Pin Overlay (Active during Pinning Mode) */}
      {isPinningMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-30 pointer-events-none flex flex-col items-center">
          <div className="bg-[#E53935] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-2xl mb-1 border border-white/20 whitespace-nowrap animate-pulse">
            Drop Location Here
          </div>
          <div className="w-10 h-10 rounded-full bg-[#E53935] border-4 border-white flex items-center justify-center shadow-2xl text-white font-black text-sm">
            D
          </div>
          <div className="w-2.5 h-2.5 bg-black/40 rounded-full blur-[1px] mt-0.5" />
        </div>
      )}

      {/* Recenter Crosshair Floating Button */}
      <button
        onClick={handleGetCurrentLocation}
        disabled={locatingGps}
        title="Recenter Map to Device GPS Location (Zoom View)"
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
        zoom={14}
        zoomControl={false}
        className="w-full h-full z-0"
        ref={mapRef}
      >
        <TileLayer
          url={CARTO_URL}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={19}
        />

        <MapController
          pickup={pickup}
          destination={destination}
          isPinningMode={isPinningMode}
          onMapClick={handleMapClick}
          onCenterChange={onCenterChange}
        />

        {userGpsCoords && (
          <Circle
            center={[userGpsCoords.lat, userGpsCoords.lng]}
            radius={50}
            pathOptions={{ color: '#35D0B0', fillColor: '#35D0B0', fillOpacity: 0.25, weight: 2 }}
          />
        )}

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

        {!isPinningMode && effectiveDest && (
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

        {!isPinningMode && roadRouteCoords.length > 0 && (
          <Polyline
            positions={roadRouteCoords}
            pathOptions={{ color: '#35D0B0', weight: 6, opacity: 0.95 }}
          />
        )}
      </MapContainer>
    </div>
  );
};
