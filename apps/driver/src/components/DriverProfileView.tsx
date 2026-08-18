import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Car, Phone, Mail, ShieldCheck, CreditCard, Award, LogOut, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const DriverProfileView: React.FC = () => {
  const { user, logout } = useAuth();
  const driver = user?.driverProfile;

  const isKycApproved = driver?.kycStatus === 'APPROVED' && driver?.driverStatus === 'APPROVED';

  return (
    <div className="min-h-screen bg-safar-bg p-4 pb-24 max-w-lg mx-auto space-y-5">
      {/* Header Profile Info */}
      <div className="bg-safar-card p-5 rounded-3xl border border-white/10 shadow-lg flex items-center space-x-4">
        <div className="w-16 h-16 rounded-2xl bg-safar-teal text-safar-bg font-black text-2xl flex items-center justify-center shadow-lg">
          {user?.fullName?.charAt(0) || 'D'}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-white">{user?.fullName}</h2>
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
            <ChevronRight className="w-4 h-4 text-safar-textMuted" />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-safar-textMuted font-bold">Payout Bank Account (UPI)</div>
                <div className="text-sm font-semibold text-white">HDFC Bank •••• 4920</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-safar-textMuted" />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs text-safar-textMuted font-bold">KYC Documents Verification</div>
                <div className="text-sm font-semibold text-white">Driving License, RC, Aadhar Verified</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-safar-textMuted" />
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
    </div>
  );
};
