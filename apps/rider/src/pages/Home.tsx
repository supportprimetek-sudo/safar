import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../api';
import { MapComponent } from '../components/Map';
import { VehicleSelector } from '../components/VehicleSelector';
import { SearchingDriver } from '../components/SearchingDriver';
import { ActiveRideSheet } from '../components/ActiveRideSheet';
import { PaymentModal } from '../components/PaymentModal';
import { BottomNav, RiderTab } from '../components/BottomNav';
import { PlacesView } from '../components/PlacesView';
import { ProfileView } from '../components/ProfileView';
import { History } from './History';
import { FareEstimate, Ride, SOCKET_EVENTS } from '@safar/shared';
import { Search, MapPin, Navigation, Crosshair, Loader2, Check, ArrowLeft, X } from 'lucide-react';
import { initNativeNotifications, triggerNativeNotification } from '../utils/notifications';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { socket, connectionState } = useSocket();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<RiderTab>('home');

  // Booking Flow Steps
  const [step, setStep] = useState<'SEARCH_LOCATION' | 'SELECT_VEHICLE' | 'SEARCHING_DRIVER' | 'ACTIVE_RIDE' | 'PAYMENT'>('SEARCH_LOCATION');

  // Address & Coordinate state (Drop location starts completely blank)
  const [pickupAddress, setPickupAddress] = useState('Locating current address...');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.2090 });
  const [destAddress, setDestAddress] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Autocomplete Suggestions State
  const [activeField, setActiveField] = useState<'pickup' | 'dest' | null>(null);
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);

  // Fare Estimates & Ride
  const [estimates, setEstimates] = useState<FareEstimate[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [upiPayload, setUpiPayload] = useState<string>('');

  // Rider Safety & Convenience State
  const [intermediateStops, setIntermediateStops] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isWomenOnly, setIsWomenOnly] = useState(false);

  const POPULAR_QUICK_DESTINATIONS = [
    { name: 'Cyber Hub, Gurugram', lat: 28.4950, lon: 77.0890, address: 'Cyber Hub, DLF Phase 2, Gurugram' },
    { name: 'Connaught Place, New Delhi', lat: 28.6139, lon: 77.2090, address: 'Connaught Place, Rajiv Chowk, New Delhi' },
    { name: 'India Gate, New Delhi', lat: 28.6129, lon: 77.2295, address: 'India Gate, Rajpath, New Delhi' },
    { name: 'IGI Airport T3, Delhi', lat: 28.5562, lon: 77.1000, address: 'Indira Gandhi International Airport, Terminal 3, New Delhi' },
    { name: 'Sector 62, Noida', lat: 28.6280, lon: 77.3649, address: 'Sector 62, Electronic City, Noida' },
    { name: 'MG Road Metro Station', lat: 28.4797, lon: 77.0802, address: 'MG Road Metro Station, Gurugram' },
  ];

  // 1. Reverse Geocode helper (Coordinates -> Address)
  const reverseGeocode = async (lat: number, lng: number, field: 'pickup' | 'dest') => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        const shortAddress = parts.length > 2 ? `${parts[0]}, ${parts[1]}, ${parts[2]}` : data.display_name;
        if (field === 'pickup') {
          setPickupAddress(shortAddress);
        } else {
          setDestAddress(shortAddress);
        }
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }
  };

  // Auto-recenter current location on device GPS when app opens
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPickupCoords({ lat, lng });
          reverseGeocode(lat, lng, 'pickup');
        },
        (err) => {
          console.warn('Startup device GPS auto-location notice:', err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }, []);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Autocomplete search (Text -> Suggestions with Dual API Fallback)
  const handleAddressInputChange = (text: string, field: 'pickup' | 'dest') => {
    if (field === 'pickup') setPickupAddress(text);
    else setDestAddress(text);

    setActiveField(field);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setSearchingAddress(false);
      return;
    }

    setSearchingAddress(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        // Primary: Nominatim OpenStreetMap Search
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data);
          setSearchingAddress(false);
          return;
        }

        // Secondary Fallback: Photon Komoot OpenStreetMap Engine
        const pRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=6`);
        const pData = await pRes.json();
        if (pData?.features && Array.isArray(pData.features)) {
          const photonItems = pData.features.map((feat: any) => {
            const props = feat.properties || {};
            const parts = [props.name, props.street, props.city, props.state, props.country].filter(Boolean);
            return {
              display_name: parts.join(', '),
              lat: feat.geometry.coordinates[1].toString(),
              lon: feat.geometry.coordinates[0].toString(),
            };
          });
          setSuggestions(photonItems);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
        setSuggestions([]);
      } finally {
        setSearchingAddress(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = (sug: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    const parts = sug.display_name.split(', ');
    const shortAddress = parts.length > 2 ? `${parts[0]}, ${parts[1]}, ${parts[2]}` : sug.display_name;

    if (activeField === 'pickup') {
      setPickupAddress(shortAddress);
      setPickupCoords({ lat, lng });
    } else {
      setDestAddress(shortAddress);
      setDestCoords({ lat, lng });
    }

    setSuggestions([]);
    setActiveField(null);
  };

  // 3. Drag Handlers for Map Markers
  const handlePickupMarkerDrag = (coords: { lat: number; lng: number }) => {
    setPickupCoords(coords);
    reverseGeocode(coords.lat, coords.lng, 'pickup');
  };

  const [notification, setNotification] = useState<{ title: string; message: string; icon?: string; onOk?: () => void } | null>(null);

  const [isPinningMode, setIsPinningMode] = useState(false);

  const handleDestMarkerDrag = (coords: { lat: number; lng: number }) => {
    setDestCoords(coords);
    reverseGeocode(coords.lat, coords.lng, 'dest');
  };

  const handleCenterChange = (coords: { lat: number; lng: number }) => {
    setDestCoords(coords);
    reverseGeocode(coords.lat, coords.lng, 'dest');
  };

  // 4. GPS Recenter Handler
  const handleRecenterGps = (coords: { lat: number; lng: number }) => {
    setPickupCoords(coords);
    reverseGeocode(coords.lat, coords.lng, 'pickup');
  };

  // 5. Calculate Fare Estimates
  const handleCalculateFare = async () => {
    if (!destAddress || !destAddress.trim() || !destCoords) {
      setActiveField('dest');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/rides/estimate-fare', {
        method: 'POST',
        body: JSON.stringify({
          pickupLatitude: pickupCoords.lat,
          pickupLongitude: pickupCoords.lng,
          destinationLatitude: destCoords.lat,
          destinationLongitude: destCoords.lng,
        }),
      });
      setEstimates(res.data.estimates);
      if (res.data.estimates.length > 0) {
        setSelectedVehicleId(res.data.estimates[0].vehicleType.id);
      }
      setStep('SELECT_VEHICLE');
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Failed to estimate fare' });
    } finally {
      setLoading(false);
    }
  };

  // 6. Request Ride
  const handleConfirmBooking = async () => {
    if (!selectedVehicleId) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/rides', {
        method: 'POST',
        body: JSON.stringify({
          vehicleTypeId: selectedVehicleId,
          pickupAddress,
          pickupLatitude: pickupCoords.lat,
          pickupLongitude: pickupCoords.lng,
          destinationAddress: destAddress,
          destinationLatitude: destCoords.lat,
          destinationLongitude: destCoords.lng,
          scheduledFor: isScheduled ? scheduledDateTime : null,
          intermediateStops: intermediateStops.filter((s) => s.trim()),
          isWomenOnlyRequested: isWomenOnly,
        }),
      });

      const ride: Ride = res.data;
      setCurrentRide(ride);
      if (isScheduled) {
        setNotification({
          title: '📅 Ride Scheduled!',
          message: `Your ride to ${destAddress} is scheduled for ${scheduledDateTime || 'later'}. We will notify drivers 15 mins prior!`,
          icon: '📅',
          onOk: () => setStep('SEARCH_LOCATION'),
        });
      } else {
        setStep('SEARCHING_DRIVER');
        if (socket) {
          socket.emit(SOCKET_EVENTS.JOIN_RIDE_ROOM, ride.id);
        }
      }
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Failed to request ride' });
    } finally {
      setLoading(false);
    }
  };

  // Select place from Places tab
  const handleSelectPlaceFromTab = (address: string, coords: { lat: number; lng: number }) => {
    setDestAddress(address);
    setDestCoords(coords);
    setActiveTab('home');
    setStep('SEARCH_LOCATION');
  };

  // Initialize native notifications on mount
  useEffect(() => {
    initNativeNotifications();
  }, []);

  // Socket Realtime Listeners
  useEffect(() => {
    if (!socket) return;

    const onRideAccepted = (payload: { rideId: string; driver: any }) => {
      setCurrentRide((prev) => (prev ? { ...prev, driver: payload.driver, rideStatus: 'DRIVER_ACCEPTED' } : prev));
      if (payload.driver?.currentLatitude && payload.driver?.currentLongitude) {
        setDriverLocation({ lat: payload.driver.currentLatitude, lng: payload.driver.currentLongitude });
      }
      setStep('ACTIVE_RIDE');
      setActiveTab('home');
      triggerNativeNotification('🚕 Driver Assigned!', `${payload.driver?.user?.fullName || 'Your driver'} accepted your ride request.`);
    };

    const onDriverArrived = () => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'DRIVER_ARRIVED' } : prev));
      triggerNativeNotification('📍 Driver Has Arrived!', 'Your driver has arrived at your pickup location.');
    };

    const onRideStarted = () => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'IN_PROGRESS' } : prev));
      triggerNativeNotification('🚗 Trip Started', 'Your SAFAR ride is now in progress.');
    };

    const onRideLocation = (payload: { latitude: number; longitude: number }) => {
      setDriverLocation({ lat: payload.latitude, lng: payload.longitude });
    };

    const onRideCompleted = (payload: { finalFare: number }) => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'PAYMENT_PENDING', finalFare: payload.finalFare } : prev));
      setStep('PAYMENT');
      setActiveTab('home');
      fetchPaymentInfo();
      triggerNativeNotification('🏁 Trip Completed!', `Your SAFAR trip has ended safely. Fare: ₹${payload.finalFare}`);
    };

    const onPaymentConfirmed = () => {
      setNotification({
        title: 'Payment Confirmed',
        message: '🎉 Payment Confirmed! Thank you for riding with SAFAR.',
        icon: '🎉',
        onOk: resetBooking,
      });
    };

    socket.on(SOCKET_EVENTS.RIDE_ACCEPTED, onRideAccepted);
    socket.on(SOCKET_EVENTS.DRIVER_ARRIVED, onDriverArrived);
    socket.on(SOCKET_EVENTS.RIDE_STARTED, onRideStarted);
    socket.on(SOCKET_EVENTS.RIDE_LOCATION_UPDATE, onRideLocation);
    socket.on(SOCKET_EVENTS.RIDE_COMPLETED, onRideCompleted);
    socket.on(SOCKET_EVENTS.PAYMENT_CONFIRMED, onPaymentConfirmed);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_ACCEPTED, onRideAccepted);
      socket.off(SOCKET_EVENTS.DRIVER_ARRIVED, onDriverArrived);
      socket.off(SOCKET_EVENTS.RIDE_STARTED, onRideStarted);
      socket.off(SOCKET_EVENTS.RIDE_LOCATION_UPDATE, onRideLocation);
      socket.off(SOCKET_EVENTS.RIDE_COMPLETED, onRideCompleted);
      socket.off(SOCKET_EVENTS.PAYMENT_CONFIRMED, onPaymentConfirmed);
    };
  }, [socket]);

  // Fallback Polling
  useEffect(() => {
    if (!currentRide?.id || ['COMPLETED', 'CANCELLED'].includes(currentRide.rideStatus)) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/rides/${currentRide.id}/status`);
        const updatedStatus = res.data.rideStatus;

        if (res.data.driver?.currentLatitude) {
          setDriverLocation({ lat: res.data.driver.currentLatitude, lng: res.data.driver.currentLongitude });
        }

        if (updatedStatus !== currentRide.rideStatus) {
          setCurrentRide((prev) => (prev ? { ...prev, rideStatus: updatedStatus, driver: res.data.driver } : prev));

          if (['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(updatedStatus)) {
            setStep('ACTIVE_RIDE');
          } else if (updatedStatus === 'PAYMENT_PENDING') {
            setStep('PAYMENT');
            fetchPaymentInfo();
          }
        }
      } catch (err) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [currentRide?.id, currentRide?.rideStatus]);

  const fetchPaymentInfo = async () => {
    if (!currentRide?.id) return;
    try {
      const res = await apiFetch(`/api/rides/${currentRide.id}/payment`);
      setUpiPayload(res.data.upiPayload);
    } catch (e) {}
  };

  const handleConfirmCashPayment = async () => {
    if (!currentRide?.id) return;
    setLoading(true);
    try {
      await apiFetch(`/api/rides/${currentRide.id}/payment/confirm`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'CASH' }),
      });
      setNotification({
        title: 'Payment Confirmed',
        message: '🎉 Cash Payment Confirmed! Safe travels with SAFAR.',
        icon: '🎉',
        onOk: resetBooking,
      });
    } catch (err: any) {
      setNotification({ title: 'Notice', message: err.message || 'Payment confirmation failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!currentRide?.id) return;
    try {
      await apiFetch(`/api/rides/${currentRide.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by rider' }),
      });
      setNotification({
        title: 'Ride Cancelled',
        message: 'Your ride request has been cancelled.',
        onOk: resetBooking,
      });
    } catch (e) {}
  };

  const resetBooking = () => {
    setStep('SEARCH_LOCATION');
    setCurrentRide(null);
    setSelectedVehicleId(null);
    setDriverLocation(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-safar-bg flex flex-col">
      {/* Polling Fallback Notification (Only when active) */}
      {activeTab === 'home' && connectionState === 'POLLING_FALLBACK' && (
        <div className="fixed top-12 right-4 z-30 pointer-events-auto">
          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full font-bold shadow-lg">
            Polling Fallback
          </span>
        </div>
      )}

      {/* Main Tab Views */}
      <div className="flex-1 w-full h-full relative z-0 overflow-hidden">
        {activeTab === 'home' && (
          <div className="w-full h-full relative">
            {/* Fullscreen Fixed Map Layer */}
            <div className="fixed inset-0 z-0 w-full h-full">
              <MapComponent
                pickup={pickupCoords ? { ...pickupCoords, address: pickupAddress } : null}
                destination={destCoords ? { ...destCoords, address: destAddress } : null}
                driverLocation={driverLocation}
                isPinningMode={isPinningMode}
                onPickupDragEnd={handlePickupMarkerDrag}
                onDestDragEnd={handleDestMarkerDrag}
                onRecenterGps={handleRecenterGps}
                onCenterChange={handleCenterChange}
              />
            </div>

            {/* Rapido Floating Bottom Booking Sheets */}
            <div className="fixed bottom-0 left-0 right-0 z-20 w-full max-w-lg mx-auto pb-[max(5.5rem,env(safe-area-inset-bottom,28px))] px-3 sm:px-4 rapido-scroll-container max-h-[80vh]">
              {step === 'SEARCH_LOCATION' && (
                isPinningMode ? (
                  <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
                    <div className="flex items-center space-x-3 bg-safar-card p-3.5 rounded-2xl border border-safar-teal/30">
                      <div className="w-9 h-9 rounded-xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-bold flex-shrink-0">
                        <MapPin className="w-5 h-5 text-safar-teal animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider font-extrabold text-safar-teal">Pin Drop Address</div>
                        <div className="text-sm font-bold text-white truncate">{destAddress || 'Move map to set location'}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsPinningMode(false);
                        handleCalculateFare();
                      }}
                      className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
                    >
                      <Check className="w-5 h-5" />
                      <span>Confirm Drop Location</span>
                    </button>
                  </div>
                ) : (
                  <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-lg font-black text-white">Where are you going?</h3>
                      <button
                        type="button"
                        onClick={() => setIsPinningMode(true)}
                        className="px-3 py-1.5 bg-safar-teal/15 hover:bg-safar-teal/25 border border-safar-teal/30 rounded-xl flex items-center space-x-1.5 text-xs font-bold text-safar-teal transition-all active:scale-95"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Pin on Map</span>
                      </button>
                    </div>

                    <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-3">
                      {/* Pickup Address Input */}
                      <div 
                        onClick={() => setActiveField('pickup')}
                        className="flex items-center space-x-3 cursor-pointer p-1"
                      >
                        <div className="w-3 h-3 rounded-full bg-white border-2 border-safar-teal flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-safar-textMuted font-bold uppercase tracking-wider">Pickup Location</div>
                          <div className="text-sm font-bold text-white truncate">{pickupAddress || 'Enter Pickup Address'}</div>
                        </div>
                      </div>

                      {/* Intermediate Stops */}
                      {intermediateStops.map((stopAddr, idx) => (
                        <React.Fragment key={idx}>
                          <div className="border-b border-white/5" />
                          <div className="flex items-center justify-between p-1">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wider">Stop {idx + 1}</div>
                                <input
                                  type="text"
                                  placeholder="Enter intermediate stop address..."
                                  value={stopAddr}
                                  onChange={(e) => {
                                    const next = [...intermediateStops];
                                    next[idx] = e.target.value;
                                    setIntermediateStops(next);
                                  }}
                                  className="w-full bg-transparent text-sm font-bold text-white focus:outline-none placeholder-white/40"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIntermediateStops(intermediateStops.filter((_, i) => i !== idx))}
                              className="text-safar-textMuted hover:text-red-400 text-xs font-bold px-2"
                            >
                              ✕
                            </button>
                          </div>
                        </React.Fragment>
                      ))}

                      <div className="border-b border-white/5" />

                      {/* Destination Address Input */}
                      <div 
                        onClick={() => setActiveField('dest')}
                        className="flex items-center space-x-3 cursor-pointer p-1"
                      >
                        <div className="w-3 h-3 rounded-full bg-safar-teal flex-shrink-0 animate-pulse" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-safar-teal font-extrabold uppercase tracking-wider">Drop Destination</div>
                          <div className="text-sm font-bold text-white truncate">{destAddress || 'Search Drop Location...'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Intermediate Stop & Ride Timing Control Bar */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {intermediateStops.length < 2 && (
                        <button
                          type="button"
                          onClick={() => setIntermediateStops([...intermediateStops, ''])}
                          className="px-3 py-1.5 bg-safar-card hover:bg-safar-surface border border-white/10 rounded-xl text-xs font-bold text-safar-teal flex items-center space-x-1 transition-all active:scale-95"
                        >
                          <span>+ Add Stop</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsScheduled(!isScheduled)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 ${
                          isScheduled
                            ? 'bg-safar-teal/20 text-safar-teal border-safar-teal/40'
                            : 'bg-safar-card text-safar-textMuted border-white/10 hover:text-white'
                        }`}
                      >
                        <span>📅</span>
                        <span>{isScheduled ? 'Scheduled' : 'Book for Later'}</span>
                      </button>
                    </div>

                    {/* Schedule Date-Time Selector */}
                    {isScheduled && (
                      <div className="bg-safar-card p-3 rounded-2xl border border-safar-teal/30 space-y-1.5 animate-fade-in">
                        <label className="text-[11px] font-extrabold uppercase text-safar-teal block">
                          Schedule Pickup Time (Up to 7 Days)
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                          className="w-full py-2.5 px-3 bg-safar-surface border border-white/15 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-safar-teal"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleCalculateFare}
                      disabled={loading}
                      className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-98"
                    >
                      <Search className="w-5 h-5" />
                      <span>{loading ? 'Calculating Fares...' : 'Search Rides'}</span>
                    </button>
                  </div>
                )
              )}

              {step === 'SELECT_VEHICLE' && (
                <VehicleSelector
                  estimates={estimates}
                  selectedVehicleId={selectedVehicleId}
                  onSelect={(id) => setSelectedVehicleId(id)}
                  onConfirm={handleConfirmBooking}
                  onBack={() => setStep('SEARCH_LOCATION')}
                  loading={loading}
                />
              )}

              {step === 'SEARCHING_DRIVER' && <SearchingDriver onCancel={handleCancelRide} />}

              {step === 'ACTIVE_RIDE' && currentRide && (
                <ActiveRideSheet
                  ride={currentRide}
                  onCancelRide={handleCancelRide}
                />
              )}

              {step === 'PAYMENT' && currentRide && (
                <PaymentModal
                  amount={currentRide.finalFare || currentRide.estimatedFare}
                  upiPayload={upiPayload}
                  onConfirmCashPayment={handleConfirmCashPayment}
                  loading={loading}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'places' && <PlacesView onSelectPlace={handleSelectPlaceFromTab} />}
        {activeTab === 'history' && <History />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Full Screen Location Search Overlay View (Rapido / Uber Style) */}
      {activeField && (
        <div className="fixed inset-0 z-50 bg-[#11151D] flex flex-col pt-[max(2.5rem,env(safe-area-inset-top,36px))] pb-[max(1.5rem,env(safe-area-inset-bottom,24px))] px-4 animate-fade-in rapido-scroll-container">
          {/* Top Header Bar */}
          <div className="flex items-center space-x-3 pb-3 border-b border-white/10">
            <button
              onClick={() => {
                setActiveField(null);
                setSuggestions([]);
              }}
              className="w-10 h-10 rounded-2xl bg-safar-card border border-white/10 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h2 className="text-lg font-extrabold text-white">Select Location</h2>
              <p className="text-xs text-safar-textMuted font-bold">
                {activeField === 'dest' ? 'Enter drop destination' : 'Enter pickup location'}
              </p>
            </div>
          </div>

          {/* Dual Address Inputs Container */}
          <div className="mt-4 bg-safar-card p-4 rounded-3xl border border-white/10 shadow-xl space-y-3">
            {/* Pickup Address Input */}
            <div className="flex items-center space-x-3 bg-safar-surface p-3 rounded-2xl border border-white/5">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white flex-shrink-0" />
              <input
                type="text"
                value={pickupAddress}
                onFocus={() => setActiveField('pickup')}
                onChange={(e) => handleAddressInputChange(e.target.value, 'pickup')}
                placeholder="Search Pickup Location"
                autoFocus={activeField === 'pickup'}
                className="w-full bg-transparent text-sm font-bold text-white placeholder-safar-textMuted focus:outline-none"
              />
              {pickupAddress && (
                <button onClick={() => setPickupAddress('')} className="text-safar-textMuted hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Drop Destination Input */}
            <div className="flex items-center space-x-3 bg-safar-surface p-3 rounded-2xl border border-white/5">
              <div className="w-3.5 h-3.5 rounded-full bg-safar-teal border-2 border-white flex-shrink-0 animate-pulse" />
              <input
                type="text"
                value={destAddress}
                onFocus={() => setActiveField('dest')}
                onChange={(e) => handleAddressInputChange(e.target.value, 'dest')}
                placeholder="Where are you going?"
                autoFocus={activeField === 'dest'}
                className="w-full bg-transparent text-sm font-bold text-white placeholder-safar-textMuted focus:outline-none"
              />
              {destAddress && (
                <button onClick={() => setDestAddress('')} className="text-safar-textMuted hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Pin on Map Action Button */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setActiveField(null);
                setIsPinningMode(true);
              }}
              className="px-4 py-2 bg-safar-teal/15 border border-safar-teal/30 rounded-2xl flex items-center space-x-2 text-xs font-extrabold text-safar-teal active:scale-95 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Pin location on map</span>
            </button>
          </div>

          {/* Full Screen Suggestions List */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {searchingAddress && (
              <div className="p-4 bg-safar-card rounded-2xl border border-safar-teal/30 text-xs text-safar-teal font-extrabold flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-safar-teal" />
                <span>Searching places...</span>
              </div>
            )}

            {suggestions.length > 0 ? (
              suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="p-3.5 bg-safar-card hover:bg-safar-surface border border-white/5 rounded-2xl flex items-start space-x-3.5 cursor-pointer active:scale-98 transition-all shadow-md"
                >
                  <div className="w-9 h-9 rounded-xl bg-safar-teal/20 text-safar-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-white text-sm leading-tight truncate">
                      {sug.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-safar-textMuted line-clamp-2 mt-0.5">
                      {sug.display_name}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              !searchingAddress && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-black uppercase text-safar-textMuted px-1 tracking-wider">
                    Popular Hotspot Destinations
                  </div>
                  <div className="space-y-2">
                    {POPULAR_QUICK_DESTINATIONS.map((pop, idx) => (
                      <div
                        key={`pop-full-${idx}`}
                        onClick={() => {
                          const sug = { display_name: pop.address, lat: pop.lat.toString(), lon: pop.lon.toString() };
                          handleSelectSuggestion(sug);
                        }}
                        className="p-3.5 bg-safar-card hover:bg-safar-surface border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-md"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-9 h-9 rounded-xl bg-safar-teal/15 text-safar-teal flex items-center justify-center flex-shrink-0">
                            <Navigation className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm">{pop.name}</div>
                            <div className="text-xs text-safar-textMuted line-clamp-1">{pop.address}</div>
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 text-safar-textMuted rotate-180" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Dark Styled Custom Notification Modal */}
      {notification && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E2530] border border-safar-teal/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center mx-auto text-3xl font-black border border-safar-teal/30 shadow-lg">
              {notification.icon || '✓'}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{notification.title}</h3>
              <p className="text-sm text-safar-textMuted font-bold mt-1 leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => {
                const action = notification.onOk;
                setNotification(null);
                if (action) action();
              }}
              className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-base rounded-2xl shadow-xl transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
