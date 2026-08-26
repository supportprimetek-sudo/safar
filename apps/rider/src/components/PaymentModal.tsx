import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, Banknote, QrCode, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  amount: number;
  upiPayload?: string;
  onConfirmCashPayment: (paymentMethod?: 'CASH' | 'UPI') => void;
  loading: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  amount,
  upiPayload = 'upi://pay?pa=safar@upi&pn=SAFAR&am=100&cu=INR',
  onConfirmCashPayment,
  loading,
}) => {
  const [method, setMethod] = useState<'CASH' | 'QR'>('CASH');

  return (
    <div className="glass-panel p-6 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-5 text-center">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

      <div>
        <span className="px-3 py-1 bg-safar-teal/20 text-safar-teal rounded-full text-xs font-extrabold uppercase">
          Trip Ended
        </span>
        <h3 className="text-2xl font-black text-white mt-2">Payment Required</h3>
        <p className="text-sm text-safar-textMuted mt-0.5">Please pay the driver to complete your ride.</p>
      </div>

      <div className="bg-safar-card p-4 rounded-2xl border border-safar-teal/30">
        <div className="text-xs text-safar-textMuted uppercase font-bold">Total Amount Due</div>
        <div className="text-4xl font-black text-safar-teal mt-1">₹{amount}</div>
      </div>

      {/* Payment Method Selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMethod('CASH')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
            method === 'CASH'
              ? 'bg-safar-teal/20 border-safar-teal text-white shadow-[0_0_15px_rgba(53,208,176,0.2)]'
              : 'bg-safar-card border-white/5 text-safar-textMuted hover:bg-safar-cardHover'
          }`}
        >
          <Banknote className="w-6 h-6 text-safar-teal" />
          <span className="text-xs font-bold">Cash Payment</span>
        </button>

        <button
          onClick={() => setMethod('QR')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
            method === 'QR'
              ? 'bg-safar-teal/20 border-safar-teal text-white shadow-[0_0_15px_rgba(53,208,176,0.2)]'
              : 'bg-safar-card border-white/5 text-safar-textMuted hover:bg-safar-cardHover'
          }`}
        >
          <QrCode className="w-6 h-6 text-safar-teal" />
          <span className="text-xs font-bold">Scan UPI QR</span>
        </button>
      </div>

      {method === 'QR' && (
        <div className="bg-white p-4 rounded-2xl max-w-[200px] mx-auto shadow-xl flex flex-col items-center space-y-2">
          <QRCodeSVG value={upiPayload} size={150} />
          <span className="text-[10px] text-gray-700 font-bold">Scan with GPay / PhonePe / Paytm</span>
        </div>
      )}

      {method === 'CASH' ? (
        <button
          onClick={() => onConfirmCashPayment('CASH')}
          disabled={loading}
          className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{loading ? 'Confirming...' : '💵 I Handed Cash To Driver'}</span>
        </button>
      ) : (
        <button
          onClick={() => onConfirmCashPayment('UPI')}
          disabled={loading}
          className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{loading ? 'Confirming...' : '📲 QR / UPI Paid (Confirmed)'}</span>
        </button>
      )}
    </div>
  );
};
