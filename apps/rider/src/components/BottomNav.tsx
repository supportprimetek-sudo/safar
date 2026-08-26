import React from 'react';
import { MapPin, Compass, History, MessageSquare, User } from 'lucide-react';

export type RiderTab = 'home' | 'places' | 'history' | 'profile';

interface BottomNavProps {
  activeTab: RiderTab;
  onSelectTab: (tab: RiderTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: RiderTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Rides', icon: <MapPin className="w-5 h-5" /> },
    { id: 'places', label: 'Places', icon: <Compass className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-safar-card/95 backdrop-blur-xl border-t border-white/10 px-3 pt-2.5 pb-[max(1.75rem,env(safe-area-inset-bottom,24px))] max-w-lg mx-auto shadow-2xl">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-safar-teal font-extrabold scale-105 bg-safar-teal/10 border border-safar-teal/20'
                  : 'text-safar-textMuted hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
