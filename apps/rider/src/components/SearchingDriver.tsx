import React from 'react';
import { Loader2, XCircle } from 'lucide-react';

interface SearchingDriverProps {
  onCancel: () => void;
}

export const SearchingDriver: React.FC<SearchingDriverProps> = ({ onCancel }) => {
  return (
    <div className="glass-panel p-6 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-6 text-center">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />

      <div className="relative py-8 flex justify-center items-center">
        {/* Pulsating Radar Effect */}
        <div className="absolute w-36 h-36 rounded-full border-2 border-safar-teal/30 animate-ping" />
        <div className="absolute w-28 h-28 rounded-full border-2 border-safar-teal/60 animate-pulse" />
        
        <div className="relative z-10 w-20 h-20 rounded-full bg-safar-teal/20 border-2 border-safar-teal flex items-center justify-center shadow-[0_0_30px_rgba(53,208,176,0.6)]">
          <Loader2 className="w-10 h-10 text-safar-teal animate-spin" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-black text-white">Searching Nearby Drivers</h3>
        <p className="text-sm text-safar-textMuted mt-1">Connecting you with the closest top-rated SAFAR driver...</p>
      </div>

      <button
        onClick={onCancel}
        className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-2xl border border-red-500/20 flex items-center justify-center space-x-2 transition-colors"
      >
        <XCircle className="w-5 h-5" />
        <span>Cancel Booking</span>
      </button>
    </div>
  );
};
