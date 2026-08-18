import React from 'react';
import { Car, DollarSign, MessageSquare, User } from 'lucide-react';

export type DriverTab = 'dashboard' | 'earnings' | 'chats' | 'profile';

interface DriverBottomNavProps {
  activeTab: DriverTab;
  onSelectTab: (tab: DriverTab) => void;
}

export const DriverBottomNav: React.FC<DriverBottomNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: DriverTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Car className="w-5 h-5" /> },
    { id: 'earnings', label: 'Earnings', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'chats', label: 'Chats', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-safar-card/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 pb-5 max-w-lg mx-auto shadow-2xl">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-safar-teal font-extrabold scale-105 bg-safar-teal/10 border border-safar-teal/20'
                  : 'text-safar-textMuted hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-safar-teal rounded-full animate-ping" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
