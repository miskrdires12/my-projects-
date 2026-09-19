"use client";

import React, { useState, useEffect } from "react";
import {
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Activity,
  Server,
  Layers,
  Cloud,
  Zap,
  AlertTriangle,
  Clock,
  Radio,
  Globe,
  ExternalLink,
} from "lucide-react";
import type { StorageQuotaMetrics } from "@/lib/storage-quota-monitor";

interface DatabaseAdminClientProps {
  quota: StorageQuotaMetrics;
  studentRows: number;
  verifiedPhotosCount: number;
  missingPhotosCount: number;
  lastReport?: {
    id: string;
    totalObjects?: number;
    totalBytes?: number;
    orphanedCount?: number;
    missingCount?: number;
    verifiedCount?: number;
    createdAt: string | Date;
  } | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const DatabaseAdminClient: React.FC<DatabaseAdminClientProps> = ({
  quota,
  studentRows,
  verifiedPhotosCount,
  missingPhotosCount,
  lastReport: initialReport,
}) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [report, setReport] = useState<any>(initialReport);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  // Real-time Supabase & Database Telemetry
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingFeedback, setPingFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/admin/supabase-status");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setTelemetry(data);
        }
      } catch {}
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const runKeepAlivePing = async () => {
    setIsPinging(true);
    setPingFeedback(null);
    try {
      const res = await fetch("/api/admin/supabase-status", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setPingFeedback(data.message || "Keep-alive touch recorded! Inactivity timer reset.");
        // Immediately refresh telemetry
        const refreshRes = await fetch("/api/admin/supabase-status");
        if (refreshRes.ok) {
          setTelemetry(await refreshRes.json());
        }
      } else {
        alert("Keep-alive ping failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Failed to send keep-alive touch: " + err.message);
    } finally {
      setIsPinging(false);
    }
  };

  const runReconciliation = async () => {
    setIsReconciling(true);
    setPurgeFeedback(null);
    try {
      const res = await fetch("/api/storage/reconcile", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setReport(data.report);
      } else {
        alert("Reconciliation error: " + (data.error || "Unknown"));
      }
    } catch (err: any) {
      alert("Failed to run reconciliation: " + err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  const runSafePurge = async () => {
    if (
      !confirm(
        "Are you sure you want to purge verified orphaned files older than the 7-day safety window? Any file uploaded within the last 7 days or referenced in any database record will NOT be deleted."
      )
    ) {
      return;
    }

    setIsPurging(true);
    setPurgeFeedback(null);
    try {
      const res = await fetch("/api/storage/reconcile?purge=true", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeFeedback(
          `Purge complete: ${data.purgedCount} safe orphaned objects deleted. Total space reclaimed: ${formatBytes(
            data.reclaimedBytes || 0
          )}.`
        );
        // Refresh report
        runReconciliation();
      } else {
        alert("Purge error: " + (data.error || "Unknown"));
      }
    } catch (err: any) {
      alert("Failed to execute safe purge: " + err.message);
    } finally {
      setIsPurging(false);
    }
  };

  const statusColor =
    quota.healthStatus === "CRITICAL"
      ? "text-red-500 bg-red-500/10 border-red-500/30"
      : quota.healthStatus === "HIGH"
      ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
      : quota.healthStatus === "WARNING"
      ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
      : "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";

  const supaConnected = telemetry?.supabase?.status === "CONNECTED";
  const daysRemaining = telemetry?.inactivityTimer?.daysRemaining ?? 7;
  const isApproachingPause = telemetry?.inactivityTimer?.isApproachingPauseLimit;
  const isCriticalPause = telemetry?.inactivityTimer?.isCriticalPauseLimit;

  return (
    <div className="space-y-6">
      {/* Real-time Supabase & Inactivity Pause Guardian Card */}
      <div className="rounded-xl border-2 border-black bg-neutral-950 text-white p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Cloud className="h-5 w-5 text-white" />
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Real-Time Supabase &amp; Database Heartbeat</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-black">
                  <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-600" />
                  LIVE TELEMETRY
                </span>
              </h2>
            </div>
            <p className="text-xs text-neutral-400">
              Live latency polling, free-tier 7-day inactivity pause protection, and cloud storage capacity gauges
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://my-projects-two-kappa.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-mono font-semibold text-neutral-200 hover:text-white hover:border-white transition-colors shadow-xs"
              title="Open Official Live Deployment"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              <span>https://my-projects-two-kappa.vercel.app</span>
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </a>

            <button
              type="button"
              onClick={runKeepAlivePing}
              disabled={isPinging}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-black px-4 py-2 text-xs font-bold hover:bg-neutral-200 disabled:opacity-50 transition-colors shadow-sm"
              title="Resets the 7-day free tier inactivity pause counter"
            >
              <Zap className={`h-3.5 w-3.5 ${isPinging ? "animate-spin text-amber-500" : "text-amber-500 fill-amber-500"}`} />
              <span>{isPinging ? "Pinging Cloud..." : "Keep-Alive Touch Ping"}</span>
            </button>
          </div>
        </div>

        {/* Inactivity Pause Warning Banner (Approaching limit or critical) */}
        {isApproachingPause && (
          <div className={`rounded-lg border p-3.5 text-xs flex items-start gap-3 ${
            isCriticalPause 
              ? "border-red-500/80 bg-red-950/80 text-red-200 animate-pulse" 
              : "border-amber-500/80 bg-amber-950/80 text-amber-200"
          }`}>
            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isCriticalPause ? "text-red-400" : "text-amber-400"}`} />
            <div className="space-y-1 flex-1">
              <div className="font-bold uppercase tracking-wider text-[11px]">
                {isCriticalPause ? "CRITICAL: SUPABASE FREE-TIER PAUSE IMMINENT (<24H)" : "ATTENTION: 7-DAY INACTIVITY PAUSE REMINDER"}
              </div>
              <p className="text-[11px] leading-relaxed">
                Supabase projects on the Free tier automatically pause after 7 consecutive days of inactivity. Only{" "}
                <strong className="font-mono text-white underline">{daysRemaining} days</strong> remain before cloud pause. Click <strong>&quot;Keep-Alive Touch Ping&quot;</strong> above to refresh database activity and reset the countdown timer.
              </p>
            </div>
          </div>
        )}

        {/* Feedback Banner */}
        {pingFeedback && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-950/50 p-3 text-xs text-emerald-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{pingFeedback}</span>
          </div>
        )}

        {/* Telemetry Metric Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DB Latency & Health */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono uppercase">
              <span>Database Query Latency</span>
              <Server className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {telemetry?.database?.latencyMs !== undefined ? `${telemetry.database.latencyMs}ms` : "—"}
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                telemetry?.database?.status === "HEALTHY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {telemetry?.database?.status || "CHECKING"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400">
              Prisma Pool • {studentRows.toLocaleString()} Student Records
            </div>
          </div>

          {/* Supabase Status */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono uppercase">
              <span>Supabase REST API</span>
              <Cloud className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {telemetry?.supabase?.latencyMs !== null && telemetry?.supabase?.latencyMs !== undefined
                  ? `${telemetry.supabase.latencyMs}ms`
                  : supaConnected ? "LIVE" : "STANDBY"}
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                supaConnected
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-neutral-800 text-neutral-300 border border-neutral-700"
              }`}>
                {telemetry?.supabase?.status || "STANDBY"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400 truncate" title={telemetry?.supabase?.projectRef}>
              Project: {telemetry?.supabase?.projectRef || "Local Hybrid"}
            </div>
          </div>

          {/* 7-Day Inactivity Tracker */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono uppercase">
              <span>Inactivity Pause Timer</span>
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {telemetry?.inactivityTimer?.daysRemaining !== undefined
                  ? `${telemetry.inactivityTimer.daysRemaining}d`
                  : "7.0d"}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">remaining / 7d limit</span>
            </div>
            {/* Progress bar of 7-day limit */}
            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  daysRemaining <= 2 ? "bg-red-500" : daysRemaining <= 4 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, ((7 - daysRemaining) / 7) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-500 flex justify-between">
              <span>Inactive: {telemetry?.inactivityTimer?.daysInactive ?? 0}d</span>
              <span>Pause at 7d</span>
            </div>
          </div>

          {/* Free-Tier Storage Limit (1 GB) */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono uppercase">
              <span>Supabase Free Storage (1 GB)</span>
              <HardDrive className="h-3.5 w-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-white">
                {telemetry?.storage?.percentUsed !== undefined ? `${telemetry.storage.percentUsed}%` : `${quota.percentageUsed.toFixed(1)}%`}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                {formatBytes(quota.totalBytesUsed)} / 1 GB
              </span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  quota.percentageUsed >= 90 ? "bg-red-500" : quota.percentageUsed >= 80 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, quota.percentageUsed)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-neutral-500 flex justify-between">
              <span>{quota.totalObjectsCount} photos</span>
              <span>{formatBytes(quota.remainingCapacityBytes)} free</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Telemetry & Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Storage Quota Usage */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Storage Capacity Quota</span>
            <HardDrive className="h-4 w-4 text-accent" />
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold font-mono text-foreground">
                {quota.percentageUsed.toFixed(1)}%
              </span>
              <span className="text-[11px] text-foreground-muted ml-2">
                {formatBytes(quota.totalBytesUsed)} / {formatBytes(quota.totalStorageCapacityBytes)}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusColor}`}
            >
              {quota.healthStatus}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                quota.healthStatus === "CRITICAL"
                  ? "bg-red-500"
                  : quota.healthStatus === "HIGH"
                  ? "bg-orange-500"
                  : quota.healthStatus === "WARNING"
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, quota.percentageUsed)}%` }}
            />
          </div>
          <div className="text-[10px] text-foreground-muted font-mono flex justify-between">
            <span>Normal &lt;70%</span>
            <span>Warning 70-80%</span>
            <span>Critical &gt;90%</span>
          </div>
        </div>

        {/* Database Rows & Records */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Database Records</span>
            <Server className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {studentRows.toLocaleString()}
            </div>
            <div className="text-[11px] text-foreground-muted">
              Active Student Rows • Indexed for 20,000+ Scale
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-600 font-medium">
            ✓ SQLite / PostgreSQL Hybrid Pooler Active
          </div>
        </div>

        {/* Photo Integrity Overview */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Integrity Health</span>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {verifiedPhotosCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-foreground-muted">
              {missingPhotosCount > 0 ? (
                <span className="text-amber-500 font-semibold">
                  {missingPhotosCount} photos missing / pending
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold">100% Photos Verified</span>
              )}
            </div>
          </div>
          <div className="text-[10px] font-mono text-foreground-muted">
            Multi-tier: Original (800p) • Preview • Thumb
          </div>
        </div>

        {/* Bandwidth Usage */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Signed URL Bandwidth</span>
            <Activity className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {formatBytes(quota.bandwidthMetrics.totalBytesTransferred)}
            </div>
            <div className="text-[11px] text-foreground-muted">
              Private Storage Egress ({quota.bandwidthMetrics.totalDownloads} downloads)
            </div>
          </div>
          <div className="text-[10px] font-mono text-neutral-500">
            HMAC cryptographic signature protection
          </div>
        </div>
      </div>

      {/* Database ↔ Storage Reconciliation Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              <h2 className="text-base font-bold text-foreground">
                Database ↔ Storage Reconciliation &amp; Orphan Protection
              </h2>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Bidirectional integrity scanner comparing Prisma Student records with private Storage objects.
              Enforces a strict 7-day safety period to protect files in flight.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runReconciliation}
              disabled={isReconciling || isPurging}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface-tertiary disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReconciling ? "animate-spin" : ""}`} />
              <span>{isReconciling ? "Scanning Storage..." : "Run Reconciliation"}</span>
            </button>

            <button
              type="button"
              onClick={runSafePurge}
              disabled={isReconciling || isPurging || (report?.orphanedCount || 0) === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white px-3.5 py-2 text-xs font-semibold hover:bg-neutral-800 disabled:opacity-30 transition-colors shadow-xs"
              title="Purges only verified orphans older than 7 days"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPurging ? "Purging..." : "Purge Safe Orphans (>7d)"}</span>
            </button>
          </div>
        </div>

        {/* Purge Notification */}
        {purgeFeedback && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{purgeFeedback}</span>
          </div>
        )}

        {/* Latest Scan Metrics */}
        {report ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-secondary/50 border border-border text-xs">
            <div>
              <span className="text-foreground-muted block">Storage Objects Scanned</span>
              <strong className="text-foreground font-mono text-sm">
                {report.totalObjects ?? 0}
              </strong>
            </div>

            <div>
              <span className="text-foreground-muted block">Orphaned Objects</span>
              <strong
                className={`font-mono text-sm ${
                  (report.orphanedCount ?? 0) > 0 ? "text-amber-500" : "text-foreground"
                }`}
              >
                {report.orphanedCount ?? 0}
              </strong>
            </div>

            <div>
              <span className="text-foreground-muted block">Missing Photos Detected</span>
              <strong
                className={`font-mono text-sm ${
                  (report.missingCount ?? 0) > 0 ? "text-rose-500" : "text-foreground"
                }`}
              >
                {report.missingCount ?? 0}
              </strong>
            </div>

            <div>
              <span className="text-foreground-muted block">Last Reconciliation</span>
              <span className="text-foreground-muted font-mono text-[11px]">
                {report.createdAt
                  ? new Date(report.createdAt).toLocaleString()
                  : "Just now"}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-foreground-muted border border-dashed border-border rounded-xl">
            No reconciliation scan executed yet. Click &quot;Run Reconciliation&quot; to perform a bidirectional integrity check.
          </div>
        )}
      </div>
    </div>
  );
};
