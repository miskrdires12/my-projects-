import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { UserRole } from '@/types';

interface HeaderProps {
  currentStation: UserRole;
  onStationChange: (station: UserRole) => void;
  onToggleMobileSidebar: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentStation, onToggleMobileSidebar, isSidebarOpen = false }) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'MI';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.username || 'miskrdires11';
  const roleDisplay = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Super Admin');

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6 gap-4 shadow-xs select-none">
      {/* Left: Navigation Menu Toggle & Silicon Labs Logo Brand */}
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-xl border border-slate-200 hover:border-[#9EE617]/50 text-slate-800 hover:text-black hover:bg-[#9EE617]/20 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-900" />
          </button>
        )}

        {/* Silicon Labs Logo & Brand Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1.5 transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="Silicon Labs"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/brand-logo.png';
              }}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-sm tracking-tight text-black">
                SILICON
              </span>
              <span className="bg-[#9EE617] text-black text-[9px] font-black px-1.5 py-0.5 rounded leading-none shadow-xs">
                LABS
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 leading-none mt-0.5 hidden sm:block">
              StudentBridge Terminal
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-[#CBD5E1] flex items-center justify-center text-slate-600 hover:text-black hover:bg-[#F8FAF9] transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
            3
          </span>
        </div>

        {/* User Account Profile with Initials */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0]">
          <div className="w-9 h-9 rounded-full bg-[#9EE617] text-black font-black flex items-center justify-center text-xs shadow-xs border border-[#9EE617]/50 shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="hidden sm:block text-left leading-none">
            <div className="text-xs font-black text-black leading-tight">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {roleDisplay}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all ml-1 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
