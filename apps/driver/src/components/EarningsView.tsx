import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, CreditCard, QrCode, Award, Car, Wallet, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const EarningsView: React.FC = () => {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<any>({
    walletBalance: 0,
    upiId: '',
    grossEarnings: 0,
    netEarnings: 0,
    cashEarnings: 0,
    qrEarnings: 0,
    platformCommission: 0,
    totalRides: 0,
    rating: 5.0,
    payoutHistory: [],
  });

  const loadData = async () => {
    try {
      const res = await apiFetch('/api/drivers/earnings');
      if (res.data) {
        setEarnings((prev: any) => ({ ...prev, ...res.data }));
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const gross = Math.max(earnings.grossEarnings || 0, (earnings.cashEarnings || 0) + (earnings.qrEarnings || 0));
  const net = earnings.netEarnings || Math.round(gross * 0.85);
  const wallet = earnings.walletBalance !== undefined && earnings.walletBalance > 0 ? earnings.walletBalance : net;
  const registeredUpi = earnings.upiId || user?.driverProfile?.upiId || 'Added during onboarding';

  return (
    <div className="w-full bg-safar-bg p-4 pt-2 pb-[max(7.5rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto space-y-5">
      {/* Sticky Top Header Card: Net Wallet Balance & Automatic Monthly Payout Notice */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-gradient-to-br from-[#1A2332] to-[#11151D] p-5 rounded-3xl border border-safar-teal/40 shadow-2xl relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 w-36 h-36 bg-safar-teal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center text-safar-teal font-black">
              <Wallet className="w-4 h-4 mr-1.5" />
              Net Wallet Balance
            </span>
            <span className="px-2.5 py-0.5 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full font-extrabold text-[10px]">
              Auto Transfer
            </span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-black text-white">₹{wallet}</div>
              <div className="text-[10px] text-safar-textMuted mt-0.5 font-bold">Net 85% Driver Share</div>
            </div>

            <div className="px-3 py-1.5 bg-safar-surface border border-safar-teal/30 rounded-2xl text-[10px] text-safar-teal font-bold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>Payout 1st & 2nd Monthly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Monthly Payout Banner Notice */}
      <div className="bg-gradient-to-br from-[#151D2A] to-[#0D1117] p-4.5 rounded-3xl border border-safar-teal/30 shadow-xl space-y-2">
        <div className="flex items-center space-x-2 text-safar-teal font-black text-xs uppercase tracking-wider">
          <CheckCircle2 className="w-4 h-4 text-safar-teal" />
          <span>Automatic Monthly Payout Active</span>
        </div>
        <p className="text-xs text-safar-textMuted leading-relaxed">
          No manual withdrawal requests required! Your total net earnings are automatically transferred directly to your onboarded UPI ID (<span className="text-white font-bold">{registeredUpi}</span>) on the <span className="text-safar-teal font-extrabold">1st and 2nd of every month</span>.
        </p>
      </div>

      {/* Gross vs Net Earnings Breakdown Grid */}
      <div className="bg-safar-card p-4 rounded-3xl border border-white/5 space-y-3 shadow-xl">
        <h3 className="text-xs font-black uppercase text-safar-textMuted tracking-wider">Earnings Breakdown</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-safar-surface p-3 rounded-2xl border border-white/5 space-y-1">
            <div className="text-safar-textMuted text-[10px] font-bold">Gross Fare Revenue</div>
            <div className="font-extrabold text-white text-base">₹{gross}</div>
          </div>
          <div className="bg-safar-surface p-3 rounded-2xl border border-white/5 space-y-1">
            <div className="text-safar-textMuted text-[10px] font-bold">Net Driver Share (85%)</div>
            <div className="font-extrabold text-safar-teal text-base">₹{net}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-white/5">
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-safar-teal" />
            <div>
              <div className="text-safar-textMuted text-[10px] font-bold">Online UPI / QR Trips</div>
              <div className="font-extrabold text-white">₹{earnings.qrEarnings || gross}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-safar-textMuted text-[10px] font-bold">Platform Fee (15%)</div>
              <div className="font-extrabold text-white">₹{earnings.platformCommission || Math.round(gross * 0.15)}</div>
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
          <div className="text-2xl font-black text-white">{earnings.totalRides || 0} Trips</div>
          <div className="text-[10px] text-safar-teal font-bold">100% Platform Verified</div>
        </div>

        <div className="bg-safar-card p-4 rounded-2xl border border-white/5 space-y-1">
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold">
            <span>Partner Rating</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-black text-yellow-400">{earnings.rating?.toFixed(1) || '5.0'} ★</div>
          <div className="text-[10px] text-safar-textMuted">Top Verified Partner</div>
        </div>
      </div>

      {/* Monthly Automatic Payout Settlement Records */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-safar-textMuted px-1 tracking-wider">Monthly Auto-Payout Settlements</h3>
        {(!earnings.payoutHistory || earnings.payoutHistory.length === 0) ? (
          <div className="bg-safar-card p-6 rounded-2xl border border-white/5 text-center text-xs text-safar-textMuted font-medium">
            Next auto-payout settlement scheduled for 1st & 2nd of the month to <span className="text-safar-teal font-bold">{registeredUpi}</span>.
          </div>
        ) : (
          <div className="space-y-2.5">
            {earnings.payoutHistory.map((payout: any) => (
              <div key={payout.id} className="bg-safar-card p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-safar-teal/15 text-safar-teal flex items-center justify-center border border-safar-teal/20">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Auto Transfer ({payout.upiId})</h4>
                    <p className="text-[10px] text-safar-textMuted">
                      {new Date(payout.createdAt).toLocaleDateString()} • {new Date(payout.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-sm font-black text-safar-teal">₹{payout.amount}</span>
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end">
                    <span>{payout.status || 'SETTLED'}</span>
                    <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
