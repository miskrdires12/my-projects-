"use client";

import React, { useState } from "react";
import {
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Activity,
  Server,
  Layers,
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

  return (
    <div className="space-y-6">
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
