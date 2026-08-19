import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { Star, Navigation, Sparkles, MapPin } from 'lucide-react';

interface PopularDestination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  rating?: number;
  category?: string;
}

interface PlacesViewProps {
  onSelectPlace: (address: string, coords: { lat: number; lng: number }) => void;
}

export const PlacesView: React.FC<PlacesViewProps> = ({ onSelectPlace }) => {
  const [destinations, setDestinations] = useState<PopularDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await apiFetch('/api/rides/popular-destinations');
        setDestinations(res.data || []);
      } catch (err) {
        console.error('Error fetching destinations:', err);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchDestinations();
  }, []);

  return (
    <div className="min-h-screen bg-safar-bg p-4 pb-24 max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-safar-card p-5 rounded-3xl border border-white/10 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-safar-teal font-extrabold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Popular Destinations</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Tap Thumbnail to Auto-Fill Drop Location</h2>
        </div>
      </div>

      {/* Grid Display of Popular Destinations */}
      {loading ? (
        <div className="text-center py-12 text-safar-textMuted font-bold">Loading destinations from database...</div>
      ) : destinations.length === 0 ? (
        <div className="bg-safar-card p-8 rounded-3xl border border-white/5 text-center space-y-3">
          <MapPin className="w-10 h-10 text-safar-textMuted mx-auto" />
          <h3 className="text-base font-bold text-white">No Popular Destinations Configured</h3>
          <p className="text-xs text-safar-textMuted">
            Popular destinations added by the Admin in the Control Panel will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              onClick={() => onSelectPlace(dest.address, { lat: dest.latitude, lng: dest.longitude })}
              className="bg-safar-card rounded-3xl border border-white/10 overflow-hidden shadow-xl hover:border-safar-teal/60 cursor-pointer active:scale-95 transition-all group flex flex-col justify-between"
            >
              {/* Image Thumbnail Header */}
              <div className="relative h-32 w-full bg-safar-surface overflow-hidden">
                <img
                  src={dest.imageUrl || 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80'}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-safar-card via-transparent to-transparent opacity-80" />
                
                {dest.category && (
                  <div className="absolute top-2 left-2 bg-safar-card/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black text-safar-teal border border-white/10 uppercase">
                    {dest.category}
                  </div>
                )}

                <div className="absolute top-2 right-2 bg-safar-card/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-yellow-400 border border-white/10 flex items-center">
                  <Star className="w-2.5 h-2.5 fill-current mr-0.5" />
                  <span>{dest.rating || '4.8'}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3.5 space-y-1">
                <h4 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-safar-teal transition-colors">
                  {dest.name}
                </h4>
                <p className="text-[11px] text-safar-textMuted line-clamp-1">{dest.address}</p>

                <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-safar-teal">
                  <span className="flex items-center">
                    <Navigation className="w-3 h-3 mr-1" />
                    Auto-fill Drop Location
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
