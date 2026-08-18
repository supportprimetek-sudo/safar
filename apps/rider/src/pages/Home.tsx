import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../api';
import { MapComponent } from '../components/Map';
import { VehicleSelector } from '../components/VehicleSelector';
import { SearchingDriver } from '../components/SearchingDriver';
import { ActiveRideSheet } from '../components/ActiveRideSheet';
import { PaymentModal } from '../components/PaymentModal';
import { FareEstimate, Ride, SOCKET_EVENTS } from '@safar/shared';
import { MapPin, Navigation, Search, User, LogOut, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket, connectionState } = useSocket();
  const navigate = useNavigate();

  // Booking Flow Steps: 'SEARCH_LOCATION' | 'SELECT_VEHICLE' | 'SEARCHING_DRIVER' | 'ACTIVE_RIDE' | 'PAYMENT'
  const [step, setStep] = useState<'SEARCH_LOCATION' | 'SELECT_VEHICLE' | 'SEARCHING_DRIVER' | 'ACTIVE_RIDE' | 'PAYMENT'>('SEARCH_LOCATION');

  // Address & Coordinate state
  const [pickupAddress, setPickupAddress] = useState('Connaught Place, New Delhi');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.209 });
  const [destAddress, setDestAddress] = useState('Cyber Hub, Gurugram');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number }>({ lat: 28.495, lng: 77.089 });

  // Fare Estimates
  const [estimates, setEstimates] = useState<FareEstimate[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Active Ride State
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [upiPayload, setUpiPayload] = useState<string>('');

  // 1. Calculate Fare Estimates
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

  // 2. Request Ride
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

      // Join socket room
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_RIDE_ROOM, ride.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  // Socket Realtime Listeners
  useEffect(() => {
    if (!socket) return;

    const onRideAccepted = (payload: { rideId: string; driver: any }) => {
      console.log('⚡ Socket: Ride Accepted', payload);
      setCurrentRide((prev) => (prev ? { ...prev, driver: payload.driver, rideStatus: 'DRIVER_ACCEPTED' } : prev));
      if (payload.driver?.currentLatitude && payload.driver?.currentLongitude) {
        setDriverLocation({ lat: payload.driver.currentLatitude, lng: payload.driver.currentLongitude });
      }
      setStep('ACTIVE_RIDE');
    };

    const onDriverArrived = (payload: any) => {
      console.log('⚡ Socket: Driver Arrived', payload);
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'DRIVER_ARRIVED' } : prev));
    };

    const onRideStarted = (payload: any) => {
      console.log('⚡ Socket: Ride Started', payload);
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'IN_PROGRESS' } : prev));
    };

    const onRideLocation = (payload: { latitude: number; longitude: number }) => {
      setDriverLocation({ lat: payload.latitude, lng: payload.longitude });
    };

    const onRideCompleted = (payload: { finalFare: number }) => {
      console.log('⚡ Socket: Ride Completed', payload);
      setCurrentRide((prev) => (prev ? { ...prev, rideStatus: 'PAYMENT_PENDING', finalFare: payload.finalFare } : prev));
      setStep('PAYMENT');
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

  // Fallback Polling (Every 3s if disconnected or during active ride)
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
          console.log(`🔄 Fallback Poll: Ride Status updated to ${updatedStatus}`);
          setCurrentRide((prev) => (prev ? { ...prev, rideStatus: updatedStatus, driver: res.data.driver } : prev));

          if (['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(updatedStatus)) {
            setStep('ACTIVE_RIDE');
          } else if (updatedStatus === 'PAYMENT_PENDING') {
            setStep('PAYMENT');
            fetchPaymentInfo();
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
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
      {/* Top Header Bar */}
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

        <div className="flex items-center space-x-2">
          {connectionState === 'POLLING_FALLBACK' && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full font-bold">
              Polling Fallback
            </span>
          )}

          <button
            onClick={() => navigate('/history')}
            className="w-10 h-10 rounded-2xl bg-safar-card/90 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-safar-card"
          >
            <History className="w-5 h-5" />
          </button>

          <button
            onClick={logout}
            className="w-10 h-10 rounded-2xl bg-safar-card/90 backdrop-blur-md border border-white/10 flex items-center justify-center text-red-400 hover:bg-safar-card"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Leaflet Map */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapComponent
          pickup={pickupCoords ? { ...pickupCoords, address: pickupAddress } : null}
          destination={destCoords ? { ...destCoords, address: destAddress } : null}
          driverLocation={driverLocation}
        />
      </div>

      {/* Dynamic Bottom Sheet Interface */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {step === 'SEARCH_LOCATION' && (
          <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
            <h3 className="text-lg font-black text-white px-1">Where are you going?</h3>

            <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-white border-2 border-safar-teal" />
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Enter Pickup Address"
                  className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="border-b border-white/5" />

              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-safar-teal" />
                <input
                  type="text"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="Enter Destination"
                  className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateFare}
              disabled={loading}
              className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-all"
            >
              <Search className="w-5 h-5" />
              <span>{loading ? 'Calculating Fares...' : 'Search Rides'}</span>
            </button>
          </div>
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

        {step === 'SEARCHING_DRIVER' && (
          <SearchingDriver onCancel={handleCancelRide} />
        )}

        {step === 'ACTIVE_RIDE' && currentRide && (
          <ActiveRideSheet ride={currentRide} onCancelRide={handleCancelRide} />
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
  );
};
