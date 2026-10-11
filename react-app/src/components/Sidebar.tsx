import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, CreditCard, Printer, Layers, Settings,
  UserPlus, LayoutGrid, CheckSquare, BarChart2,
  ShieldCheck, Smartphone, RefreshCw, Database,
  HardDrive, Activity, User as UserIcon
} from 'lucide-react';
import { UserRole } from '@/types';
import { getCurrentUser } from '@/lib/store';

interface SidebarProps {
  currentStation: UserRole;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentStation, mobileOpen, onCloseMobile }) => {
  const location = useLocation();
  const user = getCurrentUser();

  const getNavItems = () => {
    switch (currentStation) {
      case 'RECEIVER':
        return [
          { to: '/receiver/students', label: 'Student Directory', icon: Users, exact: true },
          { to: '/receiver/id-production', label: 'ID Card Designer', icon: CreditCard },
          { to: '/receiver/review', label: 'Print Engine', icon: Printer },
          { to: '/receiver/exports', label: 'Bulk Operations', icon: Layers },
          { to: '/receiver/settings', label: 'Settings', icon: Settings },
        ];
      case 'SENDER':
        return [
          { to: '/sender/register', label: 'Register Student', icon: UserPlus },
          { to: '/sender/settings', label: 'Settings', icon: Settings },
        ];
      case 'ADMIN':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
          { to: '/admin/senders', label: 'Sender Management', icon: Users },
          { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare },
          { to: '/admin/reviews', label: 'Quality Reviews', icon: ShieldCheck },
          { to: '/admin/performance', label: 'Performance Analytics', icon: BarChart2 },
          { to: '/admin/reports', label: 'Reports', icon: Layers },
          { to: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      case 'SUPER_ADMIN':
        return [
          { to: '/super-admin/dashboard', label: 'Global Dashboard', icon: LayoutGrid },
          { to: '/super-admin/users', label: 'User & Role Management', icon: Users },
          { to: '/super-admin/devices', label: 'Device Management', icon: Smartphone },
          { to: '/super-admin/schools', label: 'School & Location Mgmt', icon: Layers },
          { to: '/super-admin/tasks', label: 'Task Oversight', icon: CheckSquare },
          { to: '/super-admin/reports', label: 'Global Reports & Analytics', icon: BarChart2 },
          { to: '/super-admin/integrations', label: 'StudentCore Integration', icon: RefreshCw },
          { to: '/super-admin/database', label: 'Database Control Room', icon: Database },
          { to: '/super-admin/storage', label: 'Storage & Photo Diagnostics', icon: HardDrive },
          { to: '/super-admin/audit-logs', label: 'Audit Logs', icon: Activity },
          { to: '/super-admin/settings', label: 'System Settings', icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-[#0B1118] border-r border-[#1E293B] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-[#1E293B] gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#85E510] flex items-center justify-center p-1 text-[#062404] shadow-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <rect x="3" y="3" width="8" height="8" rx="2" />
              <rect x="13" y="3" width="8" height="8" rx="2" fillOpacity="0.8" />
              <rect x="3" y="13" width="8" height="8" rx="2" fillOpacity="0.8" />
              <rect x="13" y="13" width="8" height="8" rx="2" />
            </svg>
          </div>
          <span className="font-heading font-black text-lg tracking-tight text-white">
            StudentBridge
          </span>
        </div>

        {/* Station User Profile Card */}
        <div className="p-4 border-b border-[#1E293B]/80">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#131E2B] border border-[#1E2D3D]">
            <div className="w-9 h-9 rounded-full bg-[#85E510] text-[#062404] flex items-center justify-center font-bold shrink-0 shadow-xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white leading-tight truncate">
                {currentStation === 'RECEIVER' ? 'Receiver' : currentStation.replace('_', ' ')}
              </div>
              <div className="text-[11px] text-[#94A3B8] font-medium leading-tight truncate mt-0.5">
                {currentStation === 'RECEIVER' ? 'Review • Manage • Produce' : 'Active Workstation'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isStudentsDirectory = item.label === 'Student Directory';
            const isActive = isStudentsDirectory
              ? location.pathname.startsWith('/receiver/students') || location.pathname === '/receiver/dashboard' || location.pathname === '/receiver'
              : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#85E510] text-[#062404] shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#131E2B]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#062404]' : 'text-[#64748B]'}`} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Station Status Card */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D13]">
          <div className="flex items-start gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#85E510] mt-1 shrink-0 animate-pulse shadow-[0_0_8px_#85E510]" />
            <div className="min-w-0">
              <div className="text-xs font-black text-white leading-tight">
                System Online
              </div>
              <div className="text-[10px] text-[#64748B] font-mono leading-tight mt-0.5 truncate">
                Connected to Supabase & R2
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
