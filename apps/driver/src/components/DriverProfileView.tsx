import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { Car, Phone, ShieldCheck, CreditCard, LogOut, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const DriverProfileView: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();
  const driver = user?.driverProfile;

  const [upiId, setUpiId] = useState(driver?.upiId || '');
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const isKycApproved = driver?.kycStatus === 'APPROVED' && driver?.driverStatus === 'APPROVED';

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ upiId }),
      });
      setSaveNotice('✅ Payout UPI ID updated successfully!');
      if (refreshProfile) refreshProfile();
      setTimeout(() => setSaveNotice(null), 3000);
    } catch (err: any) {
      setSaveNotice(`❌ ${err.message || 'Failed to update UPI ID'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-safar-bg p-4 pt-2 pb-[max(7rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto space-y-5 rapido-scroll-container">
      {/* Sticky Header Profile Info */}
      <div className="sticky top-0 z-30 pt-[max(2.5rem,env(safe-area-inset-top,32px))] pb-2 bg-[#11151D] border-b border-white/10 -mx-4 px-4 mb-2">
        <div className="bg-safar-card p-4 rounded-3xl border border-white/10 shadow-lg flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-safar-teal text-safar-bg font-black text-2xl flex items-center justify-center shadow-lg">
            {user?.fullName?.charAt(0) || 'D'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-white leading-tight">{user?.fullName}</h2>
            <p className="text-xs text-safar-textMuted flex items-center mt-0.5">
              <Phone className="w-3.5 h-3.5 mr-1 text-safar-teal" />
              {user?.phone || '+91 9876543210'}
            </p>

            <div className="mt-2 flex items-center space-x-2">
              <span className="text-[10px] bg-safar-teal/20 text-safar-teal border border-safar-teal/30 px-2.5 py-0.5 rounded-full font-bold">
                {driver?.vehicleType?.name || 'Verified Partner'}
              </span>
              {isKycApproved ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Approved
                </span>
              ) : (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pending Verification
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payout UPI Setup Section */}
      <div className="bg-gradient-to-br from-[#1A2332] to-[#11151D] p-5 rounded-3xl border border-safar-teal/40 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-safar-teal/20 text-safar-teal flex items-center justify-center border border-safar-teal/30">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Default Payout Bank Account (UPI)</h3>
            <p className="text-[11px] text-safar-textMuted font-medium">Auto-fills when requesting instant payouts.</p>
          </div>
        </div>

        <form onSubmit={handleSaveUpi} className="space-y-2.5 pt-1">
          <div>
            <label className="text-[10px] font-black uppercase text-safar-textMuted tracking-wider block mb-1">
              Your UPI ID (Paytm / PhonePe / GPay / BHIM)
            </label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. 9876543210@paytm or name@upi"
              className="w-full py-3 px-4 bg-[#0D1117] border border-safar-teal/40 rounded-2xl text-white font-bold text-xs focus:outline-none focus:border-safar-teal transition-all"
            />
          </div>

          {saveNotice && (
            <div className={`text-xs font-bold ${saveNotice.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
              {saveNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving UPI ID...' : 'Save Default Payout UPI'}</span>
          </button>
        </form>
      </div>

      {/* Vehicle & License Info */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase text-safar-textMuted px-1 tracking-wider">Vehicle & License Details</h3>

        <div className="bg-safar-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Car className="w-5 h-5 text-safar-teal" />
              <div>
                <div className="text-xs text-safar-textMuted font-bold">Vehicle Registration Number</div>
                <div className="text-sm font-semibold text-white">{driver?.licenseNumber || 'DL-01-AB-1234'}</div>
              </div>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs text-safar-textMuted font-bold">KYC Documents Verification</div>
                <div className="text-sm font-semibold text-white">Driving License, RC, Aadhar Verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-extrabold rounded-2xl flex items-center justify-center space-x-2 transition-colors shadow-lg active:scale-98"
      >
        <LogOut className="w-5 h-5" />
        <span>Log Out Partner Account</span>
      </button>

      <div className="text-center pt-2">
        <span className="px-3 py-1 bg-safar-surface border border-safar-teal/30 text-safar-teal text-[10px] font-black rounded-full uppercase tracking-wider">
          SAFAR Partner v1.0.100 (Build 100)
        </span>
      </div>
    </div>
  );
};
