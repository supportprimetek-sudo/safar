import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { UserCheck } from 'lucide-react';

export const RiderManagement: React.FC = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRiders() {
      try {
        const res = await apiFetch('/api/admin/riders');
        setRiders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRiders();
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 pt-2">
      <div className="sticky top-0 z-20 pt-3 md:pt-[max(2rem,env(safe-area-inset-top,28px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white">Rider User Management</h1>
        <p className="text-xs sm:text-sm text-safar-textMuted mt-0.5">Manage registered passenger accounts & trip history.</p>
      </div>

      <div className="bg-safar-card rounded-3xl border border-white/5 shadow-2xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-safar-surface text-safar-textMuted uppercase font-extrabold border-b border-white/5">
            <tr>
              <th className="p-4">Rider Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Total Trips</th>
              <th className="p-4">Joined Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {riders.map((r) => (
              <tr key={r.id} className="hover:bg-safar-surface/50 transition-colors">
                <td className="p-4 font-bold text-white text-sm">{r.fullName}</td>
                <td className="p-4 text-safar-textMuted">{r.email}</td>
                <td className="p-4 text-safar-textMuted">{r.phone}</td>
                <td className="p-4 font-bold text-safar-teal">{r.ridesAsRider?.length || 0} rides</td>
                <td className="p-4 text-safar-textMuted">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
