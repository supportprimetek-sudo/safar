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
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Rider User Management</h1>
        <p className="text-sm text-safar-textMuted mt-1">Manage registered passenger accounts & trip history.</p>
      </div>

      <div className="bg-safar-card rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
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
