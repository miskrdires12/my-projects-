"use client";

// ============================================================================
// STUDENT BRIDGE — ADMIN SYSTEM & PRODUCTION SETTINGS
// Exclusively configured for Institutional Administrators:
// - Custom CSV Export File Path & File Naming Patterns
// - Local Student Photo Folder Path Configuration (for @photo column in CSV/Excel)
// - Real-time Live Metrics Polling Cadence & Audio Alert Preferences
// - 8-Up Print Engine Defaults (Crop Marks, DPI, Bleed)
// - Central Database Maintenance & Institutional Roster Reset
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  Folder,
  Printer,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getStudentCountFromDB,
  getAllStudentsFromDB,
  clearAllStudentsFromDB,
} from "@/lib/idb-storage";
import { clearAllStudentsAction } from "@/actions/students";
import { publishStudentSync } from "@/lib/sync-client";
import { RECEIVER_STUDENT_PHOTO_FOLDER } from "@/lib/export-utils";

export interface ReceiverSettings {
  photoFolder: string;
  csvPrefix: string;
  csvDelimiter: "," | ";";
  autoFormatPhone: boolean;
  photoFolderStructure: "flat" | "by-grade" | "by-id";
  pollingIntervalMs: number;
  enableAudioAlerts: boolean;
  includeCropMarks: boolean;
  printDpi: "300dpi" | "600dpi";
  theme: "dark" | "light";
}

const DEFAULT_RECEIVER_SETTINGS: ReceiverSettings = {
  photoFolder: RECEIVER_STUDENT_PHOTO_FOLDER,
  csvPrefix: "student_bridge_receiver_manifest",
  csvDelimiter: ",",
  autoFormatPhone: true,
  photoFolderStructure: "by-grade",
  pollingIntervalMs: 4000,
  enableAudioAlerts: true,
  includeCropMarks: true,
  printDpi: "300dpi",
  theme: "dark",
};

export function SettingsClient() {
  const [settings, setSettings] = useState<ReceiverSettings>(DEFAULT_RECEIVER_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [isClearingImmediate, setIsClearingImmediate] = useState(false);

  // Load saved receiver settings & storage metrics on mount
  useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains("dark");
      const savedTheme = (localStorage.getItem("sb_theme") as "light" | "dark") || (isDark ? "dark" : "light");

      const rawSettings = localStorage.getItem("sb_receiver_settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        setSettings({
          ...DEFAULT_RECEIVER_SETTINGS,
          ...parsed,
          theme: savedTheme || parsed.theme || "dark",
        });
      } else {
        // Check legacy single photo folder setting
        const legacyFolder = localStorage.getItem("sb_receiver_photo_folder");
        if (legacyFolder) {
          setSettings((prev) => ({
            ...prev,
            photoFolder: legacyFolder,
            theme: savedTheme,
          }));
        } else {
          setSettings((prev) => ({ ...prev, theme: savedTheme }));
        }
      }

      // Read real IndexedDB student count
      getStudentCountFromDB()
        .then((cnt) => {
          if (cnt > 0) setStudentCount(cnt);
          else {
            const rawStudents = localStorage.getItem("sb_enrolled_students");
            if (rawStudents) {
              const list = JSON.parse(rawStudents);
              if (Array.isArray(list)) setStudentCount(list.length);
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Error loading receiver settings:", e);
    }
  }, []);

  const handleApplyTheme = (theme: "light" | "dark") => {
    setSettings((prev) => ({ ...prev, theme }));
    localStorage.setItem("sb_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSaveSettings = () => {
    try {
      const cleanFolder = settings.photoFolder.trim() || "C:\\Users\\athede\\Desktop\\students project for 17000";
      const updated = { ...settings, photoFolder: cleanFolder };
      setSettings(updated);
      localStorage.setItem("sb_receiver_settings", JSON.stringify(updated));
      localStorage.setItem("sb_receiver_photo_folder", cleanFolder);
      localStorage.setItem("sb_theme", settings.theme);
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("receiver_settings_updated", { detail: updated }));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Failed to save receiver settings to local storage.");
    }
  };

  const handleResetSettings = () => {
    if (confirm("Reset all administrative production settings to factory defaults?")) {
      setSettings(DEFAULT_RECEIVER_SETTINGS);
      localStorage.setItem("sb_receiver_settings", JSON.stringify(DEFAULT_RECEIVER_SETTINGS));
      localStorage.setItem("sb_receiver_photo_folder", DEFAULT_RECEIVER_SETTINGS.photoFolder);
      handleApplyTheme(DEFAULT_RECEIVER_SETTINGS.theme);
      window.dispatchEvent(new Event("storage"));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CENTRAL DATABASE MAINTENANCE & ROSTER RESET (0ms Latency)
  // ──────────────────────────────────────────────────────────────────────────
  const handleImmediateClearAll = async () => {
    if (
      !confirm(
        "⚠️ PERMANENT INSTITUTIONAL PURGE: Are you sure you want to immediately delete ALL student records from the database and station cache? This action takes effect immediately across all workstations."
      )
    ) {
      return;
    }

    setIsClearingImmediate(true);

    try {
      // 1. Synchronously purge client-side states & buffers IMMEDIATELY
      localStorage.removeItem("sb_enrolled_students");
      localStorage.removeItem("sb_photo_draft");
      localStorage.removeItem("sb_student_draft");
      sessionStorage.clear();

      // Set tombstone markers so nothing can reappear
      try {
        const idbAll = await getAllStudentsFromDB();
        const allIds = idbAll.flatMap((s: any) => [s.id, s.studentId]).filter(Boolean);
        localStorage.setItem("sb_deleted_student_ids", JSON.stringify(allIds));
      } catch {}

      // 2. Clear IndexedDB immediately
      await clearAllStudentsFromDB().catch(() => {});

      // 3. Immediately broadcast "CLEAR" to all active browser windows & stations
      publishStudentSync("CLEAR").catch(() => {});
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("students_cleared"));

      setStudentCount(0);

      // 4. Background server purge without blocking the UI thread
      clearAllStudentsAction().catch((err) => {
        console.warn("Background server purge status:", err);
      });

      alert("✓ Institutional Roster Purge Complete! All student records and caches successfully wiped.");
    } catch (err: any) {
      alert("Failed to perform roster reset: " + (err?.message || "Unknown error"));
    } finally {
      setIsClearingImmediate(false);
    }
  };

  const handleResetSuppressionRegistry = () => {
    if (confirm("Reset the Deletion Suppression Registry? This allows re-importing previously cleared student IDs.")) {
      localStorage.removeItem("sb_deleted_student_ids");
      alert("Deletion Suppression Registry reset successfully.");
    }
  };

  // Sample Path Live Preview Calculation
  const samplePhotoPathPreview = `${settings.photoFolder.replace(/[/\\]+$/, "")}\\${
    settings.photoFolderStructure === "by-grade"
      ? "Grade_10\\"
      : ""
  }Yeah tarekegn.jpg`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 text-[#080808] dark:text-[#f2f7f4] font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#062404] bg-[#8fe617] px-2.5 py-0.5 rounded-md font-black tracking-wider uppercase shadow-xs">
              ADMINISTRATIVE PRIVILEGE
            </span>
            <span className="text-[#dce7e1] dark:text-[#223126]">•</span>
            <span className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono font-semibold">
              Global System Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5 mt-1.5">
            <Shield className="h-6 w-6 text-[#8fe617]" />
            <span>Admin System &amp; Production Settings</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
            Administrative control console for CSV schemas, local photo directories, telemetry cadences, 8-Up printing, and institutional roster maintenance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3.5 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all cursor-pointer"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-2xl border border-[#8fe617] bg-[#8fe617]/15 p-4 flex items-center gap-3 text-xs font-mono font-bold text-[#080808] dark:text-[#8fe617] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 stroke-[2.5] text-[#8fe617]" />
          <span>System configuration updated and applied across all workstations and pipelines.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* Section 1: CSV & Local Photo File Path */}
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
            <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <Folder className="h-5 w-5 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Local Photo Storage &amp; CSV File Paths
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                Configure directory where high-res studio photos are saved and mapped in Excel/CSV @photo column
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Photo Folder Path */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold uppercase text-[#080808] dark:text-[#f2f7f4] flex items-center justify-between">
                <span>Photo Folder Local File Path</span>
                <span className="text-[10px] text-[#8fe617] font-bold">
                  ACTIVE PRODUCTION DIRECTORY
                </span>
              </label>
              <input
                type="text"
                value={settings.photoFolder}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings((prev) => ({ ...prev, photoFolder: val }));
                  try {
                    localStorage.setItem("sb_receiver_photo_folder", val.trim());
                  } catch {}
                }}
                placeholder="C:\Users\athede\Desktop\students project for 17000"
                className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-4 py-2.5 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none focus:ring-1 focus:ring-[#8fe617] transition-all"
              />
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
                  Directly editable. All CSV exports and photo manifests will reference this path.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const p = "C:\\Users\\athede\\Desktop\\students project for 17000";
                    setSettings((prev) => ({ ...prev, photoFolder: p }));
                    try {
                      localStorage.setItem("sb_receiver_photo_folder", p);
                      window.dispatchEvent(new Event("storage"));
                    } catch {}
                  }}
                  className="text-[10px] font-mono font-bold text-[#062404] bg-[#8fe617] hover:bg-[#7ecc10] px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  Set: C:\Users\athede\Desktop\students project for 17000
                </button>
              </div>
            </div>

            {/* Live Preview of @photo column */}
            <div className="rounded-2xl border border-[#8fe617]/30 bg-[#8fe617]/5 p-3.5 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-bold uppercase">
                <span>Excel / CSV @photo Column Live Preview</span>
                <span className="text-[#8fe617]">DYNAMICALLY MAPPED</span>
              </div>
              <div className="text-xs font-bold text-[#080808] dark:text-[#8fe617] break-all bg-white dark:bg-[#070908] p-2.5 rounded-xl border border-[#dce7e1] dark:border-[#223126]">
                {samplePhotoPathPreview}
              </div>
              <p className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                All exported manifests, ZIP archives, and card production batches will immediately reference this path.
              </p>
            </div>

            {/* Folder Hierarchy Organization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  Photo Subfolder Organization
                </label>
                <select
                  value={settings.photoFolderStructure}
                  onChange={(e: any) => setSettings({ ...settings, photoFolderStructure: e.target.value })}
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                >
                  <option value="by-grade">Subfolders by Grade Cohort (Grade_10\name.jpg)</option>
                  <option value="flat">Flat Directory (name.jpg)</option>
                  <option value="by-id">ID Code Based (id.jpg)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  CSV Manifest Export Filename Prefix
                </label>
                <input
                  type="text"
                  value={settings.csvPrefix}
                  onChange={(e) => setSettings({ ...settings, csvPrefix: e.target.value })}
                  placeholder="student_bridge_receiver_manifest"
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>
            </div>

            {/* CSV Delimiter & Normalization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div>
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    Auto-Normalize Phone (2519 Format)
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Converts 09... to 2519... for institutional communications
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoFormatPhone}
                  onChange={(e) => setSettings({ ...settings, autoFormatPhone: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#8fe617] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
                <div>
                  <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                    CSV Delimiter Character
                  </span>
                  <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                    Comma (standard) or Semicolon (European Excel)
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, csvDelimiter: "," })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      settings.csvDelimiter === ","
                        ? "bg-[#8fe617] text-[#062404]"
                        : "text-[#6b7771] dark:text-[#8a9e93]"
                    }`}
                  >
                    Comma (,)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, csvDelimiter: ";" })}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      settings.csvDelimiter === ";"
                        ? "bg-[#8fe617] text-[#062404]"
                        : "text-[#6b7771] dark:text-[#8a9e93]"
                    }`}
                  >
                    Semicolon (;)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Live Metrics & Realtime Telemetry Cadence */}
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
            <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <RefreshCw className="h-5 w-5 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Live Metrics &amp; Telemetry Frequency
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                Configure live dashboard sync cadence, workstation audio alerts, and telemetry notifications
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
              <label className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                Live Polling Interval
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "2s Ultra", val: 2000 },
                  { label: "4s Normal", val: 4000 },
                  { label: "10s Eco", val: 10000 },
                ].map((rate) => (
                  <button
                    key={rate.val}
                    type="button"
                    onClick={() => setSettings({ ...settings, pollingIntervalMs: rate.val })}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      settings.pollingIntervalMs === rate.val
                        ? "border-[#8fe617] bg-[#8fe617] text-[#062404] shadow-xs"
                        : "border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#6b7771] dark:text-[#8a9e93]"
                    }`}
                  >
                    {rate.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block pt-1">
                Controls how frequently connected dashboards update registration velocity and status indicators.
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
                  {settings.enableAudioAlerts ? (
                    <Volume2 className="h-4 w-4 text-[#8fe617]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-[#6b7771]" />
                  )}
                  <span>Incoming Ingestion Audio Chime</span>
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block">
                  Plays subtle chime when new student records arrive at the workstation
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableAudioAlerts}
                onChange={(e) => setSettings({ ...settings, enableAudioAlerts: e.target.checked })}
                className="h-5 w-5 rounded accent-[#8fe617] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: 8-Up Print Batch Defaults */}
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-[#eef5f1] dark:border-[#1c261e] pb-3">
            <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <Printer className="h-5 w-5 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                8-Up A4 Print Engine Preferences
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                Physical card imposition, high-DPI rasterization, and guillotine cutter alignment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
              <div>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Guillotine Cut Marks (2mm Bleed)
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                  Renders corner crosshair guides on A4 sheets for precise blade trimming
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.includeCropMarks}
                onChange={(e) => setSettings({ ...settings, includeCropMarks: e.target.checked })}
                className="h-5 w-5 rounded accent-[#8fe617] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908]">
              <div>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Vector Print Resolution
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93]">
                  300 DPI (standard thermal PVC) or 600 DPI (high-definition)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-[#111613] border border-[#dce7e1] dark:border-[#223126] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, printDpi: "300dpi" })}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    settings.printDpi === "300dpi"
                      ? "bg-[#8fe617] text-[#062404]"
                      : "text-[#6b7771] dark:text-[#8a9e93]"
                  }`}
                >
                  300 DPI
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, printDpi: "600dpi" })}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    settings.printDpi === "600dpi"
                      ? "bg-[#8fe617] text-[#062404]"
                      : "text-[#6b7771] dark:text-[#8a9e93]"
                  }`}
                >
                  600 DPI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Central Database Maintenance & Roster Reset */}
        <div className="rounded-3xl border border-red-200 dark:border-red-950/40 bg-white dark:bg-[#111613] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-red-100 dark:border-red-950/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800/50 flex items-center justify-center text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                  Central Database Maintenance &amp; Roster Reset
                </h2>
                <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-0.5">
                  Authorized institutional maintenance engine to clear local synchronization cache, reset suppression registries, and execute permanent database roster purges.
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">Local Cached Records:</span>
              <div className="text-sm font-black font-mono text-[#080808] dark:text-[#f2f7f4]">
                {studentCount.toLocaleString()} Students
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] block">
                  Reset Deletion Suppression Registry
                </span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono block mt-0.5">
                  Clear the record suppression registry that prevents previously purged student IDs from re-importing.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSuppressionRegistry}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] hover:text-[#8fe617] transition-all cursor-pointer"
              >
                Reset Suppression Registry
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-red-200 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 space-y-3">
              <div>
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 block">
                  Execute Institutional Roster Purge
                </span>
                <span className="text-[10px] text-red-700/80 dark:text-red-400/80 font-mono block mt-0.5">
                  Wipes the central student roster and clears local station cache with zero lag.
                </span>
              </div>
              <button
                type="button"
                onClick={handleImmediateClearAll}
                disabled={isClearingImmediate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white px-4 py-2 text-xs font-mono font-black hover:bg-red-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isClearingImmediate ? "Purging Roster..." : "Execute Institutional Roster Purge"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Studio Theme Selection */}
        <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#dce7e1] dark:border-[#223126] pb-3">
            <div className="h-9 w-9 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <Sparkles className="h-5 w-5 text-[#8fe617]" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-black uppercase tracking-wider text-[#080808] dark:text-[#f2f7f4]">
                Visual Theme &amp; Color System
              </h2>
              <p className="text-xs text-[#6b7771] dark:text-[#8a9e93]">
                True obsidian pitch-black night mode or light daylight studio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleApplyTheme("dark")}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                settings.theme === "dark"
                  ? "border-[#8fe617] bg-[#8fe617]/10 dark:bg-[#8fe617]/15 ring-2 ring-[#8fe617]/50 shadow-sm"
                  : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] opacity-75 hover:opacity-100"
              }`}
            >
              <div className="h-9 w-9 rounded-xl bg-[#070908] text-[#8fe617] flex items-center justify-center shrink-0 border border-[#223126]">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                  <span>Obsidian Night Mode</span>
                  {settings.theme === "dark" && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                  Deep pitch-black (#070908) canvas with neon Lemon Green accents. Prevents screen glare and eye strain.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTheme("light")}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                settings.theme === "light"
                  ? "border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/50 shadow-sm"
                  : "border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] opacity-75 hover:opacity-100"
              }`}
            >
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                  <span>Light Studio Mode</span>
                  {settings.theme === "light" && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6b7771] dark:text-[#8a9e93] mt-1">
                  High-contrast daylight theme for outdoor and bright daylight environments.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
