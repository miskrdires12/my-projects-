import React from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Shield, ShieldAlert, LogOut } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getSenderTelemetryAction } from "@/actions/sender-telemetry";
import { SenderTelemetryView } from "@/components/admin/SenderTelemetryView";
import { logoutAction } from "@/actions/auth";

export const metadata = {
  title: "Sender Velocity & Efficiency Telemetry | SILICON LABS",
  description: "Real-time per-minute states, interval speeds, start-to-end hours, and everyday efficiency",
};

export default async function AdminTelemetryPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN" && session.role !== "RECEIVER")) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-5 text-red-500 shadow-2xl shadow-red-500/10 animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
          Security Access Restricted
        </div>
        <h1 className="text-3xl font-black text-[#080808] dark:text-[#f2f7f4] tracking-tight mb-2">
          Administrator Clearance Required
        </h1>
        <p className="text-sm text-[#6b7771] dark:text-[#8a9e93] max-w-lg font-mono leading-relaxed mb-6">
          Access Restricted: Real-time telemetry, inter-record sending intervals, and operator speed metrics are strictly reserved for System Administrators and Facility Controllers.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#8fe617] text-[#062404] font-black text-xs hover:brightness-110 transition-all shadow-lg shadow-[#8fe617]/20 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const initialTelemetry = await getSenderTelemetryAction(searchParams.date);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#080808] dark:text-[#f2f7f4]">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">
            <Link href="/dashboard" className="hover:text-[#8fe617] transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <Link href="/admin/users" className="hover:text-[#8fe617] transition-colors">
              <span>Administration</span>
            </Link>
            <span>/</span>
            <span className="text-[#8fe617]">Sender Telemetry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-[#8fe617]" />
            <span>Sender Speed &amp; Interval Efficiency Telemetry</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-1 font-mono">
            Live per-minute states, inter-record interval delta, starting-to-ending hours, and daily efficiency tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-[#8fe617]" />
            <span>Manage Operators</span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Sender Telemetry Engine */}
      <SenderTelemetryView initialData={initialTelemetry} />
    </div>
  );
}
