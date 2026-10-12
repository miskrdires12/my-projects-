import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { UserRole } from '@/types';

interface HeaderProps {
  currentStation: UserRole;
  onStationChange: (station: UserRole) => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentStation, onStationChange, onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleSignOut = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'RC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user?.username === 'yonatantesfa'
    ? 'Receiver C. Staff'
    : (user?.username === 'admin' ? 'Administrator' : user?.username || 'Receiver C. Staff');

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-6 gap-4 shadow-xs">
      {/* Navigation Menu Toggle & Search Bar */}
      <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 text-[#1E293B] hover:text-[#062404] hover:bg-[#9EE617]/20 rounded-xl border border-transparent hover:border-[#9EE617]/40 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Toggle Navigation Menu"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-[#1E293B]" />
        </button>

        {/* Global Search Input (Hidden on Sender Station per user request) */}
        {currentStation !== 'SENDER' ? (
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by student ID, name, grade, or section..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-10 pr-9 py-2 text-xs font-medium text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617] transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.currentTarget.value;
                  const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search students..."]');
                  if (searchInput) {
                    searchInput.value = target;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }
              }}
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#1E293B]"
              title="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B1118]">
            <span className="w-2 h-2 rounded-full bg-[#9EE617] animate-pulse" />
            <span className="text-slate-600 font-semibold">Sender Biometric Field Workstation Active</span>
          </div>
        )}
      </div>

      {/* Right Controls: Notifications, Station Switcher & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Station Switcher Pill (for Super Admin) */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="hidden md:flex items-center gap-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => onStationChange('RECEIVER')}
              className={`px-2.5 py-1 rounded-lg transition-all ${currentStation === 'RECEIVER' ? 'bg-[#9EE617] text-[#062404] shadow-xs font-black' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              Receiver
            </button>
            <button
              type="button"
              onClick={() => onStationChange('SENDER')}
              className={`px-2.5 py-1 rounded-lg transition-all ${currentStation === 'SENDER' ? 'bg-[#9EE617] text-[#062404] shadow-xs font-black' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              Sender
            </button>
            <button
              type="button"
              onClick={() => onStationChange('ADMIN')}
              className={`px-2.5 py-1 rounded-lg transition-all ${currentStation === 'ADMIN' ? 'bg-[#9EE617] text-[#062404] shadow-xs font-black' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onStationChange('SUPER_ADMIN')}
              className={`px-2.5 py-1 rounded-lg transition-all ${currentStation === 'SUPER_ADMIN' ? 'bg-[#9EE617] text-[#062404] shadow-xs font-black' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            >
              Super Admin
            </button>
          </div>
        )}

        {/* Notifications Icon with Red Badge (matching screenshot badge "3") */}
        <div className="relative">
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-[#CBD5E1] flex items-center justify-center text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAF9] transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
            3
          </span>
        </div>

        {/* User Profile matching Screenshot ("RC" Avatar, "Receiver C. Staff", "Receiver") */}
        <div className="flex items-center gap-2.5 pl-1 border-l border-[#E2E8F0]">
          <div className="w-9 h-9 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="hidden sm:block text-left leading-none">
            <div className="text-xs font-black text-[#1E293B] leading-tight">
              {displayName}
            </div>
            <div className="text-[10px] text-[#64748B] font-semibold mt-0.5 capitalize">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.role?.toLowerCase() || 'Receiver')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-[#94A3B8] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all ml-1 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
