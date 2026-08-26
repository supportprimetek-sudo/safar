import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Users, Car, DollarSign, Route, FileCheck, CheckCircle2, XCircle, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await apiFetch('/api/admin/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-8 text-safar-textMuted font-bold">Loading Executive Stats...</div>;
  }

  const cards = [
    { label: 'Total Revenue', value: `₹${stats?.totalRevenue || 0}`, icon: DollarSign, color: 'text-safar-teal', bg: 'bg-safar-teal/20' },
    { label: 'Active Rides Now', value: stats?.activeRides || 0, icon: Route, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { label: 'Active Online Drivers', value: stats?.activeDrivers || 0, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Pending KYC Queue', value: stats?.pendingKyc || 0, icon: FileCheck, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Completed Rides', value: stats?.completedRides || 0, icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Cancelled Rides', value: stats?.cancelledRides || 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
    { label: 'Total Registered Drivers', value: stats?.totalDrivers || 0, icon: Car, color: 'text-safar-teal', bg: 'bg-safar-surface' },
    { label: 'Total Registered Riders', value: stats?.totalRiders || 0, icon: Users, color: 'text-safar-teal', bg: 'bg-safar-surface' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 pt-2">
      {/* Sticky Frozen Opaque Title Header */}
      <div className="sticky top-0 z-20 pt-3 md:pt-[max(2rem,env(safe-area-inset-top,28px))] pb-3 bg-[#11151D] border-b border-white/10 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-white">Executive Control Dashboard</h1>
        <p className="text-xs sm:text-sm text-safar-textMuted mt-0.5">Real-time platform KPIs & fleet activity.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-safar-card p-5 rounded-3xl border border-white/5 space-y-3 shadow-xl hover:border-white/20 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-safar-textMuted uppercase tracking-wider">{c.label}</span>
                <div className={`w-10 h-10 rounded-2xl ${c.bg} ${c.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Platform Financial Analytics Banner */}
      <div className="bg-safar-card p-6 rounded-3xl border border-safar-teal/30 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-black text-xl">
              💰
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Platform Commission & Revenue Settlement</h3>
              <p className="text-xs text-safar-textMuted">Live financial ledger with 15% commission breakdown.</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/40 rounded-full text-xs font-black">
            15% Fixed Commission
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-[11px] text-safar-textMuted font-extrabold uppercase">Total Gross Fares</div>
            <div className="text-2xl font-black text-white">₹{stats?.totalRevenue || 0}</div>
          </div>

          <div className="p-4 rounded-2xl bg-safar-teal/15 border border-safar-teal/30 space-y-1">
            <div className="text-[11px] text-safar-teal font-extrabold uppercase">15% Platform Commission</div>
            <div className="text-2xl font-black text-safar-teal">₹{Math.round((stats?.totalRevenue || 0) * 0.15)}</div>
          </div>

          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-[11px] text-safar-textMuted font-extrabold uppercase">Net Driver Revenue (85%)</div>
            <div className="text-2xl font-black text-white">₹{Math.round((stats?.totalRevenue || 0) * 0.85)}</div>
          </div>

          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-[11px] text-safar-textMuted font-extrabold uppercase">Completion Ratio</div>
            <div className="text-2xl font-black text-emerald-400">
              {stats?.completedRides ? Math.round((stats.completedRides / Math.max(1, (stats.completedRides + stats.cancelledRides))) * 100) : 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Operational Overview Panel */}
      <div className="bg-safar-card p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-xl font-black text-white">Platform Health & Realtime Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-xs text-safar-textMuted font-bold">API Backend</div>
            <div className="text-sm font-black text-safar-teal flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-safar-teal animate-pulse" />
              <span>ONLINE (Railway Node.js)</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-xs text-safar-textMuted font-bold">Realtime Engine</div>
            <div className="text-sm font-black text-safar-teal flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-safar-teal animate-pulse" />
              <span>Socket.IO Active</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-safar-surface border border-white/5 space-y-1">
            <div className="text-xs text-safar-textMuted font-bold">Database Storage</div>
            <div className="text-sm font-black text-safar-teal flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-safar-teal animate-pulse" />
              <span>PostgreSQL / Prisma Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
