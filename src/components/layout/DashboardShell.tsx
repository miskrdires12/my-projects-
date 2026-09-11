"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Printer,
  Shield,
  LayoutDashboard,
  Settings,
  Database,
  Sparkles,
  X,
  Sun,
  RotateCcw,
} from "lucide-react";
import { purgeSensitiveClientStorage } from "@/lib/idb-storage";

interface DashboardShellProps {
  session: {
    username: string;
    role: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  // Dark / Night mode initialization
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("sb_theme");
      if (savedTheme === "dark") {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sb_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sb_theme", "light");
    }
  };

  const role = session.role;
  const isSender = role === "SENDER";
  const isReceiver = role === "RECEIVER";
  const isAdmin = role === "ADMIN";

  const closeMenu = () => setMenuOpen(false);

  const navContent = (
    <div className="flex flex-col h-full justify-between bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4] font-sans transition-colors duration-200">
      <div>
        {/* Brand Header with Silicon Labs Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#dce7e1] dark:border-[#26332b] px-5 bg-white dark:bg-[#161c18]">
          <Link href={isSender ? "/register" : "/dashboard"} onClick={closeMenu} className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7faf9] dark:bg-[#1c2420] border border-[#dce7e1] dark:border-[#26332b] p-1 shadow-xs group-hover:border-[#8fe617] transition-all">
              <img
                src="/logo.png"
                alt="Silicon Labs Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="font-mono text-sm font-extrabold tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1">
                <span>SILICON</span>
                <span className="text-[#080808] bg-[#8fe617] px-1 rounded text-xs font-black">LABS</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-mono font-semibold text-[#6b7771] dark:text-[#8a9e93]">
                {isSender ? "Sender Workstation" : isReceiver ? "Receiver Facility" : "Admin Console"}
              </div>
            </div>
          </Link>

          {/* Close button */}
          <button
            type="button"
            onClick={closeMenu}
            className="p-1.5 rounded-lg border border-[#dce7e1] dark:border-[#26332b] text-[#3f4743] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:border-[#8fe617] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-4 text-xs font-medium">
          {/* SENDER ENVIRONMENT — Registration & System Settings */}
          {isSender && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] dark:border-[#26332b] pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                <span>Sender Workstation</span>
              </div>

              <Link
                href="/register"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/register"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Student Registration</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/settings"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Station Settings</span>
              </Link>
            </div>
          )}

          {/* RECEIVER ENVIRONMENT */}
          {isReceiver && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] dark:border-[#26332b] pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                <span>Receiver Station</span>
              </div>

              <Link
                href="/dashboard"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/dashboard"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Live Metrics</span>
              </Link>

              <Link
                href="/students"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/students"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Student Directory</span>
              </Link>

              <Link
                href="/print-engine"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/print-engine"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print Engine (8-Up)</span>
              </Link>

              <Link
                href="/designer"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/designer"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Badge Designer</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/settings"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>System Settings</span>
              </Link>
            </div>
          )}

          {/* ADMIN ENVIRONMENT */}
          {isAdmin && (
            <div className="space-y-1.5 pt-2 border-t border-[#dce7e1] dark:border-[#26332b]">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5 pb-1">
                <Shield className="h-3 w-3 text-[#8fe617]" />
                <span>Administrator</span>
              </div>

              <Link
                href="/dashboard"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/dashboard"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/admin/users"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/admin/users"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>Security & Roles</span>
              </Link>

              <Link
                href="/admin/database"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/admin/database"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Database className="h-4 w-4 shrink-0" />
                <span>Database Manager</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all cool-btn-hover ${
                  pathname === "/settings"
                    ? "bg-[#8fe617] text-[#062404] font-bold shadow-[0_0_15px_rgba(143,230,23,0.35)] scale-[1.01]"
                    : "text-[#3f4743] dark:text-[#a4b8ad] hover:bg-[#eef5f1] dark:hover:bg-[#1c2420] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>System Settings</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Profile & Sign Out Footer in Drawer */}
      <div className="border-t border-[#dce7e1] dark:border-[#26332b] p-4 bg-[#f7faf9] dark:bg-[#1c2420]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold font-mono text-[#080808] dark:text-[#f2f7f4] leading-tight truncate max-w-[130px]">
              {session.username}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#8fe617]" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-[#6b7771] dark:text-[#8a9e93]">
                {isSender ? "Station Active" : isReceiver ? "Production" : "Administrator"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await purgeSensitiveClientStorage();
              } catch {}
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-2.5 py-1.5 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Clear cache and reload session"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7faf9] dark:bg-[#070908] text-[#080808] dark:text-[#f2f7f4] transition-colors duration-200">
      
      {/* Clickable Smooth-Slicing Menu Drawer (Not Sticky/Fixed) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop with smooth fade */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeMenu}
          />
          {/* Smooth Slicing Drawer Panel */}
          <aside className="relative z-50 w-72 max-w-[85vw] h-full border-r border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] shadow-2xl animate-in slide-in-from-left duration-250 ease-out">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Full-Screen Layout */}
      <div className="flex flex-col min-w-0 min-h-screen">
        
        {/* Unpinned Header (Natural scrolling, not rigidly sticky/fixed) */}
        <header className="flex h-14 items-center justify-between border-b border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-4 sm:px-6 shadow-xs transition-colors duration-200">
          
          <div className="flex items-center gap-3">
            {/* Advanced Animated Menu Icon Button (Icon Only, Standard Touch Size) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="h-10 w-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#111613] hover:border-[#8fe617] hover:bg-[#8fe617]/10 hover:shadow-[0_0_16px_rgba(143,230,23,0.35)] transition-all duration-300 group cursor-pointer animated-icon-btn shrink-0"
              aria-label="Open navigation menu"
              title="Navigation Menu"
            >
              <span className="h-0.5 w-5 rounded-full bg-[#080808] dark:bg-[#f2f7f4] group-hover:bg-[#8fe617] group-hover:w-3.5 group-hover:-translate-x-0.5 transition-all duration-300" />
              <span className="h-0.5 w-5 rounded-full bg-[#8fe617] group-hover:scale-x-110 transition-all duration-300" />
              <span className="h-0.5 w-5 rounded-full bg-[#080808] dark:bg-[#f2f7f4] group-hover:bg-[#8fe617] group-hover:w-3.5 group-hover:translate-x-0.5 transition-all duration-300" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Turning Sun-Only Theme Toggle (Deep Dark in Night Mode, Zero White) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all duration-300 animated-icon-btn cursor-pointer ${
                isDarkMode
                  ? "border-[#223126] bg-[#070908] text-[#8fe617] hover:border-[#8fe617] hover:shadow-[0_0_15px_rgba(143,230,23,0.3)]"
                  : "border-[#dce7e1] bg-[#f7faf9] text-amber-500 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]"
              }`}
              title={isDarkMode ? "Night Mode Active (Click to rotate to Light Studio)" : "Light Studio Active (Click to rotate to Night Mode)"}
              aria-label="Toggle theme"
            >
              <Sun
                className={`h-5 w-5 sun-turn-icon transform ${
                  isDarkMode
                    ? "rotate-180 text-[#8fe617] fill-[#8fe617]/20"
                    : "rotate-0 text-amber-500 hover:rotate-90 fill-amber-400/20"
                }`}
              />
            </button>

            {/* Sender New Registration Action Button (No 'Enroll') */}
            {isSender && (
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8fe617] text-[#062404] px-3.5 py-1.5 text-xs font-bold hover:bg-[#7ecc10] transition-all shadow-[0_0_15px_rgba(143,230,23,0.35)] cool-btn-hover active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Register Student</span>
                <span className="sm:hidden">Register</span>
              </Link>
            )}

            {isReceiver && (
              <Link
                href="/print-engine"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#8fe617] text-[#062404] px-3.5 py-1.5 text-xs font-bold hover:bg-[#7ecc10] transition-all shadow-[0_0_15px_rgba(143,230,23,0.35)] cool-btn-hover active:scale-95"
              >
                <Printer className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">8-Up Print Engine</span>
                <span className="sm:hidden">Print</span>
              </Link>
            )}

            {/* Header User Identity & Active Status Indicator */}
            <div className="flex items-center gap-2 border-l border-[#dce7e1] dark:border-[#223126] pl-2.5">
              <div className="flex items-center gap-1.5 text-right bg-[#f7faf9] dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
                <span className="text-xs font-bold font-mono text-[#080808] dark:text-[#f2f7f4] leading-tight truncate max-w-[140px]">
                  {session.username}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with Full Width */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-[#f7faf9] dark:bg-[#070908] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
