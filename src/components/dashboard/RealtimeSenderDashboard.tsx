"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Camera,
  Boxes,
  RefreshCw,
  ArrowUpRight,
  Receipt,
  FolderArchive,
  ChevronDown,
  Shield,
  Clock,
} from "lucide-react";

import { subscribeToCloudSync } from "@/lib/sync-client";
import { getAllStudentsFromDB } from "@/lib/idb-storage";

interface SenderDashboardProps {
  initialData: {
    totalEnrolled: number;
    enrolledToday: number;
    photosCaptured: number;
    totalBatches: number;
    draftBatchesCount: number;
    sentBatchesCount: number;
    recentStudents: any[];
    recentBatches: any[];
  };
  notice?: string;
}

export default function RealtimeSenderDashboard({ initialData, notice }: SenderDashboardProps) {
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
          totalEnrolled: prev.totalEnrolled + 1,
          enrolledToday: prev.enrolledToday + 1,
          photosCaptured: newStudent.photoPath ? prev.photosCaptured + 1 : prev.photosCaptured,
          recentStudents: [newStudent, ...prev.recentStudents.filter((s) => s.studentId !== newStudent.studentId)].slice(0, 10),
        }));
        setLastUpdated(new Date().toLocaleTimeString());
      },
      () => {
        fetchMetrics();
      },
      () => {
        setData((prev) => ({
          ...prev,
          totalEnrolled: 0,
          enrolledToday: 0,
          photosCaptured: 0,
          recentStudents: [],
        }));
        setLastUpdated(new Date().toLocaleTimeString());
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/dashboard/live-metrics?role=SENDER", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        let localCount = 0;
        let localPhotos = 0;
        let localStudents: any[] = [];

        // Pull from high-capacity IndexedDB first (6,000+ students)
        try {
          const idbList = await getAllStudentsFromDB();
          if (idbList && idbList.length > 0) {
            localStudents = idbList;
            localCount = idbList.length;
            localPhotos = idbList.filter((s: any) => Boolean(s.photoPath)).length;
          }
        } catch {}

        // Fallback / merge with localStorage if needed
        if (localStudents.length === 0) {
          try {
            const raw = localStorage.getItem("sb_enrolled_students");
            if (raw) {
              localStudents = JSON.parse(raw);
              localCount = localStudents.length;
              localPhotos = localStudents.filter((s: any) => Boolean(s.photoPath)).length;
            }
          } catch {}
        }

        setData((prev) => {
          const total = Math.max(json.metrics.totalEnrolled, localCount, prev.totalEnrolled);
          const today = Math.max(json.metrics.enrolledToday, localCount, prev.enrolledToday);
          const photos = Math.max(json.metrics.photosCaptured, localPhotos, prev.photosCaptured);

          const mergedStudents = [...(json.recentStudents || [])];
          for (const ls of localStudents) {
            if (!mergedStudents.some((ms: any) => ms.studentId === ls.studentId)) {
              mergedStudents.unshift(ls);
            }
          }
          for (const ps of prev.recentStudents) {
            if (!mergedStudents.some((ms: any) => ms.studentId === ps.studentId)) {
              mergedStudents.push(ps);
            }
          }

          return {
            totalEnrolled: total,
            enrolledToday: today,
            photosCaptured: photos,
            totalBatches: json.metrics.totalBatches,
            draftBatchesCount: json.metrics.draftBatchesCount,
            sentBatchesCount: json.metrics.sentBatchesCount,
            recentStudents: mergedStudents.slice(0, 10),
            recentBatches: json.recentBatches || prev.recentBatches,
          };
        });
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to poll sender metrics:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Poll every 4 seconds when autoRefresh is enabled
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
      {notice === "sender_station_only" && (
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 text-xs text-[#3f4743] flex items-center gap-3 shadow-sm">
          <Shield className="h-5 w-5 text-[#080808] shrink-0" />
          <div>
            <strong className="text-[#080808]">Sender Workstation Active:</strong> You have been redirected to your enrollment dashboard. Receiver production tools are restricted to the Central Receiver Facility.
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
            {autoRefresh ? "Real-time Live Sync Active" : "Live Sync Paused"}
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
            <span>Refresh Now</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#dce7e1] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#080808] font-extrabold tracking-wider uppercase">
              SENDER WORKSTATION
            </span>
            <span className="text-[#dce7e1]">/</span>
            <span className="text-xs text-[#6b7771] font-semibold">REGISTRATION &amp; CAPTURE CONSOLE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] mt-1">
            Student Enrollment &amp; Photo Capture
          </h1>
          <p className="text-xs text-[#6b7771] mt-0.5">
            Collect student information, take 3s auto-capture photos, group into batches, and issue receipts
          </p>
        </div>

        {/* Action Controls & Fast Dropdown */}
        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-[#02f52b] px-4 py-2 text-xs font-extrabold text-[#080808] hover:bg-[#00dc25] transition-all shadow-[0_0_12px_rgba(2,245,43,0.3)] active:scale-95"
          >
            <UserPlus className="h-4 w-4 stroke-[2.5]" />
            <span>Enroll New Student</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce7e1] bg-white px-3 py-2 text-xs font-semibold text-[#080808] hover:bg-[#eef5f1] transition-colors shadow-2xs"
            >
              <span>Quick Actions</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6b7771]" />
            </button>

            {actionsOpen && (
              <div
                className="absolute right-0 mt-1 w-56 rounded-2xl border border-[#dce7e1] bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setActionsOpen(false)}
              >
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#02f52b]" />
                  <span>Manual Registration</span>
                </Link>
                <Link
                  href="/sender/photo-import"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <FolderArchive className="h-3.5 w-3.5 text-[#02f52b]" />
                  <span>Folder Photo Matcher</span>
                </Link>
                <Link
                  href="/sender/batches"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <Boxes className="h-3.5 w-3.5 text-[#02f52b]" />
                  <span>Dispatch Batches</span>
                </Link>
                <Link
                  href="/sender/receipts"
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#080808] hover:bg-[#eef5f1] rounded-xl font-medium"
                >
                  <Receipt className="h-3.5 w-3.5 text-[#02f52b]" />
                  <span>Print Registration Receipts</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strict 60/30/10 KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm hover:border-[#02f52b] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6b7771]">
            <span className="font-semibold">Total Enrolled</span>
            <Users className="h-4 w-4 text-[#02f52b]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#080808] mt-2">
            {data.totalEnrolled.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] mt-1 font-mono">DATABASE TOTAL</div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm hover:border-[#02f52b] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6b7771]">
            <span className="font-semibold">Enrolled Today</span>
            <UserPlus className="h-4 w-4 text-[#02f52b]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#080808] mt-2">
            {data.enrolledToday.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] mt-1 font-mono">CURRENT WORK SHIFT</div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm hover:border-[#02f52b] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6b7771]">
            <span className="font-semibold">Photos Attached</span>
            <Camera className="h-4 w-4 text-[#02f52b]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#080808] mt-2">
            {data.photosCaptured.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#6b7771] mt-1 font-mono">
            {data.totalEnrolled > 0
              ? Math.round((data.photosCaptured / data.totalEnrolled) * 100)
              : 0}
            % OF ENROLLED
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm hover:border-[#02f52b] transition-colors">
          <div className="flex items-center justify-between text-xs text-[#6b7771]">
            <span className="font-semibold">Transfer Batches</span>
            <Boxes className="h-4 w-4 text-[#02f52b]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#080808] mt-2">{data.totalBatches}</div>
          <div className="text-[10px] text-[#6b7771] mt-1 font-mono">
            {data.sentBatchesCount} SENT • {data.draftBatchesCount} DRAFT
          </div>
        </div>
      </div>

      {/* Unified Sender Tools Pipeline */}
      <div className="rounded-2xl border border-[#dce7e1] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#dce7e1] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#02f52b]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
              Enrollment Operations Pipeline
            </h2>
          </div>
          <span className="text-[11px] text-[#6b7771] font-mono">Step-by-step workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/register"
            className="rounded-xl border border-[#dce7e1] bg-[#f7faf9] p-4 hover:border-[#02f52b] hover:shadow-[0_0_15px_rgba(2,245,43,0.15)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] bg-white text-[#080808] font-bold">
                STEP 1
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] group-hover:text-[#080808] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] mt-3">1. Student Registration</h3>
            <p className="text-xs text-[#6b7771] mt-1">
              High-resolution camera photo, precision crop studio, and student information
            </p>
          </Link>

          <Link
            href="/sender/photo-import"
            className="rounded-xl border border-[#dce7e1] bg-[#f7faf9] p-4 hover:border-[#02f52b] hover:shadow-[0_0_15px_rgba(2,245,43,0.15)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] bg-white text-[#080808] font-bold">
                STEP 2
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] group-hover:text-[#080808] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] mt-3">2. Folder Photo Match</h3>
            <p className="text-xs text-[#6b7771] mt-1">
              Import a folder of portraits and auto-match by student ID
            </p>
          </Link>

          <Link
            href="/sender/batches"
            className="rounded-xl border border-[#dce7e1] bg-[#f7faf9] p-4 hover:border-[#02f52b] hover:shadow-[0_0_15px_rgba(2,245,43,0.15)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] bg-white text-[#080808] font-bold">
                STEP 3
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] group-hover:text-[#080808] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] mt-3">3. Dispatch Batches</h3>
            <p className="text-xs text-[#6b7771] mt-1">
              Create batches, validate completeness, and transmit to Receiver
            </p>
          </Link>

          <Link
            href="/sender/receipts"
            className="rounded-xl border border-[#dce7e1] bg-[#f7faf9] p-4 hover:border-[#02f52b] hover:shadow-[0_0_15px_rgba(2,245,43,0.15)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[#dce7e1] bg-white text-[#080808] font-bold">
                STEP 4
              </span>
              <ArrowUpRight className="h-4 w-4 text-[#6b7771] group-hover:text-[#080808] transition-colors" />
            </div>
            <h3 className="text-sm font-bold text-[#080808] mt-3">4. Print Receipts</h3>
            <p className="text-xs text-[#6b7771] mt-1">
              Issue enrollment proof for students or print batch manifests
            </p>
          </Link>
        </div>
      </div>

      {/* Live Recent Enrolled Students Stream */}
      <div className="rounded-2xl border border-[#dce7e1] bg-white p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#dce7e1] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#6b7771]" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#080808]">
              Live Enrollment Stream ({data.recentStudents.length})
            </h2>
          </div>
          <Link
            href="/sender/receipts"
            className="text-xs text-[#080808] hover:text-[#02f52b] hover:underline font-mono font-semibold"
          >
            View All Receipts →
          </Link>
        </div>

        {data.recentStudents.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#6b7771]">
            No students enrolled yet. Click &quot;Enroll New Student&quot; to begin.
          </div>
        ) : (
          <div className="divide-y divide-[#dce7e1]">
            {data.recentStudents.map((s) => (
              <div key={s.id || s.studentId} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl border border-[#dce7e1] bg-[#f7faf9] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {s.photoPath ? (
                      <img
                        src={s.photoPath}
                        alt={s.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-4 w-4 text-[#6b7771]" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-[#080808]">{s.fullName}</div>
                    <div className="text-[11px] font-mono text-[#6b7771]">
                      ID: {s.studentId} • {s.grade}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                      s.photoPath
                        ? "border-[#02f52b] bg-[#eef5f1] text-[#080808]"
                        : "border-[#dce7e1] bg-[#f7faf9] text-[#6b7771]"
                    }`}
                  >
                    {s.photoPath ? "PHOTO READY" : "NO PHOTO"}
                  </span>
                  <Link
                    href={`/sender/receipts?studentId=${s.studentId}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#dce7e1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#080808] hover:bg-[#02f52b] transition-all shadow-2xs"
                  >
                    <Receipt className="h-3 w-3" />
                    <span>Receipt</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
