import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { Car, Phone, ShieldCheck, CreditCard, LogOut, CheckCircle2, AlertCircle, Edit2, Check, X } from 'lucide-react';

export const DriverProfileView: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const driver = user?.driverProfile;

  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiInput, setUpiInput] = useState(driver?.upiId || '');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiMessage, setUpiMessage] = useState<string | null>(null);

  const isKycApproved = driver?.kycStatus === 'APPROVED' && driver?.driverStatus === 'APPROVED';
  const registeredUpi = driver?.upiId || 'Not set yet';

  const handleUpdateUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiInput || !upiInput.includes('@')) {
      setUpiMessage('❌ Please enter a valid UPI ID (e.g. 9876543210@paytm)');
      return;
    }

    setSavingUpi(true);
    setUpiMessage(null);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ upiId: upiInput.trim() }),
      });
      await refreshUser();
      setIsEditingUpi(false);
      setUpiMessage('✅ Payout UPI ID updated successfully!');
      setTimeout(() => setUpiMessage(null), 3000);
    } catch (err: any) {
      setUpiMessage(err.message || '❌ Failed to update Payout UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div className="w-full bg-safar-bg p-4 pt-2 pb-[max(7.5rem,env(safe-area-inset-bottom,32px))] max-w-lg mx-auto space-y-5">
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

      {/* Onboarded Payout Bank Account (UPI) Display & Quick Edit Card */}
      <div className="bg-gradient-to-br from-[#1A2332] to-[#11151D] p-5 rounded-3xl border border-safar-teal/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-safar-teal/20 text-safar-teal flex items-center justify-center border border-safar-teal/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-safar-textMuted tracking-wider">Onboarded Payout UPI Account</h3>
              <div className="text-sm font-black text-white font-mono mt-0.5">
                {registeredUpi}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setUpiInput(driver?.upiId || '');
              setIsEditingUpi(!isEditingUpi);
            }}
            className="px-3 py-1.5 bg-safar-teal/20 hover:bg-safar-teal/30 text-safar-teal border border-safar-teal/30 rounded-xl font-bold text-xs flex items-center space-x-1 active:scale-95 transition-all"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            <span>{isEditingUpi ? 'Close' : 'Update'}</span>
          </button>
        </div>

        {isEditingUpi && (
          <form onSubmit={handleUpdateUpi} className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                required
                value={upiInput}
                onChange={(e) => setUpiInput(e.target.value)}
                placeholder="e.g. 9876543210@paytm or name@upi"
                className="flex-1 py-2.5 px-3.5 bg-safar-surface border border-safar-teal/40 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-safar-teal"
              />
              <button
                type="submit"
                disabled={savingUpi}
                className="py-2.5 px-4 bg-safar-teal text-safar-bg font-black text-xs rounded-xl flex items-center space-x-1 active:scale-95"
              >
                {savingUpi ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {upiMessage && (
          <div className="text-xs font-bold pt-1">{upiMessage}</div>
        )}

        <p className="text-[11px] text-safar-textMuted font-medium pt-1 border-t border-white/5">
          🗓️ Monthly net earnings automatically transfer to this account on the 1st & 2nd of every month.
        </p>
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
          SAFAR Partner v1.0.104 (Build 104)
        </span>
      </div>
    </div>
  );
};
