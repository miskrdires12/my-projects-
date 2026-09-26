"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER TELEMETRY, VELOCITY & INTERVAL EFFICIENCY DASHBOARD
// Real-time per-minute states, start-to-end hours, inter-record intervals,
// speed metrics, and daily efficiency tracking for institutional administrators.
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import {
  Zap,
  Clock,
  Gauge,
  Calendar,
  Activity,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Laptop,
  Flame,
  Award,
  Timer,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import type { FullSenderTelemetryResponse } from "@/actions/sender-telemetry";
import { formatIntervalSeconds } from "@/lib/telemetry-utils";

interface SenderTelemetryViewProps {
  initialData?: FullSenderTelemetryResponse | null;
}

export const SenderTelemetryView: React.FC<SenderTelemetryViewProps> = ({ initialData }) => {
  const [data, setData] = useState<FullSenderTelemetryResponse | null>(initialData || null);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.selectedDate || new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [, startTransition] = useTransition();
  const [expandedSenderId, setExpandedSenderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"live" | "everyday">("live");

  // Fetch telemetry data from server
  const fetchTelemetry = async (dateStr?: string) => {
    try {
      const target = dateStr || selectedDate;
      const res = await fetch(`/api/admin/sender-telemetry?date=${encodeURIComponent(target)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json: FullSenderTelemetryResponse = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn("Telemetry polling warning:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-poll live metrics every 12 seconds when viewing today's date
  useEffect(() => {
    fetchTelemetry(selectedDate);
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate === todayStr) {
      const timer = setInterval(() => {
        fetchTelemetry(todayStr);
      }, 12000);
      return () => clearInterval(timer);
    }
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setIsLoading(true);
    startTransition(() => {
      fetchTelemetry(newDate);
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ====================================================================
          TOP CONTROL BAR & DATE PICKER
         ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isToday ? "bg-[#8fe617]" : "bg-blue-400"} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isToday ? "bg-[#8fe617]" : "bg-blue-500"}`} />
            </span>
            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
              {isToday ? "Live Production Telemetry (Auto-Syncing)" : "Historical Archive Telemetry"}
            </span>
          </div>
          <h2 className="text-xl font-black font-mono tracking-tight text-[#080808] dark:text-[#f2f7f4]">
            Sender Velocity, Interval Cadence &amp; Efficiency Rate
          </h2>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
            Measures inter-record sending intervals, daily starting-to-ending hours, and typing pace everyday
          </p>
        </div>

        {/* Date Selector & Mode Tabs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "live"
                  ? "bg-[#8fe617] text-[#062404] shadow-xs"
                  : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Sender Stations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("everyday")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "everyday"
                  ? "bg-[#8fe617] text-[#062404] shadow-xs"
                  : "text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Everyday History</span>
            </button>
          </div>

          {/* Quick Date Presets */}
          <button
            type="button"
            onClick={() => handleDateChange(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              isToday
                ? "border-[#8fe617] bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617]"
                : "border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93] hover:border-[#8fe617]"
            }`}
          >
            Today
          </button>

          {/* Native HTML Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19]">
            <Calendar className="h-3.5 w-3.5 text-[#8fe617]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchTelemetry(selectedDate)}
            disabled={isLoading}
            className="p-2 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#161d19] text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:border-[#8fe617] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Telemetry"
          >
            <RotateCcw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#8fe617]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ====================================================================
          SYSTEM-WIDE TELEMETRY KPI METRIC CARDS
         ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Records Today */}
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93]">
            <span className="text-[10px] font-mono uppercase font-bold">Total Encodings ({selectedDate})</span>
            <Sparkles className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1">
            {data?.totalSystemRecordsToday || 0}
          </div>
          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>100% Assigned Scannable Real QR</span>
          </div>
        </div>

        {/* Active Senders */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[10px] font-mono uppercase font-bold">Active Senders</span>
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {data?.activeSendersCountToday || 0}
          </div>
          <div className="text-[10px] font-mono text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            Operating stations on duty
          </div>
        </div>

        {/* System Avg Sending Interval */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-[10px] font-mono uppercase font-bold">Avg Sending Interval</span>
            <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {formatIntervalSeconds(data?.systemAvgIntervalSeconds || 0)}
          </div>
          <div className="text-[10px] font-mono text-blue-700/80 dark:text-blue-400/80 mt-1">
            Measured time between student sends
          </div>
        </div>

        {/* System Efficiency Rate */}
        <div className="rounded-2xl border border-[#8fe617]/50 bg-[#8fe617]/10 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#062404] dark:text-[#8fe617]">
            <span className="text-[10px] font-mono uppercase font-bold">System Efficiency Rate</span>
            <Gauge className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-3xl font-black font-mono text-[#062404] dark:text-[#8fe617] mt-1">
            {data?.systemAvgEfficiencyRate ? `${data.systemAvgEfficiencyRate}%` : "—"}
          </div>
          <div className="text-[10px] font-mono text-[#062404]/70 dark:text-[#8fe617]/80 mt-1">
            Pace consistency &amp; rhythm benchmark
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 1: PER-SENDER LIVE TELEMETRY CARDS (START/END, INTERVALS, SPEED)
         ==================================================================== */}
      {activeTab === "live" && (
        <div className="space-y-4">
          {(!data?.senders || data.senders.length === 0) ? (
            <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-12 text-center space-y-3 font-mono">
              <Clock className="h-10 w-10 text-[#6b7771] dark:text-[#8a9e93] mx-auto opacity-50" />
              <div className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4]">
                No Sender Registrations Recorded for {selectedDate}
              </div>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] max-w-sm mx-auto">
                Once sender stations start registering students, their live per-minute states, interval speeds, and start-to-end hours will display here.
              </p>
            </div>
          ) : (
            data.senders.map((sender) => {
              const isExpanded = expandedSenderId === sender.senderId;
              const hasActivity = sender.totalRecordsToday > 0;

              return (
                <div
                  key={sender.senderId}
                  className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-xs transition-all hover:border-[#8fe617]/40 space-y-4"
                >
                  {/* Sender Header Banner */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#8fe617]/20 to-emerald-500/20 border border-[#8fe617]/40 flex items-center justify-center font-black font-mono text-base text-[#062404] dark:text-[#8fe617] shadow-inner">
                        {sender.senderName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                            {sender.senderName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f7faf9] dark:bg-[#1c261e] border border-[#dce7e1] dark:border-[#2b3b2e] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                            {sender.role}
                          </span>

                          {/* Live Status Badge */}
                          {sender.currentLiveStatus === "BURSTING" && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                              <Flame className="h-3 w-3" /> Bursting Now ({sender.recordsLast1Min}/min)
                            </span>
                          )}
                          {sender.currentLiveStatus === "ACTIVE" && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8fe617]/20 border border-[#8fe617]/40 text-[#062404] dark:text-[#8fe617] font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <Activity className="h-3 w-3" /> Active Now
                            </span>
                          )}
                          {sender.currentLiveStatus === "IDLE" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Idle Gap
                            </span>
                          )}
                          {sender.currentLiveStatus === "COMPLETED" && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                              Shift Inactive
                            </span>
                          )}
                          {sender.currentLiveStatus === "OFFLINE" && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-500/15 border border-gray-500/30 text-[#6b7771] dark:text-[#8a9e93] font-mono text-[10px] font-bold uppercase tracking-wider">
                              No Activity Today
                            </span>
                          )}
                        </div>

                        {/* Device & Email info */}
                        <div className="flex items-center gap-3 text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
                          {sender.email && <span>{sender.email}</span>}
                          {sender.boundDeviceInfo && (
                            <span className="flex items-center gap-1">
                              <Laptop className="h-3 w-3 text-[#8fe617]" />
                              <span>{sender.boundDeviceInfo}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Velocity Highlights */}
                    <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                      <div className="px-3 py-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19]">
                        <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] block">Today Total</span>
                        <strong className="text-sm font-black text-[#080808] dark:text-[#f2f7f4]">
                          {sender.totalRecordsToday} students
                        </strong>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl border border-[#8fe617]/40 bg-[#8fe617]/10">
                        <span className="text-[10px] text-[#062404] dark:text-[#8fe617] block">Speed</span>
                        <strong className="text-sm font-black text-[#062404] dark:text-[#8fe617]">
                          {sender.speedRecordsPerHour} / hr
                        </strong>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20">
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 block">Avg Interval</span>
                        <strong className="text-sm font-black text-blue-600 dark:text-blue-400">
                          {formatIntervalSeconds(sender.avgSendingIntervalSeconds)}
                        </strong>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-950/60 bg-purple-50/50 dark:bg-purple-950/20">
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 block">Efficiency</span>
                        <strong className="text-sm font-black text-purple-600 dark:text-purple-400">
                          {sender.efficiencyRatePercent}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Core 4-Box Telemetry Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
                    {/* Box 1: Per-Minute Realtime Velocity */}
                    <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93]">
                        <span className="text-[10px] uppercase font-bold">Per-Minute Rate</span>
                        <Timer className="h-3.5 w-3.5 text-[#8fe617]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Last 1 Min:</span>
                          <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                            {sender.recordsLast1Min} record{sender.recordsLast1Min === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Last 5 Mins:</span>
                          <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                            {sender.recordsLast5Mins} record{sender.recordsLast5Mins === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#dce7e1] dark:border-[#223126]">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Peak Velocity:</span>
                          <span className="font-black text-[#8fe617]">
                            {sender.peakRecordsPerMinute} / min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 2: Starting to Ending Hours & Operating Shift */}
                    <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93]">
                        <span className="text-[10px] uppercase font-bold">Daily Encoding Hours</span>
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Starting Hour:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {sender.startingHourFormatted}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Ending Hour:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {sender.endingHourFormatted}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#dce7e1] dark:border-[#223126]">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Active Shift:</span>
                          <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                            {sender.activeEncodingDurationFormatted} ({sender.totalOperatingSpanFormatted} span)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 3: Sending Interval & Cadence */}
                    <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93]">
                        <span className="text-[10px] uppercase font-bold">Sending Interval Delta</span>
                        <Gauge className="h-3.5 w-3.5 text-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Avg Interval:</span>
                          <span className="font-black text-purple-600 dark:text-purple-400">
                            {formatIntervalSeconds(sender.avgSendingIntervalSeconds)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Fastest Burst:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatIntervalSeconds(sender.minIntervalSeconds)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#dce7e1] dark:border-[#223126]">
                          <span className="text-[#6b7771] dark:text-[#8a9e93]">Pause / Break Gaps:</span>
                          <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                            {sender.pauseGapsCount} gap{sender.pauseGapsCount === 1 ? "" : "s"} (&gt;10m)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Box 4: Efficiency Rate & Speed Grade */}
                    <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[#6b7771] dark:text-[#8a9e93]">
                        <span className="text-[10px] uppercase font-bold">Efficiency Score</span>
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-[#080808] dark:text-[#f2f7f4]">
                            {sender.efficiencyRatePercent}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              sender.efficiencyGrade === "EXCELLENT"
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : sender.efficiencyGrade === "GOOD"
                                ? "bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617]"
                                : sender.efficiencyGrade === "MODERATE"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                : "bg-red-500/20 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {sender.efficiencyGrade}
                          </span>
                        </div>

                        {/* Efficiency Progress Bar */}
                        <div className="w-full bg-[#dce7e1] dark:bg-[#223126] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#8fe617] h-full transition-all duration-500 rounded-full"
                            style={{ width: `${Math.min(100, sender.efficiencyRatePercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                          <span>Pace: {sender.speedGrade}</span>
                          <span>{sender.speedRecordsPerMinute} rec/min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Distribution Timeline Heatmap (08:00 AM to 05:00 PM) */}
                  {hasActivity && (
                    <div className="pt-2">
                      <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold mb-2 flex items-center justify-between">
                        <span>Hourly Registration Intake Timeline (Start to End Hours)</span>
                        <span className="text-[#8fe617]">Live Hourly Volume</span>
                      </div>

                      {/* 24-Hour Interactive Bar Heatmap */}
                      <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 p-2 rounded-2xl bg-[#f7faf9] dark:bg-[#161d19] border border-[#dce7e1] dark:border-[#223126]">
                        {sender.hourlyHeatmap.map((h) => {
                          const maxCount = Math.max(...sender.hourlyHeatmap.map((x) => x.count), 1);
                          const barHeightPercent = Math.max(15, Math.round((h.count / maxCount) * 100));

                          return (
                            <div
                              key={h.hour}
                              className="group relative flex flex-col items-center justify-end h-16 cursor-pointer"
                              title={`${h.label}: ${h.count} students`}
                            >
                              {/* Hover Tooltip */}
                              <div className="absolute -top-8 hidden group-hover:flex z-30 px-2 py-0.5 rounded-lg bg-black text-white text-[9px] font-mono whitespace-nowrap shadow-md pointer-events-none">
                                {h.label}: {h.count} students
                              </div>

                              {/* Bar Column */}
                              <div
                                className={`w-full rounded-t-sm transition-all ${
                                  h.count > 0
                                    ? h.count >= 30
                                      ? "bg-[#8fe617]"
                                      : h.count >= 15
                                      ? "bg-emerald-500"
                                      : "bg-emerald-400/80"
                                    : "bg-[#dce7e1]/40 dark:bg-[#223126]/40"
                                }`}
                                style={{
                                  height: h.count > 0 ? `${barHeightPercent}%` : "4px",
                                }}
                              />

                              {/* Hour Label (Show every 3 hours on small screens) */}
                              <span className="text-[8px] font-mono text-[#6b7771] dark:text-[#8a9e93] mt-1 select-none">
                                {h.hour % 3 === 0 ? String(h.hour).padStart(2, "0") : ""}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Toggle Recent Inter-Record Intervals Drawer */}
                  {hasActivity && sender.recentIntervals.length > 0 && (
                    <div className="pt-2 border-t border-[#eef5f1] dark:border-[#1c261e]">
                      <button
                        type="button"
                        onClick={() => setExpandedSenderId(isExpanded ? null : sender.senderId)}
                        className="flex items-center gap-2 text-xs font-mono font-bold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span>
                          {isExpanded
                            ? "Hide Inter-Record Sending Intervals"
                            : `Inspect Recent Sending Intervals (${sender.recentIntervals.length} measured records)`}
                        </span>
                      </button>

                      {/* Expandable Table of Consecutive Intervals */}
                      {isExpanded && (
                        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3 animate-in fade-in">
                          <table className="w-full text-left font-mono text-xs">
                            <thead>
                              <tr className="border-b border-[#dce7e1] dark:border-[#223126] text-[#6b7771] dark:text-[#8a9e93] text-[10px] uppercase">
                                <th className="pb-2">Time</th>
                                <th className="pb-2">Student ID</th>
                                <th className="pb-2">Student Name</th>
                                <th className="pb-2">Interval Delta</th>
                                <th className="pb-2">Cadence Rating</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce7e1]/60 dark:divide-[#223126]/60">
                              {sender.recentIntervals.map((rec, idx) => (
                                <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-2 text-[#6b7771] dark:text-[#8a9e93]">
                                    {new Date(rec.timestamp).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </td>
                                  <td className="py-2 font-bold text-[#080808] dark:text-[#f2f7f4]">
                                    {rec.studentId}
                                  </td>
                                  <td className="py-2 text-[#3f4743] dark:text-[#a4b8ad]">
                                    {rec.fullName}
                                  </td>
                                  <td className="py-2 font-black text-[#8fe617]">
                                    +{formatIntervalSeconds(rec.intervalSeconds)}
                                  </td>
                                  <td className="py-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        rec.status === "FAST"
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                          : rec.status === "OPTIMAL"
                                          ? "bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617]"
                                          : rec.status === "MODERATE"
                                          ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                          : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                      }`}
                                    >
                                      {rec.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: EVERYDAY MULTI-DAY CADENCE & EFFICIENCY HISTORY
         ==================================================================== */}
      {activeTab === "everyday" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-xs space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#8fe617]" />
                  <span>Everyday Historical Cadence &amp; Efficiency Log</span>
                </h3>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Full day-by-day record of starting hours, ending hours, sending interval deltas, and station speed
                </p>
              </div>
            </div>

            {(!data?.dailyHistory || data.dailyHistory.length === 0) ? (
              <div className="p-8 text-center text-xs text-[#6b7771] dark:text-[#8a9e93]">
                No historical daily cadence records logged yet.
              </div>
            ) : (
              <div className="divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
                {data.dailyHistory.map((day) => (
                  <div key={day.date} className="py-4 space-y-3">
                    {/* Day Summary Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#080808] dark:text-[#f2f7f4]">
                          {day.displayDate}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f7faf9] dark:bg-[#1c261e] border border-[#dce7e1] dark:border-[#2b3b2e] text-[#6b7771] dark:text-[#8a9e93] font-bold">
                          {day.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
                          {day.totalRecords} students
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold">
                          {formatIntervalSeconds(day.systemAvgIntervalSeconds)} avg interval
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] font-black">
                          {day.systemEfficiencyRate}% efficiency
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setActiveTab("live");
                            handleDateChange(day.date);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-[#8fe617] text-[#062404] font-black hover:bg-[#7ecc10] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Inspect Day</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Sender Breakdown Table for this Day */}
                    <div className="overflow-x-auto rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] p-3">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-[#dce7e1] dark:border-[#223126] text-[#6b7771] dark:text-[#8a9e93] text-[10px] uppercase">
                            <th className="pb-1.5">Station Operator</th>
                            <th className="pb-1.5">Starting Hour</th>
                            <th className="pb-1.5">Ending Hour</th>
                            <th className="pb-1.5">Records Encoded</th>
                            <th className="pb-1.5">Avg Interval</th>
                            <th className="pb-1.5">Pace (Rec/Hr)</th>
                            <th className="pb-1.5">Day Efficiency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dce7e1]/60 dark:divide-[#223126]/60">
                          {day.senderBreakdown.map((sb, sIdx) => (
                            <tr key={sIdx} className="hover:bg-black/5 dark:hover:bg-white/5">
                              <td className="py-1.5 font-bold text-[#080808] dark:text-[#f2f7f4]">
                                {sb.senderName}
                              </td>
                              <td className="py-1.5 text-emerald-600 dark:text-emerald-400">
                                {sb.startingHour}
                              </td>
                              <td className="py-1.5 text-amber-600 dark:text-amber-400">
                                {sb.endingHour}
                              </td>
                              <td className="py-1.5 font-black text-[#080808] dark:text-[#f2f7f4]">
                                {sb.count}
                              </td>
                              <td className="py-1.5 font-bold text-blue-600 dark:text-blue-400">
                                {formatIntervalSeconds(sb.avgIntervalSeconds)}
                              </td>
                              <td className="py-1.5 font-bold text-[#8fe617]">
                                {sb.speedPerHour} / hr
                              </td>
                              <td className="py-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617] font-bold text-[10px]">
                                  {sb.efficiencyRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
