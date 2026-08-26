import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { DollarSign, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Copy, Check, Filter } from 'lucide-react';

export const PayoutManagement: React.FC = () => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Insufficient valid account balance / verification requirement not met');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/admin/payouts');
      if (res.data) {
        setPayouts(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load driver payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleApprove = async (id: string, amount: number, driverName: string) => {
    if (!window.confirm(`Are you sure you want to APPROVE payout of ₹${amount} for ${driverName}? Funds will be transferred to UPI within 24 hours.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/payouts/${id}/approve`, { method: 'POST' });
      await fetchPayouts();
    } catch (err: any) {
      alert(err.message || 'Failed to approve payout request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/payouts/${rejectingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectingId(null);
      await fetchPayouts();
    } catch (err: any) {
      alert(err.message || 'Failed to reject payout request');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(text);
    setTimeout(() => setCopiedUpi(null), 2000);
  };

  // Stats calculation
  const pendingCount = payouts.filter((p) => p.status === 'PENDING').length;
  const pendingTotal = payouts.filter((p) => p.status === 'PENDING').reduce((acc, p) => acc + p.amount, 0);
  const approvedTotal = payouts.filter((p) => p.status === 'APPROVED').reduce((acc, p) => acc + p.amount, 0);
  const rejectedCount = payouts.filter((p) => p.status === 'REJECTED').length;

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-safar-card p-6 rounded-3xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-safar-teal/20 text-safar-teal flex items-center justify-center font-black">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Driver Earnings & Payout Requests</h1>
              <p className="text-xs text-safar-textMuted font-medium">
                Review, approve instant 24h transfers, or reject driver payout requests with automatic notifications.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchPayouts}
          disabled={loading}
          className="px-4 py-2.5 bg-safar-surface hover:bg-white/10 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 border border-white/10 transition-all active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-safar-card p-5 rounded-3xl border border-amber-500/30 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-center text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center space-x-1">
              <Clock className="w-4 h-4 mr-1 animate-pulse" />
              Pending Review
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 rounded-full text-[10px] font-black">{pendingCount} Requests</span>
          </div>
          <div className="text-2xl font-black text-white">₹{pendingTotal.toLocaleString()}</div>
          <div className="text-[10px] text-amber-400/80 mt-1 font-bold">Requires Admin Action for 24h Settlement</div>
        </div>

        <div className="bg-safar-card p-5 rounded-3xl border border-safar-teal/30 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-center text-safar-teal text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approved Payouts
            </span>
          </div>
          <div className="text-2xl font-black text-safar-teal">₹{approvedTotal.toLocaleString()}</div>
          <div className="text-[10px] text-safar-textMuted mt-1 font-bold">Transferred / Scheduled within 24 Hours</div>
        </div>

        <div className="bg-safar-card p-5 rounded-3xl border border-red-500/30 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-center text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center space-x-1">
              <XCircle className="w-4 h-4 mr-1" />
              Rejected Requests
            </span>
            <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-[10px] font-black">{rejectedCount}</span>
          </div>
          <div className="text-2xl font-black text-white">{rejectedCount}</div>
          <div className="text-[10px] text-red-400/80 mt-1 font-bold">Driver Notified with Insufficient Reason</div>
        </div>

        <div className="bg-safar-card p-5 rounded-3xl border border-white/10 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-center text-safar-textMuted text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Requests</span>
          </div>
          <div className="text-2xl font-black text-white">{payouts.length}</div>
          <div className="text-[10px] text-safar-textMuted mt-1 font-bold">Lifetime Driver Payout History</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <Filter className="w-4 h-4 text-safar-textMuted mr-1" />
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              statusFilter === st
                ? 'bg-safar-teal text-safar-bg shadow-md'
                : 'bg-safar-surface text-safar-textMuted hover:text-white'
            }`}
          >
            {st === 'ALL' && `All Requests (${payouts.length})`}
            {st === 'PENDING' && `Pending Approval (${pendingCount})`}
            {st === 'APPROVED' && `Approved`}
            {st === 'REJECTED' && `Rejected`}
          </button>
        ))}
      </div>

      {/* Payout Requests Data Table */}
      <div className="bg-safar-card rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-safar-textMuted font-bold text-sm">
            Loading Payout Requests...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 font-bold text-sm space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <div>{error}</div>
            <button onClick={fetchPayouts} className="px-4 py-2 bg-safar-surface text-white rounded-xl text-xs">
              Retry
            </button>
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-safar-textMuted font-bold text-sm space-y-2">
            <Clock className="w-10 h-10 mx-auto opacity-30" />
            <div>No payout requests found under this filter status.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-safar-surface border-b border-white/5 text-safar-textMuted font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Driver Partner</th>
                  <th className="p-4">Vehicle</th>
                  <th className="p-4">Requested Amount</th>
                  <th className="p-4">UPI ID</th>
                  <th className="p-4">Requested Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-white">
                {filteredPayouts.map((p) => {
                  const driverUser = p.driver?.user;
                  const isPending = p.status === 'PENDING';
                  const isApproved = p.status === 'APPROVED';
                  const isRejected = p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-safar-surface/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-safar-surface border border-white/10 flex items-center justify-center font-black text-safar-teal overflow-hidden">
                            {driverUser?.profileImage ? (
                              <img src={driverUser.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              driverUser?.fullName?.charAt(0) || 'D'
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-white">{driverUser?.fullName || 'Driver Partner'}</div>
                            <div className="text-[10px] text-safar-textMuted">{driverUser?.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-safar-textMuted">
                        {p.driver?.vehicleType?.name || 'Partner Vehicle'}
                      </td>

                      <td className="p-4">
                        <div className="text-sm font-black text-safar-teal">₹{p.amount?.toLocaleString()}</div>
                      </td>

                      <td className="p-4">
                        <div className="inline-flex items-center space-x-2 bg-safar-surface px-2.5 py-1 rounded-xl border border-white/10 font-mono text-[11px]">
                          <span>{p.upiId}</span>
                          <button
                            onClick={() => copyToClipboard(p.upiId)}
                            className="text-safar-textMuted hover:text-safar-teal transition-colors"
                            title="Copy UPI ID"
                          >
                            {copiedUpi === p.upiId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-4 text-safar-textMuted text-[11px]">
                        {new Date(p.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="p-4">
                        {isPending && (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full font-black text-[10px] inline-flex items-center space-x-1 animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending (Transfer in 24h)
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2.5 py-1 bg-safar-teal/20 text-safar-teal border border-safar-teal/40 rounded-full font-black text-[10px] inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved (Transfer within 24h)
                          </span>
                        )}
                        {isRejected && (
                          <div className="space-y-0.5">
                            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full font-black text-[10px] inline-flex items-center space-x-1">
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </span>
                            {p.rejectionReason && (
                              <div className="text-[10px] text-red-400/80 max-w-xs truncate" title={p.rejectionReason}>
                                {p.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleApprove(p.id, p.amount, driverUser?.fullName || 'Driver')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-[11px] rounded-xl shadow-md transition-all active:scale-95"
                            >
                              Approve (Transfer 24h)
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(p.id);
                                setRejectReason('Insufficient valid account balance / verification requirement not met');
                              }}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-extrabold text-[11px] rounded-xl transition-all active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-safar-textMuted font-bold uppercase tracking-wider">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal Dialog */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-safar-card border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center text-red-400 font-extrabold text-sm">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5" />
                <span>Reject Driver Payout Request</span>
              </div>
              <button onClick={() => setRejectingId(null)} className="text-safar-textMuted hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-safar-textMuted">
              Provide a rejection reason. The driver will receive an instant notification explaining why their payout was rejected.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-safar-textMuted uppercase tracking-wider">
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-safar-surface border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-red-500/50"
                placeholder="Specify rejection reason..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 bg-safar-surface text-safar-textMuted text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95"
              >
                Confirm Rejection & Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
