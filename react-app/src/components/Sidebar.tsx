import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, CreditCard, Printer, Layers, Settings,
  UserPlus, LayoutGrid, CheckSquare, BarChart2,
  Smartphone, HardDrive, Activity, AlertTriangle,
  Send, Inbox, Shield, Sparkles, LogOut, Database
} from 'lucide-react';
import { UserRole } from '@/types';
import { getCurrentUser, setCurrentUser } from '@/lib/store';

interface SidebarProps {
  currentStation: UserRole;
  onStationChange?: (station: UserRole) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  desktopOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentStation,
  onStationChange,
  mobileOpen,
  onCloseMobile,
  desktopOpen = true
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Navigation station tab (Receiver, Sender, Admin, Super Admin)
  const [activeStationTab, setActiveStationTab] = useState<UserRole>(
    isSuperAdmin ? (currentStation || 'RECEIVER') : (user?.role || 'RECEIVER')
  );

  const handleStationClick = (role: UserRole) => {
    setActiveStationTab(role);
    if (onStationChange) {
      onStationChange(role);
    }
    // Navigate to primary route for chosen section if not already on it
    if (role === 'RECEIVER' && !location.pathname.startsWith('/receiver')) {
      navigate('/receiver/students');
    } else if (role === 'SENDER' && !location.pathname.startsWith('/sender')) {
      navigate('/sender/register');
    } else if (role === 'ADMIN' && !location.pathname.startsWith('/admin')) {
      navigate('/admin/dashboard');
    } else if (role === 'SUPER_ADMIN' && !location.pathname.startsWith('/super-admin')) {
      navigate('/super-admin/dashboard');
    }
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
  const displayRole = user?.role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Super Admin');

  // Exact Receiver Operations
  const receiverItems = [
    { to: '/receiver/students', label: 'Student Directory', icon: Users },
    { to: '/receiver/id-production', label: 'ID Card Designer & Studio', icon: CreditCard },
    { to: '/receiver/review', label: 'Print Engine', icon: Printer },
    { to: '/receiver/exports', label: 'Bulk Operations & Exports', icon: Layers },
    { to: '/receiver/mistakes', label: 'Mistake Analyzer', icon: AlertTriangle },
    { to: '/receiver/settings', label: 'Receiver Settings', icon: Settings },
  ];

  // Exact Sender Operations
  const senderItems = [
    { to: '/sender/register', label: 'Register Student', icon: UserPlus },
    { to: '/sender/settings', label: 'Sender Settings', icon: Settings },
  ];

  // Exact Admin Oversight
  const adminItems = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutGrid },
    { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare },
    { to: '/admin/senders', label: 'Sender Monitoring', icon: Users },
    { to: '/admin/performance', label: 'Performance Analytics', icon: BarChart2 },
    { to: '/admin/reports', label: 'Reports', icon: Layers },
    { to: '/admin/settings', label: 'Admin Settings', icon: Settings },
  ];

  // Super Admin Exclusive Master Suite
  const superAdminExclusiveItems = [
    { to: '/super-admin/dashboard', label: 'Root Dashboard', icon: LayoutGrid },
    { to: '/super-admin/users', label: 'User & Role Management', icon: Users },
    { to: '/super-admin/devices', label: 'Hardware Lock & Devices', icon: Smartphone },
    { to: '/super-admin/schools', label: 'School & Location Mgmt', icon: Layers },
    { to: '/super-admin/tasks', label: 'Global Task Oversight', icon: CheckSquare },
    { to: '/super-admin/reports', label: 'Enterprise Analytics', icon: BarChart2 },
    { to: '/super-admin/database', label: 'Database Control Room', icon: Database },
    { to: '/super-admin/storage', label: 'R2 Storage Diagnostics', icon: HardDrive },
    { to: '/super-admin/audit-logs', label: 'Global Audit Logs', icon: Activity },
    { to: '/super-admin/settings', label: 'System Configuration', icon: Settings },
  ];

  // Navigation stations with icons stacked on top of labels
  const navStations = [
    { id: 'RECEIVER' as UserRole, label: 'Receiver', icon: Inbox },
    { id: 'SENDER' as UserRole, label: 'Sender', icon: Send },
    { id: 'ADMIN' as UserRole, label: 'Admin', icon: Shield },
    { id: 'SUPER_ADMIN' as UserRole, label: 'Super Admin', icon: Sparkles },
  ];

  const currentItems = activeStationTab === 'RECEIVER'
    ? receiverItems
    : (activeStationTab === 'SENDER'
      ? senderItems
      : (activeStationTab === 'ADMIN' ? adminItems : superAdminExclusiveItems));

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r border-[#E2E8F0] flex flex-col transition-all duration-300 select-none ${
          desktopOpen ? 'lg:translate-x-0 lg:w-64' : 'lg:-translate-x-full lg:w-0 lg:overflow-hidden'
        } ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full w-64'}`}
      >
        {/* Brand Header with Silicon Labs Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#E2E8F0] gap-3 shrink-0 bg-white">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1.5 transition-transform hover:scale-105 shrink-0">
            <img
              src="/logo.png"
              alt="Silicon Labs"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/brand-logo.png';
              }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-heading font-black text-sm tracking-tight text-black">
                SILICON
              </span>
              <span className="bg-[#9EE617] text-black text-[9px] font-black px-1.5 py-0.5 rounded leading-none shadow-xs">
                LABS
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 tracking-tight leading-none mt-1">
              StudentBridge
            </span>
          </div>
        </div>

        {/* Station Navigation Selector: Icon is stacked ON TOP of section label */}
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAF9] shrink-0">
          <div className="grid grid-cols-4 gap-1 p-1 bg-white border border-[#E2E8F0] rounded-xl shadow-xs">
            {navStations.map((st) => {
              const StIcon = st.icon;
              const isActive = activeStationTab === st.id;
              // If user is not super admin and cannot access admin/super_admin, can still show or disable
              const isAllowed = isSuperAdmin || user?.role === st.id || (user?.role === 'ADMIN' && st.id !== 'SUPER_ADMIN');

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => isAllowed && handleStationClick(st.id)}
                  disabled={!isAllowed}
                  title={st.label}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#9EE617] text-black shadow-xs font-black'
                      : (isAllowed ? 'text-slate-600 hover:text-black hover:bg-slate-50' : 'opacity-40 cursor-not-allowed text-slate-400')
                  }`}
                >
                  <StIcon className={`w-4 h-4 mb-1 shrink-0 ${isActive ? 'text-black stroke-[2.5]' : 'text-slate-500'}`} />
                  <span className="text-[9px] font-bold leading-tight truncate w-full text-center">
                    {st.label === 'Super Admin' ? 'Super' : st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Links for Active Section */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1 bg-white">
          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            <span>{activeStationTab.replace('_', ' ')} OPERATIONS</span>
            <span className="w-2 h-2 rounded-full bg-[#9EE617]" />
          </div>

          {currentItems.map((item) => {
            const Icon = item.icon;
            const isStudentsDirectory = item.to === '/receiver/students';
            const isActive = isStudentsDirectory
              ? location.pathname.startsWith('/receiver/students') || location.pathname === '/receiver/dashboard' || location.pathname === '/receiver'
              : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#9EE617] text-black shadow-xs font-black'
                    : 'text-slate-700 hover:text-black hover:bg-[#F8FAF9]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black stroke-[2.5]' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Account Profile Card at Bottom: Initials Avatar (MI), Username (miskrdires11), Role (Super Admin), and Logout */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAF9] shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#E2E8F0] shadow-xs mb-2">
            <div className="w-9 h-9 rounded-full bg-[#9EE617] text-black font-black flex items-center justify-center text-xs shadow-xs border border-[#9EE617]/40 shrink-0">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-black leading-tight truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold leading-tight truncate mt-0.5">
                {displayRole}
              </div>
            </div>
          </div>

          {/* Logout Button directly under Account Card */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-[#E2E8F0] hover:border-rose-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Log out of terminal"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
