import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Ride } from '@safar/shared';
import { ArrowLeft, Clock, MapPin, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await apiFetch('/api/rides/rider/history');
        setRides(res.data);
      } catch (err) {
        console.error('Error fetching ride history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-safar-bg p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 py-2">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-2xl bg-safar-card border border-white/10 flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-white">Your SAFAR Ride History</h2>
      </div>

      {loading ? (
        <div className="text-center py-12 text-safar-textMuted font-bold">Loading rides...</div>
      ) : rides.length === 0 ? (
        <div className="bg-safar-card p-8 rounded-3xl text-center space-y-3 border border-white/5">
          <Clock className="w-12 h-12 text-safar-teal mx-auto opacity-80" />
          <h3 className="text-lg font-bold text-white">No Rides Yet</h3>
          <p className="text-xs text-safar-textMuted">Book your first safe & smart ride on SAFAR.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <div key={ride.id} className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">{ride.vehicleType?.name}</span>
                  <span className="text-xs text-safar-textMuted">• {new Date(ride.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-safar-teal">₹{ride.finalFare || ride.estimatedFare}</span>
                  {ride.rideStatus === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-safar-teal" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
                  <span className="text-safar-textMuted">{ride.pickupAddress}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Navigation className="w-4 h-4 text-safar-teal mt-0.5 flex-shrink-0" />
                  <span className="text-safar-textMuted">{ride.destinationAddress}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
