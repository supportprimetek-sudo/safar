import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { DollarSign, TrendingUp, Calendar, CreditCard, Banknote, QrCode, ArrowUpRight, Award, Car } from 'lucide-react';

export const EarningsView: React.FC = () => {
  const [earnings, setEarnings] = useState<any>({
    totalEarnings: 18450,
    totalRides: 42,
    cashEarnings: 12100,
    qrEarnings: 6350,
    weeklyGrowth: '+18.4%',
    completionRate: '98.5%',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiFetch('/api/drivers/earnings');
        if (res.data) setEarnings((prev: any) => ({ ...prev, ...res.data }));
      } catch (err) {}
    }
    loadData();
  }, []);

  const payoutHistory = [
    { id: '1', date: 'Today, 08:30 PM', amount: 1450, method: 'Direct Bank Transfer (UPI)', status: 'COMPLETED' },
    { id: '2', date: 'Yesterday, 09:15 PM', amount: 2100, method: 'Direct Bank Transfer (UPI)', status: 'COMPLETED' },
    { id: '3', date: '16 Aug 2026', amount: 3250, method: 'Direct Bank Transfer (UPI)', status: 'COMPLETED' },
    { id: '4', date: '15 Aug 2026', amount: 2800, method: 'Direct Bank Transfer (UPI)', status: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-safar-bg p-4 pt-2 pb-[max(7rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto space-y-5">
      {/* Sticky Frozen Opaque Top Header Card */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-gradient-to-br from-safar-card to-safar-surface p-5 rounded-3xl border border-safar-teal/30 shadow-2xl relative overflow-hidden space-y-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-safar-teal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold uppercase tracking-wider">
            <span>Total Weekly Earnings</span>
            <span className="flex items-center text-safar-teal bg-safar-teal/20 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
              <TrendingUp className="w-3 h-3 mr-1" />
              {earnings.weeklyGrowth || '+18.4%'}
            </span>
          </div>
          <div className="text-3xl font-black text-white">₹{earnings.totalEarnings}</div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="flex items-center space-x-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-safar-textMuted text-[10px] font-bold">Cash Earnings</div>
                <div className="font-extrabold text-white">₹{earnings.cashEarnings}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-safar-teal" />
              <div>
                <div className="text-safar-textMuted text-[10px] font-bold">Online / QR Code</div>
                <div className="font-extrabold text-white">₹{earnings.qrEarnings}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold">
            <span>Completed Trips</span>
            <Car className="w-4 h-4 text-safar-teal" />
          </div>
          <div className="text-2xl font-black text-white">{earnings.totalRides} Trips</div>
          <div className="text-[10px] text-safar-teal font-bold">Completion Rate: {earnings.completionRate || '98.5%'}</div>
        </div>

        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold">
            <span>Partner Rating</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-black text-yellow-400">{earnings.rating?.toFixed(1) || '4.9'} ★</div>
          <div className="text-[10px] text-safar-textMuted">Top 5% Partner</div>
        </div>
      </div>

      {/* Instant Payout History */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-safar-textMuted px-1 tracking-wider">Recent Payout Settlements</h3>
        <div className="space-y-2.5">
          {payoutHistory.map((payout) => (
            <div key={payout.id} className="bg-safar-card p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-safar-teal/10 text-safar-teal flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{payout.method}</h4>
                  <p className="text-xs text-safar-textMuted">{payout.date}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-safar-teal">₹{payout.amount}</span>
                <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end">
                  <span>Settled</span>
                  <ArrowUpRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
