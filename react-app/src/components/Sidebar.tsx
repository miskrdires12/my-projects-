import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, CreditCard, Printer, Layers, Settings,
  UserPlus, LayoutGrid, CheckSquare, BarChart2,
  ShieldCheck, Smartphone, RefreshCw, Database,
  HardDrive, Activity, User as UserIcon, AlertTriangle,
  Send, Inbox, Shield, Sparkles, ChevronDown, ChevronRight
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
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Super Admin view filter tab: 'ALL' | 'RECEIVER' | 'SENDER' | 'ADMIN' | 'SUPER_ADMIN'
  const [superFilter, setSuperFilter] = useState<'ALL' | 'RECEIVER' | 'SENDER' | 'ADMIN' | 'SUPER_ADMIN'>('ALL');

  const receiverItems = [
    { to: '/receiver/students', label: 'Student Directory', icon: Users, exact: true },
    { to: '/receiver/id-production', label: 'ID Card Designer', icon: CreditCard },
    { to: '/receiver/review', label: 'Print Engine', icon: Printer },
    { to: '/receiver/exports', label: 'Bulk Operations', icon: Layers },
    { to: '/receiver/mistakes', label: 'Mistake Analyzer', icon: AlertTriangle },
    { to: '/receiver/settings', label: 'Settings', icon: Settings },
  ];

  const senderItems = [
    { to: '/sender/register', label: 'Register Student', icon: UserPlus },
    { to: '/sender/settings', label: 'Settings', icon: Settings },
  ];

  const adminItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/admin/senders', label: 'Sender Management', icon: Users },
    { to: '/admin/tasks', label: 'Task Management', icon: CheckSquare },
    { to: '/admin/reviews', label: 'Quality Reviews', icon: ShieldCheck },
    { to: '/admin/performance', label: 'Performance Analytics', icon: BarChart2 },
    { to: '/admin/reports', label: 'Reports', icon: Layers },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const superAdminExclusiveItems = [
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

  const renderNavGroup = (title: string, items: typeof receiverItems, badgeColor: string) => {
    return (
      <div className="space-y-1 mb-4">
        <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#64748B]">
          <span>{title}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
        </div>
        {items.map((item) => {
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
              className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#85E510] text-[#062404] shadow-xs'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#131E2B]'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#062404]' : 'text-[#64748B]'}`} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    );
  };

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
        <div className="h-16 flex items-center px-5 border-b border-[#1E293B] gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#85E510] flex items-center justify-center p-1 text-[#062404] shadow-xs">
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
        <div className="p-3.5 border-b border-[#1E293B]/80 shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#131E2B] border border-[#1E2D3D]">
            <div className="w-8 h-8 rounded-full bg-[#85E510] text-[#062404] flex items-center justify-center font-bold shrink-0 shadow-xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white leading-tight truncate">
                {isSuperAdmin ? 'Super Administrator' : (currentStation === 'RECEIVER' ? 'Receiver Station' : currentStation.replace('_', ' '))}
              </div>
              <div className="text-[10px] text-[#94A3B8] font-medium leading-tight truncate mt-0.5">
                {isSuperAdmin ? 'Full System Omnipresence' : (currentStation === 'RECEIVER' ? 'Review • Manage • Produce' : 'Active Workstation')}
              </div>
            </div>
          </div>

          {/* Super Admin Station Category Filter Tabs */}
          {isSuperAdmin && (
            <div className="grid grid-cols-5 gap-1 mt-2.5 p-1 bg-[#080D13] border border-[#1E293B] rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setSuperFilter('ALL')}
                className={`py-1 text-center rounded-lg transition-all ${superFilter === 'ALL' ? 'bg-[#85E510] text-[#062404]' : 'text-[#64748B] hover:text-white'}`}
                title="All Operations"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSuperFilter('RECEIVER')}
                className={`py-1 text-center rounded-lg transition-all ${superFilter === 'RECEIVER' ? 'bg-[#85E510] text-[#062404]' : 'text-[#64748B] hover:text-white'}`}
                title="Receiver Features"
              >
                Recv
              </button>
              <button
                type="button"
                onClick={() => setSuperFilter('SENDER')}
                className={`py-1 text-center rounded-lg transition-all ${superFilter === 'SENDER' ? 'bg-[#85E510] text-[#062404]' : 'text-[#64748B] hover:text-white'}`}
                title="Sender Features"
              >
                Send
              </button>
              <button
                type="button"
                onClick={() => setSuperFilter('ADMIN')}
                className={`py-1 text-center rounded-lg transition-all ${superFilter === 'ADMIN' ? 'bg-[#85E510] text-[#062404]' : 'text-[#64748B] hover:text-white'}`}
                title="Admin Features"
              >
                Adm
              </button>
              <button
                type="button"
                onClick={() => setSuperFilter('SUPER_ADMIN')}
                className={`py-1 text-center rounded-lg transition-all ${superFilter === 'SUPER_ADMIN' ? 'bg-[#85E510] text-[#062404]' : 'text-[#64748B] hover:text-white'}`}
                title="Super Admin Features"
              >
                Ctrl
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          {/* If Super Admin, show combined features */}
          {isSuperAdmin ? (
            <>
              {(superFilter === 'ALL' || superFilter === 'SUPER_ADMIN') &&
                renderNavGroup('Super Admin Master Suite', superAdminExclusiveItems, 'bg-purple-500')}

              {(superFilter === 'ALL' || superFilter === 'RECEIVER') &&
                renderNavGroup('Receiver Operations', receiverItems, 'bg-emerald-400')}

              {(superFilter === 'ALL' || superFilter === 'SENDER') &&
                renderNavGroup('Sender Operations', senderItems, 'bg-blue-400')}

              {(superFilter === 'ALL' || superFilter === 'ADMIN') &&
                renderNavGroup('Admin Oversight', adminItems, 'bg-amber-400')}
            </>
          ) : (
            <>
              {currentStation === 'RECEIVER' && renderNavGroup('Receiver Menu', receiverItems, 'bg-[#85E510]')}
              {currentStation === 'SENDER' && renderNavGroup('Sender Menu', senderItems, 'bg-[#85E510]')}
              {currentStation === 'ADMIN' && renderNavGroup('Admin Menu', adminItems, 'bg-[#85E510]')}
            </>
          )}
        </nav>

        {/* Bottom Station Status Card */}
        <div className="p-3.5 border-t border-[#1E293B] bg-[#080D13] shrink-0">
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
