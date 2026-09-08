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
  FolderArchive,
  Boxes,
  Download,
  Layers,
  Sparkles,
  Receipt,
  Camera,
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
    <div className="flex flex-col h-full justify-between bg-white text-black font-sans">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-black text-white shadow-xs">
              {isSender ? (
                <Camera className="h-5 w-5" />
              ) : isReceiver ? (
                <Printer className="h-5 w-5" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="font-mono text-sm font-bold tracking-tight text-black">
                STUDENT <span className="underline decoration-1">BRIDGE</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-mono font-semibold text-neutral-500">
                {isSender
                  ? "Sender Workstation"
                  : isReceiver
                  ? "Receiver Facility (20k)"
                  : "Administration Console"}
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={closeMobile}
            className="md:hidden p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-black hover:border-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-4 text-xs font-medium">
          {/* Main Dashboard */}
          <div className="space-y-1">
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                pathname === "/dashboard"
                  ? "bg-black text-white font-semibold shadow-xs"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>
                {isSender
                  ? "Sender Dashboard"
                  : isReceiver
                  ? "Production Dashboard"
                  : "Executive Overview"}
              </span>
            </Link>
          </div>

          {/* SENDER ENVIRONMENT */}
          {(isSender || isAdmin) && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black font-bold flex items-center gap-1.5 border-b border-neutral-100 pb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
                <span>Sender Enrollment Hub</span>
              </div>

              <Link
                href="/register"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/register"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                <span>Student Registration</span>
              </Link>

              <Link
                href="/students"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/students"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Student Directory</span>
              </Link>

              <Link
                href="/sender/photo-import"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/sender/photo-import"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <FolderArchive className="h-4 w-4 shrink-0" />
                <span>Directory Photo Import</span>
              </Link>

              <Link
                href="/sender/batches"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/sender/batches"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Boxes className="h-4 w-4 shrink-0" />
                <span>Transfer Batches</span>
              </Link>

              <Link
                href="/sender/receipts"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/sender/receipts"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Receipt className="h-4 w-4 shrink-0" />
                <span>Enrollment Receipts</span>
              </Link>
            </div>
          )}

          {/* RECEIVER ENVIRONMENT */}
          {(isReceiver || isAdmin) && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black font-bold flex items-center gap-1.5 border-b border-neutral-100 pb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
                <span>Receiver Production Facility</span>
              </div>


              <Link
                href="/students"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/students"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Student Directory (20k)</span>
              </Link>

              <Link
                href="/students/import"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/students/import"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>Data Importer (Excel/CSV)</span>
              </Link>

              <Link
                href="/students/qr-import"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/students/qr-import"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span>Import QR Codes</span>
              </Link>

              <Link
                href="/students/download-photos"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/students/download-photos"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>Download Photos (.zip)</span>
              </Link>

              {/* ID Studio & Production Tools */}
              <div className="pt-2">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  ID Studio & Imposition
                </div>

                <Link
                  href="/designer"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    pathname === "/designer"
                      ? "bg-black text-white font-semibold shadow-xs"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span>Canva ID Designer</span>
                </Link>

                <Link
                  href="/bulker"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    pathname === "/bulker"
                      ? "bg-black text-white font-semibold shadow-xs"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <Printer className="h-4 w-4 shrink-0" />
                  <span>Bulker & Templates</span>
                </Link>

                <Link
                  href="/print-engine"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    pathname === "/print-engine"
                      ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>8-Up A4 Print Engine</span>
                </Link>
              </div>
            </div>
          )}

          {/* ADMIN */}
          {isAdmin && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black font-bold flex items-center gap-1.5 border-b border-neutral-100 pb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
                <span>Administration</span>
              </div>

              <Link
                href="/admin/users"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/admin/users"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>Security & Roles</span>
              </Link>

              <Link
                href="/admin/database"
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === "/admin/database"
                    ? "bg-black text-white font-semibold shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Database className="h-4 w-4 shrink-0" />
                <span>Database & Logs</span>
              </Link>
            </div>
          )}

          {/* Settings */}
          <div className="pt-2 border-t border-neutral-200">
            <Link
              href="/settings"
              onClick={closeMobile}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                pathname === "/settings"
                  ? "bg-black text-white font-semibold shadow-xs"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>System Settings</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* User Identity & Sign Out */}
      <div className="border-t border-neutral-200 p-4 bg-neutral-50">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-black truncate font-mono">{session.username}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full bg-black" />
              <span className="text-[9px] font-mono uppercase font-bold tracking-wider text-neutral-600">
                {isSender
                  ? "SENDER STATION"
                  : isReceiver
                  ? "RECEIVER FACILITY"
                  : "ADMINISTRATOR"}
              </span>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-200 hover:text-black transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white text-black">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 border-r border-neutral-200 bg-white flex-col justify-between overflow-y-auto">
        {navContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={closeMobile}
          />
          {/* Sidebar Drawer */}
          <aside className="relative z-50 w-72 max-w-[80vw] h-full border-r border-neutral-200 bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="md:pl-64 pl-0 flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/95 backdrop-blur-sm px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger Button on Phone/Mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg border border-neutral-200 text-black hover:bg-neutral-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Operational Status Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase border border-black bg-neutral-100 text-black">
              <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
              {isSender
                ? "SENDER STATION / CAPTURE ACTIVE"
                : isReceiver
                ? "RECEIVER FACILITY / 20,000+ RECORDS"
                : "SYSTEM ADMINISTRATIVE CONSOLE"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isSender && (
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Enroll Student</span>
                <span className="sm:hidden">Enroll</span>
              </Link>
            )}

            {isReceiver && (
              <Link
                href="/print-engine"
                className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">8-Up Print Engine</span>
                <span className="sm:hidden">Print</span>
              </Link>
            )}

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-[11px] font-mono text-neutral-600">
              <span className="h-2 w-2 rounded-full bg-black" />
              <span>ONLINE</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
}
