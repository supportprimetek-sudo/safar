import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { MapPin, Star, Navigation, Sparkles } from 'lucide-react';

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

  const fallbackDestinations: PopularDestination[] = [
    {
      id: '1',
      name: 'IGI Airport T3',
      address: 'Indira Gandhi International Airport, New Delhi',
      latitude: 28.5562,
      longitude: 77.1000,
      imageUrl: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      category: 'Airport',
    },
    {
      id: '2',
      name: 'Connaught Place',
      address: 'Radial Road, Connaught Place, New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      imageUrl: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80',
      rating: 4.8,
      category: 'Shopping & Dining',
    },
    {
      id: '3',
      name: 'Cyber Hub Gurugram',
      address: 'DLF Cyber City, Sector 24, Gurugram',
      latitude: 28.4950,
      longitude: 77.0890,
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      category: 'Corporate Hub',
    },
    {
      id: '4',
      name: 'Select CITYWALK Saket',
      address: 'District Centre, Saket, New Delhi',
      latitude: 28.5286,
      longitude: 77.2192,
      imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=400&q=80',
      rating: 4.7,
      category: 'Mall',
    },
    {
      id: '5',
      name: 'New Delhi Railway Station',
      address: 'Bhavbhuti Marg, Ratan Lal Market, New Delhi',
      latitude: 28.6430,
      longitude: 77.2194,
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
      rating: 4.8,
      category: 'Railway Station',
    },
    {
      id: '6',
      name: 'India Gate',
      address: 'Rajpath, India Gate, New Delhi',
      latitude: 28.6129,
      longitude: 77.2295,
      imageUrl: 'https://images.unsplash.com/photo-1597040663442-18115668a6fc?auto=format&fit=crop&w=400&q=80',
      rating: 4.9,
      category: 'Monuments',
    },
  ];

  useEffect(() => {
    async function fetchDestinations() {
      try {
        const res = await apiFetch('/api/rides/popular-destinations');
        if (res.data && res.data.length > 0) {
          setDestinations(res.data);
        } else {
          setDestinations(fallbackDestinations);
        }
      } catch (err) {
        setDestinations(fallbackDestinations);
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
        <div className="text-center py-12 text-safar-textMuted font-bold">Loading destinations...</div>
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
