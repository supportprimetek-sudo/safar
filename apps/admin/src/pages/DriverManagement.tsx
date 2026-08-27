import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Users, Shield, Star, CheckCircle, Ban, AlertTriangle } from 'lucide-react';

export const DriverManagement: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const res = await apiFetch('/api/admin/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleStatusChange = async (driverId: string, status: string) => {
    try {
      await apiFetch(`/api/admin/drivers/${driverId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ driverStatus: status }),
      });
      alert(`Driver account updated to ${status}`);
      fetchDrivers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 pt-2">
      <div className="sticky top-0 z-20 pt-3 md:pt-[max(2rem,env(safe-area-inset-top,28px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white">Driver Partner Management</h1>
        <p className="text-xs sm:text-sm text-safar-textMuted mt-0.5">Manage driver accounts, status, ratings, and vehicle category assignments.</p>
      </div>

      <div className="bg-safar-card rounded-3xl border border-white/5 shadow-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-safar-surface text-safar-textMuted uppercase font-extrabold border-b border-white/5">
            <tr>
              <th className="p-4">Driver</th>
              <th className="p-4">Payout UPI ID</th>
              <th className="p-4">Vehicle Category</th>
              <th className="p-4">KYC Status</th>
              <th className="p-4">Account Status</th>
              <th className="p-4">Online Status</th>
              <th className="p-4">Rides & Rating</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {drivers.map((d) => (
              <tr key={d.id} className="hover:bg-safar-surface/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-white text-sm">{d.user?.fullName}</div>
                  <div className="text-safar-textMuted">{d.user?.email}</div>
                  <div className="text-safar-textMuted">{d.phone}</div>
                </td>
                <td className="p-4">
                  {d.upiId ? (
                    <span className="px-2.5 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full font-black text-xs font-mono inline-flex items-center space-x-1">
                      💳 {d.upiId}
                    </span>
                  ) : (
                    <span className="text-safar-textMuted italic text-xs">Pending Onboarding</span>
                  )}
                </td>
                <td className="p-4 font-bold text-safar-teal">{d.vehicleType?.name || 'Unassigned'}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${d.kycStatus === 'APPROVED' ? 'bg-safar-teal/20 text-safar-teal' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {d.kycStatus}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${d.driverStatus === 'APPROVED' ? 'bg-safar-teal/20 text-safar-teal' : d.driverStatus === 'BLOCKED' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {d.driverStatus}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${d.onlineStatus === 'ONLINE' ? 'bg-green-500/20 text-green-400' : 'bg-safar-surface text-safar-textMuted'}`}>
                    {d.onlineStatus}
                  </span>
                </td>
                <td className="p-4">
                  <div className="font-bold text-white">{d.totalRides} trips</div>
                  <div className="text-yellow-400 font-bold">★ {d.rating?.toFixed(1) || '4.9'}</div>
                </td>
                <td className="p-4 text-right space-x-2">
                  {d.driverStatus !== 'APPROVED' && (
                    <button onClick={() => handleStatusChange(d.id, 'APPROVED')} className="px-3 py-1.5 bg-safar-teal text-safar-bg font-extrabold rounded-xl">
                      Approve
                    </button>
                  )}
                  {d.driverStatus !== 'BLOCKED' && (
                    <button onClick={() => handleStatusChange(d.id, 'BLOCKED')} className="px-3 py-1.5 bg-red-500/20 text-red-400 font-extrabold rounded-xl border border-red-500/30">
                      Block
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
