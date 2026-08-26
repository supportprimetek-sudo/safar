import React from 'react';
import { FareEstimate } from '@safar/shared';
import { User, Bike, Car, Shield, ArrowLeft } from 'lucide-react';

interface VehicleSelectorProps {
  estimates: FareEstimate[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  loading: boolean;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  estimates,
  selectedVehicleId,
  onSelect,
  onConfirm,
  onBack,
  loading,
}) => {
  const getVehicleIcon = (iconName: string) => {
    switch (iconName) {
      case 'bike':
        return <Bike className="w-7 h-7 text-safar-teal" />;
      case 'auto':
        return (
          <div className="w-8 h-8 rounded-lg bg-safar-teal/20 text-safar-teal flex items-center justify-center font-bold text-xs">
            🛺
          </div>
        );
      default:
        return <Car className="w-7 h-7 text-safar-teal" />;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-t-3xl border-t border-white/10 shadow-2xl space-y-4">
      <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-1" />

      {/* Back Button to Change Location / Refill */}
      {onBack && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-safar-card hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-safar-teal" />
            <span>Change / Refill Location</span>
          </button>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-safar-teal/20 text-safar-teal border border-safar-teal/30">
            Fastest Pickups
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-extrabold tracking-wide text-white">Choose a Ride</h3>
        {estimates[0]?.isSurgeActive ? (
          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse flex items-center space-x-1">
            <span>🔥</span>
            <span>{estimates[0]?.surgeMultiplier?.toFixed(1)}x Surge Active</span>
          </span>
        ) : (
          !onBack && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-safar-teal/20 text-safar-teal border border-safar-teal/30">
              Fastest Pickups
            </span>
          )
        )}
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {estimates.map(({ vehicleType, estimatedFare, etaMinutes }) => {
          const isSelected = selectedVehicleId === vehicleType.id;
          return (
            <div
              key={vehicleType.id}
              onClick={() => onSelect(vehicleType.id)}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-safar-card border-2 border-safar-teal shadow-[0_0_20px_rgba(53,208,176,0.3)]'
                  : 'bg-safar-card/60 hover:bg-safar-card border border-white/5'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-safar-surface flex items-center justify-center border border-white/5">
                  {getVehicleIcon(vehicleType.icon)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-white text-base">{vehicleType.name}</h4>
                    <span className="flex items-center text-xs text-safar-textMuted font-medium">
                      <User className="w-3 h-3 mr-0.5" />
                      {vehicleType.capacity}
                    </span>
                  </div>
                  <p className="text-xs text-safar-textMuted mt-0.5">ETA {etaMinutes} min • {vehicleType.description}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-safar-teal">₹{estimatedFare}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <button
          onClick={onConfirm}
          disabled={!selectedVehicleId || loading}
          className="w-full py-4 bg-safar-teal hover:bg-safar-tealHover disabled:opacity-50 text-safar-bg font-extrabold text-base rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Shield className="w-5 h-5" />
          <span>{loading ? 'Requesting Ride...' : 'Confirm SAFAR Ride'}</span>
        </button>
      </div>
    </div>
  );
};
