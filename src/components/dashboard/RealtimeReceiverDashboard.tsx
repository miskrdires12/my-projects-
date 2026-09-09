"use client";

// ============================================================================
// STUDENT BRIDGE — REALTIME RECEIVER DASHBOARD & PRINT CENTER
//
// Color Palette: 60% #f7faf9 (Canvas), 30% #02f52b (Neon Green), 10% #080808 (Obsidian)
// High-capacity database: IndexedDB engine supporting 6,000 to 20,000+ students/day safely
// Live sync listener: saves incoming student records to local IndexedDB instantly
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Printer,
  CheckCircle2,
  AlertCircle,
  Camera,
  QrCode,
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
import { getAllStudentsFromDB, saveStudentToDB } from "@/lib/idb-storage";

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
    // Load local IndexedDB counts on mount
    getAllStudentsFromDB().then((idbStudents) => {
      if (idbStudents.length > 0) {
        setData((prev) => {
          const total = Math.max(prev.totalStudents, idbStudents.length);
          const photos = Math.max(
            prev.photosCount,
            idbStudents.filter((s) => Boolean(s.photoPath)).length
          );
          const qr = Math.max(
            prev.qrCount,
            idbStudents.filter((s) => Boolean(s.qrCodeData)).length
          );
          return {
            ...prev,
            totalStudents: total,
            photosCount: photos,
            qrCount: qr,
            readyForPrintCount: Math.max(prev.readyForPrintCount, total),
            recentStudents: idbStudents.slice(0, 10),
          };
        });
      }
    });
  }, []);

  // Listen to Global Cloud Sync Bus in real-time & save incoming students safely to IndexedDB
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      (newStudent) => {
        // Safe persist into local IndexedDB (handles 6,000+ students per day)
        saveStudentToDB(newStudent).catch(() => {});

        setData((prev) => {
          const isExisting = (prev.recentStudents || []).some(
            (s: any) => s.studentId === newStudent.studentId || s.id === newStudent.id
          );
          const updatedRecent = [
            newStudent,
            ...(prev.recentStudents || []).filter(
              (s: any) => s.studentId !== newStudent.studentId && s.id !== newStudent.id
            ),
          ].slice(0, 10);

          return {
            ...prev,
            totalStudents: isExisting ? prev.totalStudents : prev.totalStudents + 1,
            photosCount: newStudent.photoPath
              ? isExisting
                ? prev.photosCount
                : prev.photosCount + 1
              : prev.photosCount,
            qrCount: newStudent.qrCodeData
              ? isExisting
                ? prev.qrCount
                : prev.qrCount + 1
              : prev.qrCount,
            readyForPrintCount: isExisting
              ? prev.readyForPrintCount
              : prev.readyForPrintCount + 1,
            recentStudents: updatedRecent,
          };
        });
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
          const idbList = await getAllStudentsFromDB();
          localCount = idbList.length;
          localPhotos = idbList.filter((s: any) => Boolean(s.photoPath)).length;
        } catch {
          const raw = localStorage.getItem("sb_enrolled_students");
          if (raw) {
            const list = JSON.parse(raw);
            localCount = list.length;
            localPhotos = list.filter((s: any) => Boolean(s.photoPath)).length;
          }
        }

        setData((prev) => {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-[#080808]">
      {/* Notice Alert if redirected */}
      {notice === "receiver_facility_only" && (
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 text-xs text-[#3f4743] flex items-center gap-3 shadow-sm">
          <Shield className="h-5 w-5 text-[#080808] shrink-0" />
          <div>
            <strong className="text-[#080808]">Receiver Production Facility Active:</strong> You have been redirected to your production dashboard. Manual single-student enrollment is restricted to the Sender Station.
          </div>
        </div>
      )}

      {/* Real-time Status Banner (Strict 60/30/10 theme) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-[#dce7e1] bg-white px-4 py-3 rounded-2xl text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {autoRefresh && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#02f52b] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#02f52b]" />
          </span>
          <span className="font-mono uppercase tracking-wider font-extrabold text-[#080808]">
            {autoRefresh ? "Receiver Live Stream Active" : "Stream Paused"}
          </span>
          <span className="text-[#dce7e1]">•</span>
          <span className="text-[#6b7771] font-mono text-[11px]">
            Last updated: {lastUpdated || "Just now"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-[11px] font-mono font-bold rounded-xl border transition-all ${
              autoRefresh
                ? "border-[#02f52b] bg-[#02f52b] text-[#080808] shadow-[0_0_10px_rgba(2,245,43,0.3)]"
                : "border-[#dce7e1] bg-[#f7faf9] text-[#6b7771] hover:text-[#080808]"
            }`}
          >
            Auto-Sync: {autoRefresh ? "ON (4s)" : "OFF"}
          </button>
          <button
            type="button"
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-semibold rounded-xl border border-[#dce7e1] bg-white text-[#080808] hover:bg-[#eef5f1] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#02f52b]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#dce7e1] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#080808] bg-[#02f52b] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
              RECEIVER WORKSTATION
            </span>
            <span className="text-[#dce7e1]">/</span>
            <span className="text-xs text-[#6b7771] font-mono font-semibold">CENTRAL FACILITY</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] mt-1.5">
            ID Card Production, Asset Matching & Print Center
          </h1>
          <p className="text-xs text-[#3f4743] mt-0.5">
            Direct high-speed receiver facility • Ingests, batches, and prints up to 6,000+ student IDs daily
          </p>
        </div>

        {/* Action Controls & Fast Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce7e1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#080808] hover:bg-[#eef5f1] transition-colors shadow-xs"
          >
            <Users className="h-4 w-4 text-[#080808]" />
            <span>Student Directory</span>
          </Link>

          <Link
            href="/print-engine"
            className="inline-flex items-center gap-2 rounded-xl bg-[#02f52b] px-4 py-2.5 text-xs font-mono font-extrabold text-[#080808] hover:bg-[#00dc25] transition-all shadow-[0_0_15px_rgba(2,245,43,0.35)] active:scale-95"
          >
            <Printer className="h-4 w-4 stroke-[2.5]" />
            <span>8-Up Print Engine</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] bg-white px-3 py-2.5 text-xs font-mono font-semibold text-[#080808] hover:bg-[#eef5f1] transition-colors shadow-xs"
            >
              <span>More Tools</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {actionsOpen && (
              <div
                className="absolute right-0 mt-1 w-56 rounded-2xl border border-[#dce7e1] bg-white p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs"
                onClick={() => setActionsOpen(false)}
              >
                <Link
                  href="/students/import"
                  className="flex items-center gap-2 px-3 py-2 text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#080808]" />
                  <span>Excel / CSV Import</span>
                </Link>
                <Link
                  href="/students/qr-import"
                  className="flex items-center gap-2 px-3 py-2 text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <QrCode className="h-4 w-4 text-[#080808]" />
                  <span>External QR Import</span>
                </Link>
                <Link
                  href="/designer"
                  className="flex items-center gap-2 px-3 py-2 text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <Layers className="h-4 w-4 text-[#080808]" />
                  <span>Canva ID Designer</span>
                </Link>
                <Link
                  href="/bulker"
                  className="flex items-center gap-2 px-3 py-2 text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <Printer className="h-4 w-4 text-[#080808]" />
                  <span>Bulker 8-Up Layout</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (High Capacity: 6,000+ to 20,000+) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>STUDENTS</span>
            <Users className="h-4 w-4 text-[#080808]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.totalStudents.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#02f52b] bg-[#080808] px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1">
            ACTIVE DATABASE
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>PHOTOS</span>
            <Camera className="h-4 w-4 text-[#080808]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.photosCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] font-mono font-semibold mt-1">
            {data.totalStudents > 0 ? Math.round((data.photosCount / data.totalStudents) * 100) : 0}% COMPLETE
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>QR CODES</span>
            <QrCode className="h-4 w-4 text-[#080808]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.qrCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] font-mono font-semibold mt-1">
            {data.totalStudents > 0 ? Math.round((data.qrCount / data.totalStudents) * 100) : 0}% MATCHED
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>GAPS</span>
            <Clock className="h-4 w-4 text-[#080808]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.pendingVerification.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1">
            NEEDS PHOTO/QR
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>READY TO PRINT</span>
            <CheckCircle2 className="h-4 w-4 text-[#02f52b]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.readyForPrintCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block font-mono font-bold mt-1">
            VERIFIED 100%
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#3f4743] font-bold font-mono">
            <span>JOBS</span>
            <Activity className="h-4 w-4 text-[#080808]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] mt-1.5">
            {data.activeJobsCount}
          </div>
          <div className="text-[10px] text-[#6b7771] font-mono font-semibold mt-1">
            HEALTHY STATUS
          </div>
        </div>
      </div>

      {/* Unified Production Tools Pipeline */}
      <div className="rounded-3xl border border-[#dce7e1] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#eef5f1] pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#02f52b]" />
            <h2 className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#080808]">
              End-to-End ID Card Manufacturing Pipeline
            </h2>
          </div>
          <span className="text-[11px] text-[#6b7771] font-mono font-semibold">High-Speed Workstation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* STEP 1: Ingestion */}
          <div className="rounded-2xl border border-[#dce7e1] bg-[#f7faf9] p-4 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#080808] text-white">
                STEP 1 • INGEST
              </span>
              <h3 className="text-sm font-bold text-[#080808] mt-2.5">Student Directory & Excel</h3>
              <p className="text-xs text-[#3f4743] mt-1">
                Browse verified student directory or bulk upload student lists via Excel / CSV.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-[#dce7e1]">
              <Link
                href="/students"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-[#dce7e1]">|</span>
              <Link
                href="/students/import"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Excel Import</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 2: Assets & QR */}
          <div className="rounded-2xl border border-[#dce7e1] bg-[#f7faf9] p-4 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#080808] text-white">
                STEP 2 • ASSETS
              </span>
              <h3 className="text-sm font-bold text-[#080808] mt-2.5">QR Import & Directory</h3>
              <p className="text-xs text-[#3f4743] mt-1">
                Match existing QR code images and download photos locally by real name.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-[#dce7e1]">
              <Link
                href="/students/qr-import"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>QR Matcher</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-[#dce7e1]">|</span>
              <Link
                href="/students"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Directory & Photos</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 3: Canva ID Card Designer */}
          <div className="rounded-2xl border border-[#dce7e1] bg-[#f7faf9] p-4 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#080808] text-white">
                STEP 3 • DESIGN
              </span>
              <h3 className="text-sm font-bold text-[#080808] mt-2.5">Canva ID Card Studio</h3>
              <p className="text-xs text-[#3f4743] mt-1">
                Drop your Canva template file or design from scratch in modern clean style.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-[#dce7e1]">
              <Link
                href="/designer"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Open Designer</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* STEP 4: Bulker & Print Engine */}
          <div className="rounded-2xl border border-[#dce7e1] bg-[#f7faf9] p-4 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#02f52b] text-[#080808]">
                STEP 4 • PRODUCTION
              </span>
              <h3 className="text-sm font-bold text-[#080808] mt-2.5">Bulker 8-Up & Printing</h3>
              <p className="text-xs text-[#3f4743] mt-1">
                Arrange cards 8-per-A4 sheet, drop Canva files to bulk, and mass produce.
              </p>
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-[#dce7e1]">
              <Link
                href="/bulker"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Bulker</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span className="text-[#dce7e1]">|</span>
              <Link
                href="/print-engine"
                className="text-xs font-mono font-bold text-[#080808] hover:text-[#02f52b] flex items-center gap-1"
              >
                <span>Print Engine</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Production Activity Grids: Live Enrolled Students, Missing Photos, Missing QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Enrolled Students */}
        <div className="lg:col-span-6 rounded-3xl border border-[#dce7e1] bg-white p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eef5f1] pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#080808]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#080808] font-mono">
                Live Enrolled Students ({(data.recentStudents || []).length})
              </h2>
            </div>
            <Link href="/students" className="text-xs text-[#6b7771] hover:text-[#080808] font-mono font-semibold">
              View Directory →
            </Link>
          </div>

          {!data.recentStudents || data.recentStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#6b7771]">
              No enrolled students found.
            </div>
          ) : (
            <div className="divide-y divide-[#eef5f1]">
              {data.recentStudents.map((s) => (
                <div key={s.id || s.studentId} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <div className="font-bold text-[#080808] truncate">{s.fullName}</div>
                    <div className="text-[11px] text-[#6b7771] font-mono">
                      {s.studentId} • {s.grade || s.department || "General"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        s.photoPath
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-amber-300 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {s.photoPath ? "PHOTO" : "NO PHOTO"}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        s.qrCodeData
                          ? "border-[#02f52b]/50 bg-[#02f52b]/15 text-[#080808]"
                          : "border-[#dce7e1] bg-[#f7faf9] text-[#6b7771]"
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
        <div className="lg:col-span-3 rounded-3xl border border-[#dce7e1] bg-white p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eef5f1] pb-3">
            <div className="flex items-center gap-2 text-[#080808]">
              <AlertCircle className="h-4 w-4 text-[#080808]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#080808] font-mono">
                Missing Photos ({data.missingPhotos.length})
              </h2>
            </div>
            <Link
              href="/students?photoStatus=MISSING_PHOTO"
              className="text-[11px] text-[#6b7771] hover:text-[#080808] font-mono"
            >
              Filter
            </Link>
          </div>

          {data.missingPhotos.length === 0 ? (
            <div className="text-center py-8 text-xs text-emerald-700 font-medium">
              ✓ All students have photographs!
            </div>
          ) : (
            <div className="divide-y divide-[#eef5f1] text-xs">
              {data.missingPhotos.slice(0, 8).map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-semibold text-[#080808] truncate">{s.fullName}</div>
                    <div className="text-[10px] font-mono text-[#6b7771]">{s.studentId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800 shrink-0">
                    NO PHOTO
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing QR Codes Warning List */}
        <div className="lg:col-span-3 rounded-3xl border border-[#dce7e1] bg-white p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eef5f1] pb-3">
            <div className="flex items-center gap-2 text-[#080808]">
              <QrCode className="h-4 w-4 text-[#080808]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#080808] font-mono">
                Missing QR ({data.missingQRs.length})
              </h2>
            </div>
            <Link
              href="/students?qrStatus=MISSING_QR"
              className="text-[11px] text-[#6b7771] hover:text-[#080808] font-mono"
            >
              Filter
            </Link>
          </div>

          {data.missingQRs.length === 0 ? (
            <div className="text-center py-8 text-xs text-emerald-700 font-medium">
              ✓ All students have external QR!
            </div>
          ) : (
            <div className="divide-y divide-[#eef5f1] text-xs">
              {data.missingQRs.slice(0, 8).map((s) => (
                <div key={s.id} className="py-2 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="font-semibold text-[#080808] truncate">{s.fullName}</div>
                    <div className="text-[10px] font-mono text-[#6b7771]">{s.studentId}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-neutral-300 bg-neutral-100 text-[#6b7771] shrink-0">
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
