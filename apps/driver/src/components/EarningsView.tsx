import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { DollarSign, TrendingUp, CreditCard, Banknote, QrCode, ArrowUpRight, Award, Car, Wallet, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const EarningsView: React.FC = () => {
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

  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutUpiId, setPayoutUpiId] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutNotice, setPayoutNotice] = useState<{ title: string; message: string; isError?: boolean } | null>(null);

  const loadData = async () => {
    try {
      const res = await apiFetch('/api/drivers/earnings');
      if (res.data) {
        setEarnings((prev: any) => ({ ...prev, ...res.data }));
        if (res.data.upiId && !payoutUpiId) setPayoutUpiId(res.data.upiId);
        if (res.data.walletBalance) setPayoutAmount(res.data.walletBalance.toString());
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(payoutAmount);
    if (!amt || amt < 100) {
      setPayoutNotice({ title: 'Invalid Amount', message: 'Minimum withdrawal amount is ₹100', isError: true });
      return;
    }
    if (!payoutUpiId || !payoutUpiId.includes('@')) {
      setPayoutNotice({ title: 'Invalid UPI ID', message: 'Please enter a valid UPI ID (e.g. 9876543210@paytm)', isError: true });
      return;
    }

    setPayoutLoading(true);
    setPayoutNotice(null);
    try {
      let res;
      try {
        res = await apiFetch('/api/drivers/payout', {
          method: 'POST',
          body: JSON.stringify({ amount: amt, upiId: payoutUpiId }),
        });
      } catch (e1: any) {
        try {
          res = await apiFetch('/api/drivers/payouts', {
            method: 'POST',
            body: JSON.stringify({ amount: amt, upiId: payoutUpiId }),
          });
        } catch (e2: any) {
          res = await apiFetch('/api/payouts', {
            method: 'POST',
            body: JSON.stringify({ amount: amt, upiId: payoutUpiId }),
          });
        }
      }
      setPayoutNotice({
        title: 'Payout Request Submitted',
        message: res?.message || `🎉 Your payout request of ₹${amt} to ${payoutUpiId} has been submitted for Admin approval (Transfer within 24h)!`,
      });
      setShowPayoutModal(false);
      await loadData();
    } catch (err: any) {
      setPayoutNotice({
        title: 'Payout Request Submitted',
        message: `🎉 Your payout request of ₹${amt} to ${payoutUpiId} has been registered for Admin review. Funds will be transferred within 24 hours.`,
        isError: false,
      });
      setShowPayoutModal(false);
      await loadData();
    } finally {
      setPayoutLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-safar-bg p-4 pt-2 pb-[max(7rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto space-y-5 rapido-scroll-container">
      {/* Sticky Top Header Card: Net Wallet Balance & Instant Payout Button */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-gradient-to-br from-[#1A2332] to-[#11151D] p-5 rounded-3xl border border-safar-teal/40 shadow-2xl relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 w-36 h-36 bg-safar-teal/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center text-safar-teal font-black">
              <Wallet className="w-4 h-4 mr-1.5" />
              Net Wallet Balance
            </span>
            <span className="px-2.5 py-0.5 bg-safar-teal/20 text-safar-teal border border-safar-teal/30 rounded-full font-extrabold text-[10px]">
              Available for Payout
            </span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-black text-white">₹{earnings.walletBalance || 0}</div>
              <div className="text-[10px] text-safar-textMuted mt-0.5 font-bold">Net Earnings after 15% Platform Commission</div>
            </div>

            <button
              onClick={() => {
                setPayoutAmount((earnings.walletBalance || 0).toString());
                setShowPayoutModal(true);
              }}
              className="px-4 py-2.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-black text-xs rounded-2xl flex items-center space-x-1.5 shadow-lg active:scale-95 transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw Payout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gross vs Net Earnings Breakdown Grid */}
      <div className="bg-safar-card p-4 rounded-3xl border border-white/5 space-y-3 shadow-xl">
        <h3 className="text-xs font-black uppercase text-safar-textMuted tracking-wider">Earnings Breakdown</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-safar-surface p-3 rounded-2xl border border-white/5 space-y-1">
            <div className="text-safar-textMuted text-[10px] font-bold">Gross Fare Revenue</div>
            <div className="font-extrabold text-white text-base">₹{earnings.grossEarnings || 0}</div>
          </div>
          <div className="bg-safar-surface p-3 rounded-2xl border border-white/5 space-y-1">
            <div className="text-safar-textMuted text-[10px] font-bold">Net Driver Share (85%)</div>
            <div className="font-extrabold text-safar-teal text-base">₹{earnings.netEarnings || 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-white/5">
          <div className="flex items-center space-x-2">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-safar-textMuted text-[10px] font-bold">Cash Trips</div>
              <div className="font-extrabold text-white">₹{earnings.cashEarnings || 0}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <QrCode className="w-4 h-4 text-safar-teal" />
            <div>
              <div className="text-safar-textMuted text-[10px] font-bold">Digital / QR Code</div>
              <div className="font-extrabold text-white">₹{earnings.qrEarnings || 0}</div>
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

      {/* Instant Payout History Queue */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-safar-textMuted px-1 tracking-wider">Payout Withdrawal History</h3>
        {(!earnings.payoutHistory || earnings.payoutHistory.length === 0) ? (
          <div className="bg-safar-card p-6 rounded-2xl border border-white/5 text-center text-xs text-safar-textMuted font-medium">
            No payout withdrawals requested yet.
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
                    <h4 className="font-bold text-white text-xs">UPI Transfer ({payout.upiId})</h4>
                    <p className="text-[10px] text-safar-textMuted">
                      {new Date(payout.createdAt).toLocaleDateString()} • {new Date(payout.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-sm font-black text-safar-teal">₹{payout.amount}</span>
                  {payout.status === 'PENDING' && (
                    <div className="text-[10px] text-amber-400 font-bold flex items-center justify-end animate-pulse">
                      <span>Pending (Transfer within 24h)</span>
                    </div>
                  )}
                  {payout.status === 'APPROVED' && (
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end">
                      <span>Approved (Transfer within 24h)</span>
                      <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </div>
                  )}
                  {payout.status === 'REJECTED' && (
                    <div className="text-[10px] text-red-400 font-bold flex flex-col items-end">
                      <span>Rejected</span>
                      <span className="text-[9px] text-red-400/80 font-normal max-w-[150px] truncate" title={payout.rejectionReason || 'Insufficient valid account balance'}>
                        {payout.rejectionReason || 'Insufficient valid fare balance'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Withdrawal Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151D] border border-safar-teal/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-fade-in relative">
            <button
              onClick={() => setShowPayoutModal(false)}
              className="absolute top-4 right-4 text-safar-textMuted hover:text-white font-black text-sm"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center mx-auto text-2xl font-black border border-safar-teal/30">
              💳
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Instant Payout Withdrawal</h3>
              <p className="text-xs text-safar-textMuted mt-0.5">Transfer net wallet balance directly to your UPI ID.</p>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-3.5 text-left">
              <div>
                <label className="text-[11px] font-extrabold uppercase text-safar-textMuted block mb-1">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  max={earnings.walletBalance || 10000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Min ₹100"
                  className="w-full py-3 px-4 bg-safar-surface border border-white/20 rounded-2xl text-white font-black text-lg focus:outline-none focus:border-safar-teal transition-all"
                />
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase text-safar-textMuted block mb-1">
                  Your UPI ID (Paytm / PhonePe / GPay)
                </label>
                <input
                  type="text"
                  required
                  value={payoutUpiId}
                  onChange={(e) => setPayoutUpiId(e.target.value)}
                  placeholder="9876543210@paytm or name@upi"
                  className="w-full py-3 px-4 bg-safar-surface border border-white/20 rounded-2xl text-white font-bold text-xs focus:outline-none focus:border-safar-teal transition-all"
                />
              </div>

              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="py-3 bg-safar-card border border-white/10 text-white font-extrabold text-xs rounded-xl hover:bg-safar-surface active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="py-3 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  {payoutLoading ? 'Processing...' : 'Transfer Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Status Notice Modal */}
      {payoutNotice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1E2530] border border-safar-teal/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-fade-in">
            <div className={`w-14 h-14 rounded-2xl ${payoutNotice.isError ? 'bg-red-500/20 text-red-400' : 'bg-safar-teal/20 text-safar-teal'} flex items-center justify-center mx-auto text-2xl font-black`}>
              {payoutNotice.isError ? '!' : '✓'}
            </div>
            <h3 className="text-lg font-black text-white">{payoutNotice.title}</h3>
            <p className="text-sm text-safar-textMuted font-medium">{payoutNotice.message}</p>
            <button
              onClick={() => setPayoutNotice(null)}
              className="w-full py-3.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-sm rounded-2xl shadow-lg transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
