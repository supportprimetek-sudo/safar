import React from 'react';
import { Ride } from '@safar/shared';
import { Phone, Star, Shield, MapPin, Navigation, MessageSquare } from 'lucide-react';

interface ActiveRideSheetProps {
  ride: Ride;
  onCancelRide?: () => void;
  onOpenChat?: () => void;
}

export const ActiveRideSheet: React.FC<ActiveRideSheetProps> = ({ ride, onCancelRide, onOpenChat }) => {
  const driverUser = ride.driver?.user;
  const vehicle = ride.vehicleType;

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
    <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black text-white">Active SAFAR Trip</h3>
          <p className="text-xs text-safar-textMuted">{vehicle?.name} • ₹{ride.estimatedFare}</p>
        </div>
        {getStatusBadge()}
      </div>

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

          <div className="flex items-center space-x-2">
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="w-11 h-11 rounded-full bg-safar-teal/20 text-safar-teal border border-safar-teal/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                title="Chat with Driver"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            <a
              href={`tel:${driverUser?.phone}`}
              className="w-11 h-11 rounded-full bg-safar-teal text-safar-bg flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
              title="Call Driver"
            >
              <Phone className="w-5 h-5 fill-current" />
            </a>
          </div>
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

      {/* Safety Actions */}
      <div className="flex space-x-3 pt-1">
        <button className="flex-1 py-3 bg-safar-surface hover:bg-safar-card border border-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2">
          <Shield className="w-4 h-4 text-safar-teal" />
          <span>Safety Helpline</span>
        </button>

        {['DRIVER_ACCEPTED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED'].includes(ride.rideStatus) && onCancelRide && (
          <button
            onClick={onCancelRide}
            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs"
          >
            Cancel Trip
          </button>
        )}
      </div>
    </div>
  );
};
