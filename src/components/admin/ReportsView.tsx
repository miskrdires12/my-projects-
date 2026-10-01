"use client";

// ============================================================================
// STUDENT BRIDGE — COMPREHENSIVE DATA REPORTS VIEW
// Daily, Weekly, and Monthly Data Reports for Admin and Super Admin
// ============================================================================

import React, { useState, useTransition } from "react";
import {
  School,
  MapPin,
  Users,
  AlertTriangle,
  Loader2,
  Filter,
} from "lucide-react";
import { getAggregatedReportsAction, type ReportTimeframe } from "@/actions/reports";

interface ReportsViewProps {
  initialData: any;
  userRole: string;
}

export default function ReportsView({ initialData, userRole }: ReportsViewProps) {
  const [data, setData] = useState(initialData);
  const [timeframe, setTimeframe] = useState<ReportTimeframe>("daily");
  const [isPending, startTransition] = useTransition();

  const handleTimeframeChange = (tf: ReportTimeframe) => {
    setTimeframe(tf);
    startTransition(async () => {
      const res = await getAggregatedReportsAction(tf);
      if (res.success) {
        setData(res);
      }
    });
  };

  const metrics = data?.metrics || {};
  const cadence = data?.cadence || {};
  const breakdowns = data?.breakdowns || {};
  const recentMistakes = data?.recentMistakes || [];

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Executive Data Intelligence & Intake Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/30">
              {userRole}
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time enrollment velocity, school quotas, and quality audit across all stations.
          </p>
        </div>

        {/* Timeframe Selector Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-[#161e19] border border-neutral-200 dark:border-neutral-800 self-start sm:self-auto">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleTimeframeChange("daily")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              timeframe === "daily"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Today (Daily)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleTimeframeChange("weekly")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              timeframe === "weekly"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Weekly (7d)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleTimeframeChange("monthly")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              timeframe === "monthly"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            Monthly (30d)
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleTimeframeChange("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              timeframe === "all"
                ? "bg-[#8fe617] text-[#062404] shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Cadence Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 shadow-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Registered Today
          </div>
          <div className="text-3xl font-black font-mono text-emerald-800 dark:text-emerald-300 mt-1">
            +{cadence.today?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] font-mono text-emerald-600/80 mt-0.5">
            Since 00:00 midnight
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/20 shadow-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Registered This Week
          </div>
          <div className="text-3xl font-black font-mono text-sky-800 dark:text-sky-300 mt-1">
            +{cadence.week?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] font-mono text-sky-600/80 mt-0.5">
            Rolling 7 calendar days
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 dark:bg-purple-950/20 shadow-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            Registered This Month
          </div>
          <div className="text-3xl font-black font-mono text-purple-800 dark:text-purple-300 mt-1">
            {cadence.month?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] font-mono text-purple-600/80 mt-0.5">
            Rolling 30 calendar days
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-xs">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
            All-Time Total Database
          </div>
          <div className="text-3xl font-black font-mono text-neutral-900 dark:text-neutral-100 mt-1">
            {cadence.allTime?.toLocaleString() ?? 0}
          </div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
            Total records stored
          </div>
        </div>
      </div>

      {/* Selected Timeframe Snapshot Cards */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#8fe617]" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              Snapshot for{" "}
              <span className="uppercase text-[#8fe617] font-black">{timeframe}</span> Timeframe
            </h2>
          </div>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-[#8fe617]" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19]">
            <div className="text-xs text-neutral-500 font-bold uppercase font-mono">Intake In Period</div>
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-neutral-100 mt-1">
              {metrics.totalIntake?.toLocaleString() ?? 0}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19]">
            <div className="text-xs text-neutral-500 font-bold uppercase font-mono">Photos Verified</div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.withPhotoCount?.toLocaleString() ?? 0}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
              {metrics.photoCoveragePct}% coverage
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19]">
            <div className="text-xs text-neutral-500 font-bold uppercase font-mono">Missing Portraits</div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {metrics.missingPhotoCount?.toLocaleString() ?? 0}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Requires sender resend
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19]">
            <div className="text-xs text-neutral-500 font-bold uppercase font-mono">Mistakes Corrected</div>
            <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-1">
              {metrics.mistakesCount?.toLocaleString() ?? 0}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Audited by receivers
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Breakdowns: School & Branch Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Intake Breakdown */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <School className="h-5 w-5 text-[#8fe617]" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-mono">
              Intake Breakdown by School
            </h3>
          </div>

          <div className="space-y-2 pt-1 font-mono text-xs">
            {breakdowns.schools && breakdowns.schools.length > 0 ? (
              breakdowns.schools.map((item: any) => {
                const maxCount = breakdowns.schools[0]?.count || 1;
                const pct = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{item.name}</span>
                      <span className="font-bold text-[#8fe617]">{item.count.toLocaleString()} students</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-[#161e19] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#8fe617] h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-neutral-500">No school data for this period.</div>
            )}
          </div>
        </div>

        {/* Section / Branch Breakdown */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-400" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-mono">
              Intake Breakdown by Branch / Location
            </h3>
          </div>

          <div className="space-y-2 pt-1 font-mono text-xs">
            {breakdowns.sections && breakdowns.sections.length > 0 ? (
              breakdowns.sections.map((item: any) => {
                const maxCount = breakdowns.sections[0]?.count || 1;
                const pct = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{item.name}</span>
                      <span className="font-bold text-sky-500">{item.count.toLocaleString()} students</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-[#161e19] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-neutral-500">No branch data for this period.</div>
            )}
          </div>
        </div>
      </div>

      {/* Senders Production Leaderboard */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[#8fe617]" />
          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-mono">
            Sender Volume in Selected Period
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {breakdowns.senders && breakdowns.senders.length > 0 ? (
            breakdowns.senders.map((s: any) => (
              <div
                key={s.name}
                className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19] flex items-center justify-between font-mono"
              >
                <div>
                  <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{s.name}</div>
                  <div className="text-[10px] text-neutral-500">Intake Station</div>
                </div>
                <div className="text-xl font-black text-[#8fe617]">
                  {s.count.toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-neutral-500 font-mono text-xs">
              No sender activity recorded in this period.
            </div>
          )}
        </div>
      </div>

      {/* Receiver Audit Mistake Log Table */}
      {recentMistakes.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-mono">
                Recent Mistakes & Receiver Corrections Audit Log
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              Showing last {recentMistakes.length} corrections
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-50 dark:bg-[#161e19] border-y border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Student Name / ID</th>
                  <th className="py-2.5 px-3">Sender Attributed</th>
                  <th className="py-2.5 px-3">Field Corrected</th>
                  <th className="py-2.5 px-3">Old Value (Mistake)</th>
                  <th className="py-2.5 px-3">New Value (Corrected)</th>
                  <th className="py-2.5 px-3">Corrected By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {recentMistakes.map((m: any) => (
                  <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-[#161e19]/50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                      <div>{m.studentName}</div>
                      <div className="text-[10px] text-neutral-400">{m.studentId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300">
                      {m.senderName || m.senderId || "Unknown Sender"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                        {m.fieldName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-red-500 line-through max-w-[150px] truncate">
                      {m.oldValue || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold max-w-[150px] truncate">
                      {m.newValue || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {m.correctedBy || "Receiver"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
