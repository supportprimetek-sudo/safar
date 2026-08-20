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
import { ChatsView } from '../components/ChatsView';
import { ProfileView } from '../components/ProfileView';
import { History } from './History';
import { FareEstimate, Ride, SOCKET_EVENTS } from '@safar/shared';
import { Search, MapPin, Navigation, Crosshair, Loader2, Check } from 'lucide-react';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { socket, connectionState } = useSocket();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<RiderTab>('home');

  // Booking Flow Steps
  const [step, setStep] = useState<'SEARCH_LOCATION' | 'SELECT_VEHICLE' | 'SEARCHING_DRIVER' | 'ACTIVE_RIDE' | 'PAYMENT'>('SEARCH_LOCATION');

  // Address & Coordinate state
  const [pickupAddress, setPickupAddress] = useState('Connaught Place, New Delhi');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.2090 });
  const [destAddress, setDestAddress] = useState('Cyber Hub, Gurugram');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({ lat: 28.4950, lng: 77.0890 });

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

  // 1. Reverse Geocode helper (Coordinates -> Address)
  const reverseGeocode = async (lat: number, lng: number, field: 'pickup' | 'dest') => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const shortAddress = data.display_name.split(',').slice(0, 3).join(', ');
        if (field === 'pickup') setPickupAddress(shortAddress);
        else setDestAddress(shortAddress);
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
    }
  };

  // 2. Autocomplete search (Text -> Suggestions)
  const handleAddressInputChange = (text: string, field: 'pickup' | 'dest') => {
    if (field === 'pickup') setPickupAddress(text);
    else setDestAddress(text);

    setActiveField(field);

    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearchingAddress(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      } finally {
        setSearchingAddress(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  };

  const handleSelectSuggestion = (sug: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(sug.lat);
    const lng = parseFloat(sug.lon);
    const shortAddress = sug.display_name.split(',').slice(0, 3).join(', ');

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
    if (!pickupAddress || !destAddress) return;
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
      alert(err.message || 'Failed to estimate fare');
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
        }),
      });

      const ride: Ride = res.data;
      setCurrentRide(ride);
      setStep('SEARCHING_DRIVER');

      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_RIDE_ROOM, ride.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to request ride');
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
    };

    const onDriverArrived = () => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'DRIVER_ARRIVED' } : prev));
    };

    const onRideStarted = () => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'IN_PROGRESS' } : prev));
    };

    const onRideLocation = (payload: { latitude: number; longitude: number }) => {
      setDriverLocation({ lat: payload.latitude, lng: payload.longitude });
    };

    const onRideCompleted = (payload: { finalFare: number }) => {
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'PAYMENT_PENDING', finalFare: payload.finalFare } : prev));
      setStep('PAYMENT');
      setActiveTab('home');
      fetchPaymentInfo();
    };

    const onPaymentConfirmed = () => {
      alert('🎉 Payment Confirmed! Thank you for riding with SAFAR.');
      resetBooking();
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
      alert('🎉 Cash Payment Confirmed! Safe travels with SAFAR.');
      resetBooking();
    } catch (err: any) {
      alert(err.message || 'Payment confirmation failed');
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
      alert('Ride cancelled');
      resetBooking();
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
      {/* Top Header Bar (Visible on Home Tab Only) */}
      {activeTab === 'home' && (
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <div className="flex items-center space-x-2 bg-safar-card/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-safar-teal text-safar-bg flex items-center justify-center font-black">
              S
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-wide">SAFAR</div>
              <div className="text-[10px] text-safar-textMuted font-bold">Rider App</div>
            </div>
          </div>

          {connectionState === 'POLLING_FALLBACK' && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full font-bold">
              Polling Fallback
            </span>
          )}
        </div>
      )}

      {/* Main Tab Views */}
      <div className="flex-1 w-full h-full relative z-0">
        {activeTab === 'home' && (
          <div className="w-full h-full relative flex flex-col justify-end">
            <div className="flex-1 w-full h-full relative z-0">
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

            {/* Bottom Booking Sheets */}
            <div className="relative z-10 w-full max-w-lg mx-auto pb-24 px-3 sm:px-4">
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

                    <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-3 relative">
                      {/* Pickup Address Input */}
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-white border-2 border-safar-teal flex-shrink-0" />
                        <input
                          type="text"
                          value={pickupAddress}
                          onFocus={() => setActiveField('pickup')}
                          onChange={(e) => handleAddressInputChange(e.target.value, 'pickup')}
                          placeholder="Enter Pickup Address"
                          className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
                        />
                      </div>

                      <div className="border-b border-white/5" />

                      {/* Destination Address Input */}
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-safar-teal flex-shrink-0" />
                        <input
                          type="text"
                          value={destAddress}
                          onFocus={() => setActiveField('dest')}
                          onChange={(e) => handleAddressInputChange(e.target.value, 'dest')}
                          placeholder="Enter Destination"
                          className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
                        />
                      </div>

                      {/* Autocomplete Dropdown Suggestions */}
                      {activeField && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-safar-card/95 backdrop-blur-xl border border-safar-teal/30 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 max-h-56 overflow-y-auto">
                          {suggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSelectSuggestion(sug)}
                              className="p-3 hover:bg-safar-teal/10 flex items-start space-x-3 cursor-pointer transition-colors"
                            >
                              <MapPin className="w-4 h-4 text-safar-teal mt-0.5 flex-shrink-0" />
                              <div className="text-xs">
                                <div className="font-bold text-white leading-tight">
                                  {sug.display_name.split(',')[0]}
                                </div>
                                <div className="text-[10px] text-safar-textMuted line-clamp-1 mt-0.5">
                                  {sug.display_name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

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
                  loading={loading}
                />
              )}

              {step === 'SEARCHING_DRIVER' && <SearchingDriver onCancel={handleCancelRide} />}

              {step === 'ACTIVE_RIDE' && currentRide && <ActiveRideSheet ride={currentRide} onCancelRide={handleCancelRide} />}

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
        {activeTab === 'chats' && <ChatsView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
    </div>
  );
};
