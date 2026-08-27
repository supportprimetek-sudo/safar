import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Route, CheckCircle2, XCircle } from 'lucide-react';

export const RideManagement: React.FC = () => {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRides() {
      try {
        const res = await apiFetch('/api/admin/rides');
        setRides(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRides();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 pt-2">
      <div className="sticky top-0 z-20 pt-3 md:pt-[max(2rem,env(safe-area-inset-top,28px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white">Ride Monitor & Audit Trail</h1>
        <p className="text-xs sm:text-sm text-safar-textMuted mt-0.5">Real-time overview of all booked, active, completed, and cancelled rides.</p>
      </div>

      <div className="bg-safar-card rounded-3xl border border-white/5 shadow-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-safar-surface text-safar-textMuted uppercase font-extrabold border-b border-white/5">
            <tr>
              <th className="p-4">Ride ID</th>
              <th className="p-4">Rider</th>
              <th className="p-4">Driver</th>
              <th className="p-4">Vehicle</th>
              <th className="p-4">Pickup & Drop</th>
              <th className="p-4">Fare</th>
              <th className="p-4">Payment Mode</th>
              <th className="p-4">Status</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rides.map((r) => {
              const isPaid = r.payment?.paymentStatus === 'PAID';

              return (
                <tr key={r.id} className="hover:bg-safar-surface/50 transition-colors">
                  <td className="p-4 font-mono text-safar-teal text-xs">#{r.id.slice(0, 8)}</td>
                  <td className="p-4 font-bold text-white">{r.rider?.fullName || 'Rider'}</td>
                  <td className="p-4 text-safar-textMuted">{r.driver?.user?.fullName || 'Searching...'}</td>
                  <td className="p-4 font-bold text-safar-teal">{r.vehicleType?.name}</td>
                  <td className="p-4 space-y-1">
                    <div className="text-white font-semibold truncate max-w-xs">P: {r.pickupAddress}</div>
                    <div className="text-safar-textMuted truncate max-w-xs">D: {r.destinationAddress}</div>
                  </td>
                  <td className="p-4 font-black text-white text-sm">₹{r.finalFare || r.estimatedFare}</td>
                  <td className="p-4">
                    {isPaid ? (
                      <span className="px-2.5 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full font-black text-[10px] inline-flex items-center space-x-1">
                        📲 Online QR Paid
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full font-bold text-[10px]">
                        ⏳ Unconfirmed (Unpaid)
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        r.rideStatus === 'COMPLETED'
                          ? 'bg-safar-teal/20 text-safar-teal'
                          : r.rideStatus === 'CANCELLED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {r.rideStatus}
                    </span>
                  </td>
                  <td className="p-4 text-safar-textMuted">{new Date(r.createdAt).toLocaleTimeString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
