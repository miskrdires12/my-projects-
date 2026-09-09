"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Printer,
  Shield,
  LayoutDashboard,
  LogOut,
  Settings,
  Database,
  FileSpreadsheet,
  QrCode,
  Layers,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

interface DashboardShellProps {
  session: {
    username: string;
    role: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const role = session.role;
  const isSender = role === "SENDER";
  const isReceiver = role === "RECEIVER";
  const isAdmin = role === "ADMIN";

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <div className="flex flex-col h-full justify-between bg-white text-[#080808] font-sans">
      <div>
        {/* Brand Header with Silicon Labs Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[#dce7e1] px-5 bg-white">
          <Link href={isSender ? "/register" : "/dashboard"} className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7faf9] border border-[#dce7e1] p-1 shadow-xs group-hover:border-[#02f52b] transition-all">
              <img
                src="/logo.png"
                alt="Silicon Labs Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="font-mono text-sm font-extrabold tracking-tight text-[#080808] flex items-center gap-1">
                <span>SILICON</span>
                <span className="text-[#02f52b] bg-[#080808] px-1 rounded text-xs">LABS</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-mono font-semibold text-[#6b7771]">
                {isSender ? "Sender Workstation" : isReceiver ? "Receiver Facility" : "Admin Console"}
              </div>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-lg border border-[#dce7e1] text-[#3f4743] hover:text-[#080808] hover:border-[#080808] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-4 text-xs font-medium">
          {/* SENDER ENVIRONMENT — ONLY Student Registration & System Settings */}
          {isSender && (
            <div className="space-y-1.5">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#02f52b]" />
                <span>Sender Workstation</span>
              </div>

              <Link
                href="/register"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                  pathname === "/register"
                    ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                    : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Student Registration</span>
              </Link>

              <Link
                href="/settings"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                  pathname === "/settings"
                    ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                    : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>System Settings</span>
              </Link>
            </div>
          )}

          {/* RECEIVER & ADMIN ENVIRONMENT */}
          {!isSender && (
            <>
              {/* Dashboard */}
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/dashboard"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  <span>{isReceiver ? "Receiver Dashboard" : "Executive Overview"}</span>
                </Link>
              </div>

              {/* Operations */}
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] pb-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#02f52b]" />
                  <span>Student Operations</span>
                </div>

                <Link
                  href="/students"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/students"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Student Directory</span>
                </Link>

                <Link
                  href="/students/import"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/students/import"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span>Data Importer (Excel/CSV)</span>
                </Link>

                <Link
                  href="/students/qr-import"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/students/qr-import"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span>Import QR Codes</span>
                </Link>
              </div>

              {/* ID Studio & Production Tools */}
              <div className="space-y-1 pt-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#6b7771]">
                  ID Studio &amp; Printing
                </div>

                <Link
                  href="/designer"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/designer"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Canva ID Designer</span>
                </Link>

                <Link
                  href="/bulker"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/bulker"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <Printer className="h-4 w-4 shrink-0" />
                  <span>Bulker &amp; Templates</span>
                </Link>

                <Link
                  href="/print-engine"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/print-engine"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>8-Up A4 Print Engine</span>
                </Link>
              </div>

              {/* Admin tools */}
              {isAdmin && (
                <div className="space-y-1 pt-1">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#080808] font-bold flex items-center gap-1.5 border-b border-[#dce7e1] pb-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#02f52b]" />
                    <span>Administration</span>
                  </div>

                  <Link
                    href="/admin/users"
                    onClick={closeMobile}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                      pathname === "/admin/users"
                        ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                        : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                    }`}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Security &amp; Roles</span>
                  </Link>

                  <Link
                    href="/admin/database"
                    onClick={closeMobile}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                      pathname === "/admin/database"
                        ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                        : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                    }`}
                  >
                    <Database className="h-4 w-4 shrink-0" />
                    <span>Database &amp; Logs</span>
                  </Link>
                </div>
              )}

              {/* Settings */}
              <div className="pt-2 border-t border-[#dce7e1]">
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all ${
                    pathname === "/settings"
                      ? "bg-[#02f52b] text-[#080808] font-bold shadow-[0_0_12px_rgba(2,245,43,0.3)] scale-[1.01]"
                      : "text-[#3f4743] hover:bg-[#eef5f1] hover:text-[#080808]"
                  }`}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  <span>System Settings</span>
                </Link>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* User Identity & Sign Out Footer */}
      <div className="border-t border-[#dce7e1] p-4 bg-[#f7faf9]">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate pr-1">
            <div className="text-xs font-bold text-[#080808] truncate font-mono">{session.username}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#02f52b]" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-[#6b7771]">
                {isSender ? "SENDER STATION" : isReceiver ? "RECEIVER FACILITY" : "ADMINISTRATOR"}
              </span>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] bg-white px-2.5 py-1.5 text-xs font-mono font-semibold text-[#080808] hover:bg-[#080808] hover:text-[#02f52b] hover:border-[#080808] transition-all shadow-2xs active:scale-95"
              title="Sign out session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f7faf9] text-[#080808]">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 border-r border-[#dce7e1] bg-white flex-col justify-between overflow-y-auto shadow-sm">
        {navContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#080808]/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeMobile}
          />
          {/* Sidebar Drawer */}
          <aside className="relative z-50 w-72 max-w-[85vw] h-full border-r border-[#dce7e1] bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="md:pl-64 pl-0 flex-1 flex flex-col min-w-0 bg-[#f7faf9]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#dce7e1] bg-white/95 backdrop-blur-md px-4 sm:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger Button on Phone/Mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl border border-[#dce7e1] text-[#080808] hover:bg-[#eef5f1] transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Operational Status Badge */}
            <span className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase border border-[#dce7e1] bg-[#f7faf9] text-[#080808]">
              <span className="h-2 w-2 rounded-full bg-[#02f52b] animate-pulse" />
              <span>
                {isSender
                  ? "SENDER STATION"
                  : isReceiver
                  ? "RECEIVER FACILITY"
                  : "ADMINISTRATIVE CONSOLE"}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isSender && (
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#02f52b] text-[#080808] px-3.5 py-1.5 text-xs font-bold hover:bg-[#00dc25] transition-all shadow-[0_0_12px_rgba(2,245,43,0.3)] active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Enroll Student</span>
                <span className="sm:hidden">Enroll</span>
              </Link>
            )}

            {isReceiver && (
              <Link
                href="/print-engine"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#02f52b] text-[#080808] px-3.5 py-1.5 text-xs font-bold hover:bg-[#00dc25] transition-all shadow-[0_0_12px_rgba(2,245,43,0.3)] active:scale-95"
              >
                <Printer className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">8-Up Print Engine</span>
                <span className="sm:hidden">Print</span>
              </Link>
            )}

            {/* Header User Identity & 1-Click Logout Action */}
            <div className="flex items-center gap-2 border-l border-[#dce7e1] pl-2.5">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold font-mono text-[#080808] leading-tight truncate max-w-[120px]">
                  {session.username}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#6b7771]">
                  {isAdmin ? "Admin" : isSender ? "Sender" : "Receiver"}
                </span>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] bg-[#f7faf9] px-3 py-1.5 text-xs font-mono font-semibold text-[#080808] hover:bg-[#080808] hover:text-[#02f52b] hover:border-[#080808] transition-all shadow-2xs active:scale-95"
                  title="Sign Out Session"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#f7faf9]">{children}</main>
      </div>
    </div>
  );
}
