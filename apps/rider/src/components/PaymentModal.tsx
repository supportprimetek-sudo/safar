import React from 'react';
import { QrCode, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PaymentModalProps {
  amount: number;
  upiPayload?: string;
  onConfirmCashPayment: (paymentMethod?: 'UPI') => void;
  loading: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  onConfirmCashPayment,
  loading,
}) => {
  return (
    <div className="glass-panel p-6 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-5 text-center">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

      <div>
        <span className="px-3 py-1 bg-safar-teal/20 text-safar-teal rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center justify-center w-fit mx-auto space-x-1 border border-safar-teal/30">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Trip Completed
        </span>
        <h3 className="text-2xl font-black text-white mt-2">Ride Fare Payment</h3>
        <p className="text-xs text-safar-textMuted mt-1 font-medium">
          Pay via UPI QR (GPay / PhonePe / Paytm / BHIM) and confirm below.
        </p>
      </div>

      <div className="bg-gradient-to-br from-[#1A2332] to-[#11151D] p-5 rounded-2xl border border-safar-teal/40 shadow-xl space-y-1">
        <div className="text-xs text-safar-textMuted uppercase font-extrabold tracking-wider">Total Ride Fare</div>
        <div className="text-4xl font-black text-safar-teal">₹{amount}</div>
        <div className="text-[11px] text-safar-teal/80 font-bold mt-1">📲 Pay via Online UPI / QR to Driver</div>
      </div>

      <div className="bg-safar-card p-4 rounded-2xl border border-white/5 text-left space-y-2">
        <div className="flex items-center text-xs font-bold text-white space-x-2">
          <QrCode className="w-4 h-4 text-safar-teal flex-shrink-0" />
          <span>Pay Driver via UPI App & Press Confirm</span>
        </div>
        <p className="text-[11px] text-safar-textMuted leading-relaxed">
          Once you complete payment on your UPI app, tap the button below to confirm. Driver earnings & trip completion are verified upon rider confirmation.
        </p>
      </div>

      <button
        onClick={() => onConfirmCashPayment('UPI')}
        disabled={loading}
        className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-black text-base rounded-2xl shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
      >
        <CheckCircle2 className="w-6 h-6" />
        <span>{loading ? 'Confirming Payment...' : '📲 Confirm QR / UPI Paid'}</span>
      </button>
    </div>
  );
};
