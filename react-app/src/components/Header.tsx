import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X, CheckCircle2, AlertTriangle, Info, Clock, Check, Sun, Moon } from 'lucide-react';
import { getCurrentUser, setCurrentUser } from '@/lib/store';
import { UserRole } from '@/types';

interface HeaderProps {
  currentStation: UserRole;
  onStationChange: (station: UserRole) => void;
  onToggleMobileSidebar: () => void;
  isSidebarOpen?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'warning' | 'info';
  read: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentStation, onToggleMobileSidebar, isSidebarOpen = false }) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Batch Sync Complete',
      message: 'New biometric enrollments synchronized from YMS 1 & Adika Youth.',
      time: 'Just now',
      type: 'success',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Audit Quality Verification',
      message: 'All 3:4 ID portrait alignments passed quality checks with 0% distortion.',
      time: '12m ago',
      type: 'info',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Hardware Lock Compliance',
      message: 'Terminal hardware lock policy enforced across all field stations.',
      time: '1h ago',
      type: 'warning',
      read: false
    }
  ]);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Night / Dark Mode State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sb_theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sb_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sb_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-[#141A22] border-b border-[#E2E8F0] dark:border-[#243041] flex items-center justify-between px-4 sm:px-6 gap-4 shadow-xs select-none transition-colors">
      {/* Left: Navigation Menu Toggle & Silicon Labs Logo Brand */}
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-xl border border-slate-200 dark:border-[#243041] hover:border-[#9EE617]/50 text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-[#9EE617] hover:bg-[#9EE617]/20 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-900 dark:text-slate-100" />
          </button>
        )}

        {/* Silicon Labs Logo & Brand Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0B1118] border border-slate-200 dark:border-[#243041] shadow-xs flex items-center justify-center p-1.5 transition-transform hover:scale-105">
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
              <span className="font-heading font-black text-sm tracking-tight text-black dark:text-white">
                SILICON
              </span>
              <span className="bg-[#9EE617] text-black text-[9px] font-black px-1.5 py-0.5 rounded leading-none shadow-xs">
                LABS
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none mt-0.5 hidden sm:block">
              StudentBridge Terminal
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Theme Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        {/* Night / Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border border-slate-200 dark:border-[#243041] bg-white dark:bg-[#141A22] text-slate-700 dark:text-[#9EE617] hover:border-[#85E510] flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
          title={isDark ? "Switch to Day / Light Mode" : "Switch to Night / Dark Mode"}
          aria-label="Toggle Night/Day Mode"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-[#9EE617] transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Notifications Icon with Working Interactive Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(prev => !prev)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              showNotifications
                ? 'border-[#85E510] bg-[#85E510]/15 text-black dark:text-[#9EE617]'
                : 'border-slate-200 dark:border-[#243041] bg-white dark:bg-[#141A22] text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-[#F8FAF9] dark:hover:bg-[#1E2633]'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs pointer-events-none">
              {unreadCount}
            </span>
          )}

          {/* Notification Popover Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#141A22] border border-slate-200 dark:border-[#243041] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 bg-[#F8FAF9] dark:bg-[#1A2330] border-b border-slate-200 dark:border-[#243041] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-black text-xs text-slate-900 dark:text-white tracking-tight">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-bold text-[#366804] dark:text-[#9EE617] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#243041] max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-[#1E2633] transition-colors ${
                        !n.read ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'success' ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : n.type === 'warning' ? (
                          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Info className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-tight">
                          {n.message}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeNotification(n.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1E2633] shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-[#1A2330] border-t border-slate-100 dark:border-[#243041] text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Station Network Connected &bull; Real-time Feed
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Account Profile with Initials */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#E2E8F0] dark:border-[#243041]">
          <div className="w-9 h-9 rounded-full bg-[#9EE617] text-black font-black flex items-center justify-center text-xs shadow-xs border border-[#9EE617]/50 shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="hidden sm:block text-left leading-none">
            <div className="text-xs font-black text-black dark:text-white leading-tight">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {roleDisplay}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all ml-1 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
