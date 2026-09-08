"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Printer,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode,
  Download,
  Activity,
  ArrowUpRight,
  Clock,
  Layers,
  FileSpreadsheet,
  Shield,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

import { subscribeToCloudSync } from "@/lib/sync-client";

interface ReceiverDashboardProps {
  initialData: {
    totalStudents: number;
    photosCount: number;
    qrCount: number;
    readyForPrintCount: number;
    pendingVerification: number;
    activeJobsCount: number;
    recentStudents?: any[];
    recentBatches?: any[];
    missingPhotos: any[];
    missingQRs: any[];
  };
  notice?: string;
}

export default function RealtimeReceiverDashboard({ initialData, notice }: ReceiverDashboardProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // Listen to Global Cloud Sync Bus in real-time
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      (newStudent) => {
        setData((prev) => ({
          ...prev,
          totalStudents: prev.totalStudents + 1,
          photosCount: newStudent.photoPath ? prev.photosCount + 1 : prev.photosCount,
          qrCount: newStudent.qrCodeData ? prev.qrCount + 1 : prev.qrCount,
          readyForPrintCount: prev.readyForPrintCount + 1,
        }));
        setLastUpdated(new Date().toLocaleTimeString());
      },
      () => {
        fetchMetrics();
      },
      () => {
        setData((prev) => ({
          ...prev,
          totalStudents: 0,
          photosCount: 0,
          qrCount: 0,
          readyForPrintCount: 0,
          recentStudents: [],
          recentBatches: [],
          missingPhotos: [],
          missingQRs: [],
        }));
        setLastUpdated(new Date().toLocaleTimeString());
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/dashboard/live-metrics?role=RECEIVER", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        let localCount = 0;
        let localPhotos = 0;
        try {
          const raw = localStorage.getItem("sb_enrolled_students");
          if (raw) {
            const list = JSON.parse(raw);
            localCount = list.length;
            localPhotos = list.filter((s: any) => Boolean(s.photoPath)).length;
          }
        } catch {}

        setData((prev) => {
          // Never drop student counts to 0 if we previously had students
          const total = Math.max(json.metrics.totalStudents, localCount, prev.totalStudents);
          const photos = Math.max(json.metrics.photosCount, localPhotos, prev.photosCount);
          const qr = Math.max(json.metrics.qrCount, localCount, prev.qrCount);
          const ready = Math.max(json.metrics.readyForPrintCount, localCount, prev.readyForPrintCount);

          return {
            totalStudents: total,
            photosCount: photos,
            qrCount: qr,
            readyForPrintCount: ready,
            pendingVerification: json.metrics.pendingVerification,
            activeJobsCount: json.metrics.activeJobsCount,
            recentStudents: json.recentStudents && json.recentStudents.length > 0 ? json.recentStudents : prev.recentStudents,
            recentBatches: json.recentBatches && json.recentBatches.length > 0 ? json.recentBatches : prev.recentBatches,
            missingPhotos: json.missingPhotos || [],
            missingQRs: json.missingQRs || [],
          };
        });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to poll receiver metrics:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-white">
      {/* Notice Alert if redirected */}
      {notice === "receiver_facility_only" && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4 text-xs text-neutral-300 flex items-center gap-3">
          <Shield className="h-5 w-5 text-white shrink-0" />
          <div>
            <strong className="text-white">Receiver Production Facility Active:</strong> You have been redirected to your production dashboard. Manual single-student enrollment is restricted to the Sender Station.
          </div>
        </div>
      )}

      {/* Real-time Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-neutral-800 bg-neutral-950 px-4 py-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="font-mono uppercase tracking-wider font-semibold text-white">
            {autoRefresh ? "Real-time Production Stream Active" : "Stream Paused"}
          </span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-400 font-mono text-[11px]">
            Last updated: {lastUpdated || "Just now"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
              autoRefresh
                ? "border-white bg-white text-black font-semibold"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            Auto-Sync: {autoRefresh ? "ON (4s)" : "OFF"}
          </button>
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded border border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white font-semibold tracking-wider uppercase">
              RECEIVER CENTRAL FACILITY
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-xs text-neutral-400 font-mono">20,000+ HIGH-THROUGHPUT SYSTEM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            ID Production, Asset Matching & Print Center
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage student credentials, attach external QR codes, download photos, layout on A4, and print ID cards
          </p>
        </div>

        {/* Action Controls & Fast Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/students/download-photos"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download Photos (.zip)</span>
          </Link>

          <Link
            href="/print-engine"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4 stroke-[2.5]" />
            <span>8-Up Print Engine</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              <span>More Tools</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {actionsOpen && (
              <div
                className="absolute right-0 mt-1 w-56 rounded-lg border border-neutral-700 bg-neutral-950 p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setActionsOpen(false)}
              >
                <Link
                  href="/students/import"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white rounded"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel / CSV Import</span>
                </Link>
                <Link
                  href="/students/qr-import"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white rounded"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>External QR Import</span>
                </Link>
                <Link
                  href="/designer"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white rounded"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Canva ID Designer</span>
                </Link>
                <Link
                  href="/bulker"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white rounded"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Bulker 8-Up Layout</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monochrome Primary KPI Grid (20,000+ Scale) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Student Database</span>
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.totalStudents.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">20,000+ SYSTEM</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Photos Ingested</span>
            <Camera className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.photosCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
            {data.totalStudents > 0 ? Math.round((data.photosCount / data.totalStudents) * 100) : 0}% COMPLETE
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>External QR Attached</span>
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.qrCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
            {data.totalStudents > 0 ? Math.round((data.qrCount / data.totalStudents) * 100) : 0}% IMPORTED
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Gaps Detected</span>
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.pendingVerification.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">NEEDS PHOTO / QR</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Ready to Print</span>
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.readyForPrintCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">VERIFIED 100%</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Active Queue</span>
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1.5">
            {data.activeJobsCount}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">HEALTHY STATUS</div>
        </div>
      </div>

      {/* Unified Production Tools Pipeline (Gathered Together as Requested) */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              End-to-End ID Card Manufacturing Pipeline
            </h2>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">Gathered Receiver Toolset</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* STEP 1: Ingestion */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-neutral-700 bg-black text-neutral-300">
                  STEP 1 • INGEST
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-2.5">Student Directory & Excel</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Browse verified student directory or bulk upload student lists via Excel / CSV.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-neutral-800">
              <Link
                href="/students"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-neutral-600">|</span>
              <Link
                href="/students/import"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Excel Import</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 2: Assets & QR */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-neutral-700 bg-black text-neutral-300">
                  STEP 2 • ASSETS
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-2.5">QR Import & Directory</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Match existing QR code images and download photos locally by real name.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-neutral-800">
              <Link
                href="/students/qr-import"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>QR Matcher</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-neutral-600">|</span>
              <Link
                href="/students/download-photos"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Photo ZIP</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 3: Canva ID Card Designer */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-neutral-700 bg-black text-neutral-300">
                  STEP 3 • DESIGN
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-2.5">Canva ID Card Studio</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Drop your Canva template file or design from scratch in monochrome style.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-neutral-800">
              <Link
                href="/designer"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Open Designer</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 4: Bulker & Print Engine */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-neutral-700 bg-black text-neutral-300">
                  STEP 4 • PRODUCTION
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-2.5">Bulker 8-Up & Printing</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Arrange cards 8-per-A4 sheet, drop Canva files to bulk, and mass produce.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-neutral-800">
              <Link
                href="/bulker"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Bulker</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-neutral-600">|</span>
              <Link
                href="/print-engine"
                className="text-xs font-mono text-white hover:underline flex items-center gap-1"
              >
                <span>Print Engine</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Production Discrepancy & Activity Grids: Live Enrolled Students, Missing Photos, Missing QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Enrolled Students */}
        <div className="lg:col-span-6 rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Live Enrolled Students ({(data.recentStudents || []).length})
              </h2>
            </div>
            <Link href="/students" className="text-xs text-neutral-400 hover:text-white font-mono">
              View Directory →
            </Link>
          </div>

          {!data.recentStudents || data.recentStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-500">
              No enrolled students found.
            </div>
          ) : (
            <div className="divide-y divide-neutral-900">
              {data.recentStudents.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <div className="font-medium text-white truncate">{s.fullName}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {s.studentId} • {s.department || s.grade || "General"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        s.photoPath
                          ? "border-green-800 bg-green-950/50 text-green-400"
                          : "border-amber-800 bg-amber-950/50 text-amber-400"
                      }`}
                    >
                      {s.photoPath ? "PHOTO" : "NO PHOTO"}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        s.qrCodeData
                          ? "border-sky-800 bg-sky-950/50 text-sky-400"
                          : "border-neutral-800 bg-neutral-900 text-neutral-400"
                      }`}
                    >
                      {s.qrCodeData ? "QR" : "NO QR"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing Photos Warning List */}
        <div className="lg:col-span-3 rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-white">
              <AlertCircle className="h-4 w-4 text-white" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Missing Photos ({data.missingPhotos.length})
              </h2>
            </div>
            <Link
              href="/students?photoStatus=MISSING_PHOTO"
              className="text-[11px] text-neutral-400 hover:text-white font-mono"
            >
              Filter
            </Link>
          </div>

          {data.missingPhotos.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400">
              ✓ All students have photographs!
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 text-xs">
              {data.missingPhotos.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-medium text-white truncate">{s.fullName}</div>
                    <div className="text-[10px] font-mono text-neutral-400">{s.studentId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 shrink-0">
                    NO PHOTO
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing QR Codes Warning List */}
        <div className="lg:col-span-3 rounded-lg border border-neutral-800 bg-neutral-950 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-white">
              <QrCode className="h-4 w-4 text-white" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Missing QR ({data.missingQRs.length})
              </h2>
            </div>
            <Link
              href="/students?qrStatus=MISSING_QR"
              className="text-[11px] text-neutral-400 hover:text-white font-mono"
            >
              Filter
            </Link>
          </div>

          {data.missingQRs.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400">
              ✓ All students have external QR!
            </div>
          ) : (
            <div className="divide-y divide-neutral-900 text-xs">
              {data.missingQRs.map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-medium text-white truncate">{s.fullName}</div>
                    <div className="text-[10px] font-mono text-neutral-400">{s.studentId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 shrink-0">
                    NO QR
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
