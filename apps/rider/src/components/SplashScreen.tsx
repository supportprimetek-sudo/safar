import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, durationMs = 2200 }) => {
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 25;
      });
    }, durationMs / 4);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
    }, durationMs);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#11151D] flex flex-col items-center justify-between p-8 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-[#35D0B0]/10 blur-3xl animate-pulse" />
      </div>

      {/* Top Brand Header */}
      <div className="pt-12 text-center relative z-10">
        <div className="inline-flex items-center space-x-2 bg-[#202631]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-bold text-[#35D0B0]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SAFAR Mobility Network</span>
        </div>
      </div>

      {/* Main Logo & Emblem */}
      <div className="text-center relative z-10 space-y-6">
        <div className="relative inline-block">
          <div className="absolute -inset-4 rounded-3xl bg-[#35D0B0]/20 blur-xl animate-pulse" />
          <div className="w-24 h-24 rounded-3xl bg-[#202631] border-2 border-[#35D0B0] flex items-center justify-center text-[#35D0B0] font-black text-4xl shadow-[0_0_40px_rgba(53,208,176,0.4)] relative">
            S
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-black text-white tracking-wider">SAFAR</h1>
          <p className="text-xs font-semibold text-[#A8AFBA] mt-1 tracking-widest uppercase">
            Ride Safe • Ride Smart
          </p>
        </div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="w-full max-w-xs space-y-3 pb-8 relative z-10">
        <div className="h-1.5 w-full bg-[#202631] rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-[#35D0B0] transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-[#A8AFBA]">
          <span>Connecting GPS & Realtime Socket...</span>
          <span className="text-[#35D0B0]">{progress}%</span>
        </div>
      </div>
    </div>
  );
};
