import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Map, FileCheck, Car, MapPin, Users, UserCheck, Route, LogOut, ShieldAlert } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
    { to: '/live-map', label: 'Live Operations Map', icon: Map },
    { to: '/kyc', label: 'KYC Verification Queue', icon: FileCheck },
    { to: '/vehicles', label: 'Vehicles & Fare Rules', icon: Car },
    { to: '/destinations', label: 'Popular Destinations', icon: MapPin },
    { to: '/drivers', label: 'Driver Management', icon: Users },
    { to: '/riders', label: 'Rider Management', icon: UserCheck },
    { to: '/rides', label: 'Ride History Monitor', icon: Route },
  ];

  return (
    <aside className="w-64 bg-safar-card border-r border-white/10 flex flex-col justify-between p-4 h-screen sticky top-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center space-x-3 px-3 py-2 bg-safar-surface rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-xl bg-safar-teal text-safar-bg flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(53,208,176,0.5)]">
            S
          </div>
          <div>
            <div className="text-base font-black text-white tracking-wider">SAFAR</div>
            <div className="text-[10px] font-bold text-safar-teal uppercase">Admin Control Panel</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-safar-teal/20 text-safar-teal border border-safar-teal/30 shadow-[0_0_15px_rgba(53,208,176,0.2)]'
                      : 'text-safar-textMuted hover:bg-safar-surface hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Admin User Footer */}
      <div className="bg-safar-surface p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-safar-teal/20 text-safar-teal border border-safar-teal/30 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{user?.fullName || 'Admin'}</div>
            <div className="text-[10px] text-safar-textMuted truncate">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
