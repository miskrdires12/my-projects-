import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  Inbox,
  Sparkles,
  Receipt,
  Camera,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const role = session.role;
  const isSender = role === "SENDER";
  const isReceiver = role === "RECEIVER";
  const isAdmin = role === "ADMIN";

  return (
    <div className="flex min-h-screen bg-black text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Brand Header */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-6">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                isSender
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isReceiver
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-surface-secondary border-border text-accent"
              } shadow-glow-sm`}
            >
              {isSender ? (
                <Camera className="h-5 w-5" />
              ) : isReceiver ? (
                <Printer className="h-5 w-5" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="font-mono text-sm font-bold tracking-tight text-foreground">
                STUDENT <span className="text-accent">BRIDGE</span>
              </div>
              <div
                className={`text-[9px] uppercase tracking-wider font-semibold ${
                  isSender
                    ? "text-emerald-400"
                    : isReceiver
                    ? "text-blue-400"
                    : "text-amber-400"
                }`}
              >
                {isSender
                  ? "Sender Workstation"
                  : isReceiver
                  ? "Receiver Facility (20k)"
                  : "Admin Unified Console"}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-4 text-xs font-medium">
            {/* Overview / Main Hub */}
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-accent" />
                <span>
                  {isSender
                    ? "Sender Dashboard"
                    : isReceiver
                    ? "Production Dashboard"
                    : "Command Dashboard"}
                </span>
              </Link>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SENDER OPERATIONAL ENVIRONMENT (VISIBLE ONLY TO SENDER & ADMIN) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {(isSender || isAdmin) && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Sender Enrollment Hub</span>
                </div>

                <Link
                  href="/register"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                  <span>Student Registration</span>
                </Link>

                <Link
                  href="/sender/photo-import"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <FolderArchive className="h-4 w-4 text-emerald-400" />
                  <span>Folder Photo Import</span>
                </Link>

                <Link
                  href="/sender/batches"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Boxes className="h-4 w-4 text-purple-400" />
                  <span>Dispatch Batches</span>
                </Link>

                <Link
                  href="/sender/receipts"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Receipt className="h-4 w-4 text-accent" />
                  <span>Registration Receipts</span>
                </Link>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* RECEIVER OPERATIONAL ENVIRONMENT (VISIBLE ONLY TO RECEIVER & ADMIN) */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {(isReceiver || isAdmin) && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span>Receiver Production Facility</span>
                </div>

                <Link
                  href="/receiver/batches"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Inbox className="h-4 w-4 text-purple-400" />
                  <span>Inbound Batches</span>
                </Link>

                <Link
                  href="/students"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Users className="h-4 w-4 text-accent" />
                  <span>Student Directory (20k)</span>
                </Link>

                <Link
                  href="/students/import"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Excel / CSV Importer</span>
                </Link>

                <Link
                  href="/students/qr-import"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <QrCode className="h-4 w-4 text-blue-400" />
                  <span>Import External QR</span>
                </Link>

                <Link
                  href="/students/download-photos"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>Download Photos (.zip)</span>
                </Link>

                {/* ID Studio & Production (Belongs exclusively to Receiver & Admin) */}
                <div className="pt-2">
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
                    ID Studio & Bulker
                  </div>

                  <Link
                    href="/designer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                  >
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span>Canva ID Designer</span>
                  </Link>

                  <Link
                    href="/bulker"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                  >
                    <Printer className="h-4 w-4 text-accent" />
                    <span>Bulker & Layouts</span>
                  </Link>

                  <Link
                    href="/print-engine"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>8-Up A4 Print Engine</span>
                  </Link>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SYSTEM ADMINISTRATION (VISIBLE ONLY TO ADMIN) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {isAdmin && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>System Administration</span>
                </div>

                <Link
                  href="/admin/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>User & RBAC Mgmt</span>
                </Link>

                <Link
                  href="/admin/database"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                >
                  <Database className="h-4 w-4" />
                  <span>Database & Metrics</span>
                </Link>
              </div>
            )}

            {/* General Settings */}
            <div className="pt-2 border-t border-border">
              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Station Settings</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User Identity & Logout */}
        <div className="border-t border-border p-4 bg-surface-secondary">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-semibold text-foreground truncate">{session.username}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isSender
                      ? "bg-emerald-400"
                      : isReceiver
                      ? "bg-blue-400"
                      : "bg-accent"
                  }`}
                />
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isSender
                      ? "text-emerald-400"
                      : isReceiver
                      ? "text-blue-400"
                      : "text-accent"
                  }`}
                >
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
                className="rounded-lg p-2 text-foreground-muted hover:bg-surface-tertiary hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-black/80 backdrop-blur-md px-8">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase border ${
                isSender
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isReceiver
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isSender
                    ? "bg-emerald-400"
                    : isReceiver
                    ? "bg-blue-400"
                    : "bg-amber-400"
                } animate-pulse`}
              />
              {isSender
                ? "SENDER STATION / ENROLLMENT ACTIVE"
                : isReceiver
                ? "RECEIVER FACILITY / 20,000+ PRODUCTION"
                : "ADMINISTRATIVE CONTROL CENTER"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isSender && (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Enroll Student</span>
              </Link>
            )}

            {isReceiver && (
              <Link
                href="/print-engine"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>8-Up Print Engine</span>
              </Link>
            )}

            <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-mono text-foreground-muted">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span>SYSTEM ONLINE</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
