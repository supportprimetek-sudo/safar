import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileCheck, Users, Car, Menu, X, Map, UserCheck, MapPin, Route, DollarSign, LogOut, ShieldAlert } from 'lucide-react';

export const AdminBottomNav: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/payouts', label: 'Payouts', icon: DollarSign },
    { to: '/kyc', label: 'KYC', icon: FileCheck },
    { to: '/drivers', label: 'Drivers', icon: Users },
  ];

  const moreLinks = [
    { to: '/vehicles', label: 'Vehicles & Fare Rules', icon: Car },
    { to: '/live-map', label: 'Live Operations Map', icon: Map },
    { to: '/riders', label: 'Rider Management', icon: UserCheck },
    { to: '/destinations', label: 'Popular Destinations', icon: MapPin },
    { to: '/rides', label: 'Ride History Monitor', icon: Route },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile / APK */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-safar-card/95 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom,24px))] max-w-lg mx-auto shadow-2xl">
        <div className="flex justify-around items-center">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.to;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === '/'}
                onClick={() => setShowMoreMenu(false)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
                  isActive
                    ? 'text-safar-teal font-extrabold scale-105 bg-safar-teal/10 border border-safar-teal/20'
                    : 'text-safar-textMuted hover:text-white font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              </NavLink>
            );
          })}

          {/* More Menu Trigger */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 ${
              showMoreMenu || moreLinks.some((l) => location.pathname === l.to)
                ? 'text-safar-teal font-extrabold scale-105 bg-safar-teal/10 border border-safar-teal/20'
                : 'text-safar-textMuted hover:text-white font-medium'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] mt-1 tracking-tight">More</span>
          </button>
        </div>
      </div>

      {/* Slide-Up More Menu Drawer for Mobile */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="bg-[#11151D] border-t border-white/10 rounded-t-3xl p-5 pb-[max(2.5rem,env(safe-area-inset-bottom,32px))] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30 flex items-center justify-center font-black text-base">
                  S
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">Admin Menu</h3>
                  <p className="text-[10px] text-safar-textMuted font-bold">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="w-9 h-9 rounded-xl bg-safar-card border border-white/10 text-white flex items-center justify-center font-extrabold text-sm active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-safar-teal/20 text-safar-teal border-safar-teal/40 shadow-lg'
                        : 'bg-safar-card text-white border-white/10 hover:bg-safar-surface'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-safar-teal flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-extrabold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
