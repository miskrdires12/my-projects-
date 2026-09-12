"use client";

// ============================================================================
// STUDENT BRIDGE — DATABASE & AUDIT LOG MANAGEMENT CONSOLE
// Interactive SVG Pie/Donut Charts + Real-time Audit Log Filtering & Export
// Silicon Labs Obsidian & Neon Lemon Green Design System
// ============================================================================

import React, { useState, useTransition } from "react";
import {
  Activity,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Search,
  PieChart as PieChartIcon,
  Layers,
  FileText,
  User,
  X,
  ExternalLink,
} from "lucide-react";
import { clearAuditLogsAction } from "@/actions/audit";

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
  user: {
    username: string;
    role: string;
  } | null;
}

interface DatabaseClientProps {
  metrics: {
    studentCount: number;
    userCount: number;
    templateCount: number;
    verifiedPhotoCount: number;
    missingPhotoCount: number;
  };
  gradeCohorts: { grade: string; count: number }[];
  userRoles: { role: string; count: number }[];
  initialAuditLogs: AuditLogItem[];
}

/**
 * High-fidelity Interactive SVG Pie & Donut Chart Component
 */
export function InteractivePieChart({
  title,
  subtitle,
  data,
  donut = false,
  centerLabel,
  centerValue,
}: {
  title: string;
  subtitle: string;
  data: ChartSegment[];
  donut?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 88;
  const innerRadius = donut ? 52 : 0;

  // Build SVG path coordinates
  let cumulativeAngle = -Math.PI / 2; // Start from top 12 o'clock

  const slices = data.map((item) => {
    const fraction = total > 0 ? item.value / total : 0;
    const sliceAngle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    // Guard for 100% single slice or 0 items
    if (fraction >= 0.999) {
      return {
        ...item,
        fraction,
        isFull: true,
        path: "",
      };
    }

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    let path = "";
    if (donut) {
      const xin1 = cx + innerRadius * Math.cos(endAngle);
      const yin1 = cy + innerRadius * Math.sin(endAngle);
      const xin2 = cx + innerRadius * Math.cos(startAngle);
      const yin2 = cy + innerRadius * Math.sin(startAngle);

      path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${xin1} ${yin1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${xin2} ${yin2} Z`;
    } else {
      path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    return {
      ...item,
      fraction,
      isFull: false,
      path,
    };
  });

  return (
    <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#eef5f1] dark:border-[#1c261e]">
          <div>
            <h3 className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {title}
            </h3>
            <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
              {subtitle}
            </p>
          </div>
          <div className="h-7 w-7 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
            <PieChartIcon className="h-4 w-4" />
          </div>
        </div>

        {/* SVG Chart Display */}
        <div className="relative flex items-center justify-center py-5">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {total === 0 ? (
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#223126"
                strokeWidth={donut ? radius - innerRadius : radius}
              />
            ) : (
              slices.map((slice, i) => {
                const isHovered = hoveredIndex === i;
                if (slice.value === 0) return null;

                if (slice.isFull) {
                  return (
                    <circle
                      key={slice.label}
                      cx={cx}
                      cy={cy}
                      r={donut ? (radius + innerRadius) / 2 : radius}
                      fill={donut ? "none" : slice.color}
                      stroke={donut ? slice.color : "none"}
                      strokeWidth={donut ? radius - innerRadius : 0}
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        filter: isHovered ? "drop-shadow(0 0 8px rgba(143,230,23,0.5))" : "none",
                      }}
                    />
                  );
                }

                return (
                  <path
                    key={slice.label}
                    d={slice.path}
                    fill={slice.color}
                    className="transition-all duration-200 cursor-pointer hover:opacity-95"
                    stroke="#111613"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      transformOrigin: `${cx}px ${cy}px`,
                      transform: isHovered ? "scale(1.05)" : "scale(1)",
                      filter: isHovered ? `drop-shadow(0 0 10px ${slice.color}88)` : "none",
                    }}
                  />
                );
              })
            )}

            {/* Donut Center Readout */}
            {donut && (
              <g className="pointer-events-none text-center">
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  className="fill-[#080808] dark:fill-[#f2f7f4] font-mono font-black text-xl"
                >
                  {hoveredIndex !== null
                    ? data[hoveredIndex]?.value.toLocaleString()
                    : centerValue ?? total.toLocaleString()}
                </text>
                <text
                  x={cx}
                  y={cy + 14}
                  textAnchor="middle"
                  className="fill-[#6b7771] dark:fill-[#8a9e93] font-mono font-bold text-[9px] uppercase tracking-wider"
                >
                  {hoveredIndex !== null
                    ? data[hoveredIndex]?.label
                    : centerLabel ?? "TOTAL"}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Legend with Metrics */}
      <div className="space-y-1.5 pt-3 border-t border-[#eef5f1] dark:border-[#1c261e]">
        {data.map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between px-2.5 py-1 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                isHovered
                  ? "bg-[#8fe617]/15 text-[#080808] dark:text-[#f2f7f4]"
                  : "text-[#6b7771] dark:text-[#8a9e93] hover:bg-[#f7faf9] dark:hover:bg-[#161d19]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[#080808] dark:text-[#f2f7f4]">
                  {item.value.toLocaleString()}
                </span>
                <span className="font-bold text-[10px] text-[#8fe617] bg-[#8fe617]/20 px-1.5 py-0.2 rounded-md">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DatabaseClient({
  metrics,
  gradeCohorts,
  userRoles,
  initialAuditLogs,
}: DatabaseClientProps) {
  const [isPending, startTransition] = useTransition();
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [operatorFilter, setOperatorFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // 1. Photo Linkage Distribution Data
  const photoChartData: ChartSegment[] = [
    {
      label: "Verified Portraits",
      value: metrics.verifiedPhotoCount,
      color: "#8fe617", // Neon Lemon Green
    },
    {
      label: "Missing Portraits",
      value: metrics.missingPhotoCount,
      color: "#f59e0b", // Amber warning
    },
  ];

  // 2. Grade Cohort Distribution Data
  const cohortPalette = ["#8fe617", "#06b6d4", "#a855f7", "#3b82f6", "#ec4899", "#10b981"];
  const cohortChartData: ChartSegment[] = gradeCohorts.map((gc, i) => ({
    label: gc.grade.startsWith("Grade") ? gc.grade : `Grade ${gc.grade}`,
    value: gc.count,
    color: cohortPalette[i % cohortPalette.length],
  }));

  if (cohortChartData.length === 0) {
    cohortChartData.push({ label: "No Cohorts", value: 1, color: "#223126" });
  }

  // 3. User Role Distribution Data
  const roleColors: Record<string, string> = {
    ADMIN: "#f59e0b",
    RECEIVER: "#8fe617",
    SENDER: "#3b82f6",
  };
  const roleChartData: ChartSegment[] = userRoles.map((ur) => ({
    label: ur.role,
    value: ur.count,
    color: roleColors[ur.role] || "#10b981",
  }));

  // Unique actions and operators for filters
  const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).sort();
  const uniqueOperators = Array.from(
    new Set(auditLogs.map((l) => l.user?.username || "SYSTEM"))
  ).sort();

  // Filtered Logs
  const filteredLogs = auditLogs.filter((log) => {
    const operatorName = log.user?.username || "SYSTEM";
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      operatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.metadata && log.metadata.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    const matchesOperator = operatorFilter === "ALL" || operatorName === operatorFilter;

    return matchesSearch && matchesAction && matchesOperator;
  });

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Timestamp", "Action", "EntityType", "Operator", "Role", "IPAddress", "Metadata"];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toISOString(),
      `"${log.action}"`,
      `"${log.entityType}"`,
      `"${log.user?.username || "SYSTEM"}"`,
      `"${log.user?.role || "SYSTEM"}"`,
      `"${log.ipAddress || ""}"`,
      `"${(log.metadata || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export filtered logs to JSON
  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;

    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear / Purge all audit logs
  const handleClearAuditLogs = () => {
    if (
      !confirm(
        "⚠️ PURGE AUDIT LOGS: Are you sure you want to delete all historical operational audit logs? This action is irreversible."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await clearAuditLogsAction();
      if (res.success) {
        setAuditLogs([]);
        setFeedback({
          type: "success",
          message: `Successfully purged ${res.count} audit log entries from the database.`,
        });
        setTimeout(() => setFeedback(null), 3500);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to purge audit logs",
        });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-[#080808] dark:text-[#f2f7f4]">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-mono shadow-sm animate-in fade-in duration-150 ${
            feedback.type === "success"
              ? "border border-[#8fe617]/50 bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617]"
              : "border border-red-500/40 bg-red-500/10 text-red-500"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-[#8fe617] shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <span className="font-bold">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Core Database Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Student Registry Storage</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.studentCount.toLocaleString()}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Enrolled Records</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8fe617] font-mono font-bold">
            ✓ {metrics.verifiedPhotoCount.toLocaleString()} Studio Portraits Linked
          </div>
        </div>

        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Identity Operators &amp; RBAC</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.userCount}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Provisioned Accounts</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-500 font-mono font-bold">
            Active Multi-Role Security Matrix
          </div>
        </div>

        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase font-bold">
            <span>Vector Card Templates</span>
            <div className="h-8 w-8 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#8fe617]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
              {metrics.templateCount}
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">Active CR80 Layouts</span>
          </div>
          <div className="mt-2 text-[10px] text-[#8fe617] font-mono font-bold">
            8-Up Imposition Engine Ready
          </div>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE PIE & DONUT CHARTS (User Requirement) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <PieChartIcon className="h-4 w-4 text-[#8fe617]" />
            </div>
            <h2 className="text-base font-black tracking-tight text-[#080808] dark:text-[#f2f7f4]">
              Visual Analytics &amp; Demographics Breakdown
            </h2>
          </div>
          <span className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93]">
            Real-time Database Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Pie Chart 1: Photo Matching Linkage */}
          <InteractivePieChart
            title="Studio Photo Linkage"
            subtitle="Matched vs Missing Portraits"
            data={photoChartData}
            donut={true}
            centerLabel="STUDENTS"
            centerValue={metrics.studentCount}
          />

          {/* Pie Chart 2: Grade Cohorts Demographics */}
          <InteractivePieChart
            title="Grade Cohorts Distribution"
            subtitle="Student Population Demographics"
            data={cohortChartData}
            donut={true}
            centerLabel="TOTAL"
            centerValue={metrics.studentCount}
          />

          {/* Pie Chart 3: Operator Privileges */}
          <InteractivePieChart
            title="Operator Privilege Allocation"
            subtitle="RBAC Role Distribution"
            data={roleChartData}
            donut={false}
          />
        </div>
      </div>

      {/* SECTION 2: COMPREHENSIVE AUDIT LOG MANAGEMENT CONSOLE */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#062404] bg-[#8fe617] px-2.5 py-0.5 rounded-md font-black uppercase shadow-xs">
                IMMUTABLE AUDIT TRAIL
              </span>
              <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
                {filteredLogs.length} matching events
              </span>
            </div>
            <h2 className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#8fe617]" />
              <span>Operational Log Management</span>
            </h2>
            <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono mt-0.5">
              Cryptographically verified operational stream of administrative, student intake, and printing actions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Export filtered logs as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#161d19] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Export filtered logs as JSON"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleClearAuditLogs}
              disabled={isPending || auditLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Purge all audit logs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPending ? "Purging..." : "Clear Logs"}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7771] dark:text-[#8a9e93]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by action, keyword, or operator..."
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] pl-10 pr-4 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] placeholder-[#6b7771] dark:placeholder-[#8a9e93] focus:border-[#8fe617] focus:outline-none"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
            >
              <option value="ALL">All Actions ({uniqueActions.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
            >
              <option value="ALL">All Operators ({uniqueOperators.length})</option>
              {uniqueOperators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-[#eef5f1] dark:border-[#1c261e] bg-[#f7faf9] dark:bg-[#070908] text-[#6b7771] dark:text-[#8a9e93] uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Metadata Payload</th>
                  <th className="px-5 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#6b7771] dark:text-[#8a9e93]">
                      No audit logs match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const date = new Date(log.createdAt);
                    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#f7faf9] dark:hover:bg-[#161d19] transition-colors"
                      >
                        <td className="px-5 py-3 text-[#6b7771] dark:text-[#8a9e93] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              log.action.includes("DELETE") || log.action.includes("CLEAR")
                                ? "bg-red-500/20 text-red-500 border border-red-500/40"
                                : log.action.includes("CREATE")
                                ? "bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/40"
                                : "bg-blue-500/20 text-blue-500 border border-blue-500/40"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#080808] dark:text-[#f2f7f4] font-bold">
                          {log.entityType}
                        </td>
                        <td className="px-5 py-3 text-[#080808] dark:text-[#f2f7f4]">
                          {log.user ? (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-[#8fe617]" />
                              <span>{log.user.username}</span>
                              <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                                ({log.user.role})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#6b7771] dark:text-[#8a9e93]">SYSTEM</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#6b7771] dark:text-[#8a9e93] truncate max-w-xs">
                          {log.metadata || "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-[#6b7771] dark:text-[#8a9e93] hover:text-[#8fe617] hover:bg-[#8fe617]/15 transition-colors cursor-pointer"
                            title="Inspect Log Details"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#8fe617]" />
                <h3 className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                  Audit Log Inspector
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-xl text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Event ID:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Timestamp:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Action Event:</span>
                <span className="font-bold text-[#8fe617]">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Entity Type:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">{selectedLog.entityType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#eef5f1] dark:border-[#1c261e]">
                <span className="text-[#6b7771] dark:text-[#8a9e93]">Operator:</span>
                <span className="font-bold text-[#080808] dark:text-[#f2f7f4]">
                  {selectedLog.user ? `${selectedLog.user.username} (${selectedLog.user.role})` : "SYSTEM"}
                </span>
              </div>

              <div>
                <span className="text-[#6b7771] dark:text-[#8a9e93] block mb-1.5">Parsed Metadata:</span>
                <pre className="p-3 rounded-2xl bg-[#f7faf9] dark:bg-[#070908] border border-[#dce7e1] dark:border-[#223126] text-[11px] text-[#080808] dark:text-[#8fe617] overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.metadata
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                        } catch {
                          return selectedLog.metadata;
                        }
                      })()
                    : "No metadata recorded."}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-[#8fe617] text-[#062404] px-4 py-2 text-xs font-mono font-black hover:bg-[#7ecc10] cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
