import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, ShieldCheck, Check, X } from 'lucide-react';

interface RideRequestPayload {
  rideId: string;
  pickupAddress: string;
  destinationAddress: string;
  distanceKm: number;
  estimatedFare: number;
  riderName: string;
  riderPhone: string;
  vehicleName: string;
  etaToPickupMinutes: number;
  timeoutSeconds: number;
}

interface RideRequestModalProps {
  request: RideRequestPayload;
  onAccept: (rideId: string) => void;
  onReject: (rideId: string) => void;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({ request, onAccept, onReject }) => {
  const [timeLeft, setTimeLeft] = useState(request.timeoutSeconds || 15);

  useEffect(() => {
    // Play audio alert chime, haptic vibration, & spoken voice announcement on request mount
    try {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);

      // 1. Synthesize audio chime pitch
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);

      // 2. Speak voice alert out loud
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const spokenAlert = `New ride request! ${request.distanceKm} kilometers away, fare ${request.estimatedFare} rupees.`;
        const utterance = new SpeechSynthesisUtterance(spokenAlert);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  }, [request.distanceKm, request.estimatedFare]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onReject(request.rideId);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, request.rideId, onReject]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-[max(2.5rem,env(safe-area-inset-bottom,36px))] overflow-y-auto">
      <div className="bg-safar-card border-2 border-safar-teal w-full max-w-md rounded-3xl p-6 mb-2 shadow-[0_0_50px_rgba(53,208,176,0.4)] space-y-5 animate-pulse-border">
        {/* Header & Countdown Badge */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-safar-teal animate-ping" />
            <h3 className="text-xl font-black text-white">NEW RIDE REQUEST</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-safar-teal/20 border-2 border-safar-teal text-safar-teal flex items-center justify-center font-black text-lg">
            {timeLeft}s
          </div>
        </div>

        {/* Fare & Distance Badge */}
        <div className="bg-safar-surface p-4 rounded-2xl border border-white/10 flex justify-between items-center">
          <div>
            <div className="text-xs text-safar-textMuted font-bold uppercase">Estimated Fare</div>
            <div className="text-3xl font-black text-safar-teal">₹{request.estimatedFare}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-safar-textMuted font-bold uppercase">Trip Distance</div>
            <div className="text-lg font-bold text-white">{request.distanceKm} km</div>
          </div>
        </div>

        {/* Address Details */}
        <div className="bg-safar-surface/60 p-4 rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-safar-textMuted uppercase font-bold">Pickup Location ({request.etaToPickupMinutes} min away)</div>
              <div className="text-sm font-semibold text-white">{request.pickupAddress}</div>
            </div>
          </div>

          <div className="border-l-2 border-dashed border-white/20 ml-2.5 h-3" />

          <div className="flex items-start space-x-3">
            <Navigation className="w-5 h-5 text-safar-teal mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-safar-textMuted uppercase font-bold">Drop Destination</div>
              <div className="text-sm font-semibold text-white">{request.destinationAddress}</div>
            </div>
          </div>
        </div>

        {/* Passenger info */}
        <div className="flex justify-between items-center px-1 text-xs text-safar-textMuted">
          <span>Passenger: <strong className="text-white">{request.riderName}</strong></span>
          <span>Category: <strong className="text-safar-teal">{request.vehicleName}</strong></span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => onReject(request.rideId)}
            className="py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold text-base rounded-2xl border border-red-500/20 flex items-center justify-center space-x-2"
          >
            <X className="w-5 h-5" />
            <span>REJECT</span>
          </button>

          <button
            onClick={() => onAccept(request.rideId)}
            className="py-4 bg-safar-teal hover:bg-safar-tealHover text-safar-bg font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center space-x-2"
          >
            <Check className="w-5 h-5" />
            <span>ACCEPT RIDE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
