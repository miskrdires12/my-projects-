"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER STATION & HARDWARE PREFERENCES
// Exclusively for Sender Station operators:
// - Studio Theme (Light / Dark Night Mode)
// - Camera Studio Hardware & 300 DPI Resolution
// - Student Registration Defaults (Grade, School, ID Prefix)
// - High-Capacity IndexedDB Cache & Draft Buffer Management
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  Camera,
  HardDrive,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Save,
  Moon,
  Sun,
  Layers,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { getStudentCountFromDB } from "@/lib/idb-storage";

interface SenderSettings {
  theme: "light" | "dark";
  cameraFacing: "environment" | "user";
  photoQuality: "300dpi" | "150dpi";
  shutterSound: boolean;
  autoOpenCropper: boolean;
  defaultGrade: string;
  schoolName: string;
  campusName: string;
  academicYear: string;
  idPrefix: string;
  autoPrefixPhone: boolean;
}

const DEFAULT_SENDER_SETTINGS: SenderSettings = {
  theme: "dark",
  cameraFacing: "environment",
  photoQuality: "300dpi",
  shutterSound: true,
  autoOpenCropper: true,
  defaultGrade: "10",
  schoolName: "Silicon Labs Academy",
  campusName: "Main Campus",
  academicYear: "2026-2027",
  idPrefix: "SB-",
  autoPrefixPhone: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SenderSettings>(DEFAULT_SENDER_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageUsedKb, setStorageUsedKb] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);

  // Load saved sender settings & storage metrics on mount
  useEffect(() => {
    try {
      // Determine initial theme from root class or localStorage
      const isDark = document.documentElement.classList.contains("dark");
      const savedTheme = (localStorage.getItem("sb_theme") as "light" | "dark") || (isDark ? "dark" : "light");

      const rawSettings = localStorage.getItem("sb_app_settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        setSettings({
          ...DEFAULT_SENDER_SETTINGS,
          ...parsed,
          theme: savedTheme || parsed.theme || "dark",
        });
      } else {
        setSettings((prev) => ({ ...prev, theme: savedTheme }));
      }

      // Calculate localStorage byte footprint
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (localStorage.getItem(key) || "").length * 2;
        }
      }
      setStorageUsedKb(Math.round(totalBytes / 1024));

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
      console.warn("Error loading sender settings:", e);
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
      localStorage.setItem("sb_app_settings", JSON.stringify(settings));
      localStorage.setItem("sb_theme", settings.theme);
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Failed to save settings to device storage.");
    }
  };

  const handleResetSettings = () => {
    if (confirm("Reset Sender Station settings to factory defaults?")) {
      setSettings(DEFAULT_SENDER_SETTINGS);
      localStorage.setItem("sb_app_settings", JSON.stringify(DEFAULT_SENDER_SETTINGS));
      handleApplyTheme(DEFAULT_SENDER_SETTINGS.theme);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleClearDraftCache = () => {
    if (confirm("Clear temporary photo draft buffers and unattached captures? (Registered students in database will NOT be affected)")) {
      try {
        localStorage.removeItem("sb_student_draft");
        localStorage.removeItem("sb_photo_draft");
        alert("Draft buffers cleared successfully.");
        window.location.reload();
      } catch (e) {
        alert("Failed to clear draft buffer.");
      }
    }
  };

  const handleExportBackup = () => {
    try {
      const studentsRaw = localStorage.getItem("sb_enrolled_students") || "[]";
      const settingsRaw = localStorage.getItem("sb_app_settings") || "{}";
      const backupData = {
        app: "SiliconLabs Student Bridge Sender Station",
        version: "2.5.0",
        exportDate: new Date().toISOString(),
        settings: JSON.parse(settingsRaw),
        students: JSON.parse(studentsRaw),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StudentBridge_SenderBackup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Error generating station backup archive.");
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.students && Array.isArray(data.students)) {
          localStorage.setItem("sb_enrolled_students", JSON.stringify(data.students));
        }
        if (data.settings) {
          localStorage.setItem("sb_app_settings", JSON.stringify(data.settings));
          setSettings(data.settings);
          if (data.settings.theme) {
            handleApplyTheme(data.settings.theme);
          }
        }

        alert(`Sender backup restored! ${data.students?.length || 0} student records verified.`);
        window.location.reload();
      } catch (err) {
        alert("Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dce7e1] dark:border-[#26332b] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8fe617] font-bold tracking-wider uppercase">
              SENDER STATION
            </span>
            <span className="text-xs text-[#6b7771] dark:text-[#7f9488]">/</span>
            <span className="text-xs text-[#6b7771] dark:text-[#7f9488]">HARDWARE &amp; DEFAULTS</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5 mt-1">
            <Smartphone className="h-6 w-6 text-[#8fe617]" />
            <span>Sender Station Settings</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#7f9488] mt-0.5">
            Configure camera studio hardware, registration defaults, studio theme, and local high-capacity cache
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] px-3.5 py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] cool-btn-hover transition-colors shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_20px_rgba(143,230,23,0.35)] cool-btn-hover transition-all cursor-pointer"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-[#8fe617] bg-[#8fe617]/15 dark:bg-[#8fe617]/10 p-3.5 flex items-center gap-2.5 text-xs font-mono font-bold text-[#062404] dark:text-[#8fe617] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
          <span>Sender settings updated and saved to local station storage.</span>
        </div>
      )}

      {/* 1. Studio Theme & Visual Mode */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#8fe617]/15 flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4]">Studio Visual Theme</h2>
            <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Choose between daylight studio mode or deep dark night mode</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleApplyTheme("dark")}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cool-hover ${
              settings.theme === "dark"
                ? "border-[#8fe617] bg-[#8fe617]/10 dark:bg-[#8fe617]/15 ring-2 ring-[#8fe617]/50 shadow-sm"
                : "border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-[#080808] text-[#8fe617] flex items-center justify-center shrink-0 border border-[#26332b]">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                <span>Dark / Night Mode</span>
                {settings.theme === "dark" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488] mt-1">
                Deep matte dark studio workspace with vivid Lemon Green accents. Reduces eye fatigue during all-day registration.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyTheme("light")}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cool-hover ${
              settings.theme === "light"
                ? "border-[#8fe617] bg-[#8fe617]/10 ring-2 ring-[#8fe617]/50 shadow-sm"
                : "border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2">
                <span>Light Studio Mode</span>
                {settings.theme === "light" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617] text-[#062404] font-black">ACTIVE</span>
                )}
              </div>
              <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488] mt-1">
                Clean daylight high-contrast studio mode for well-lit rooms and outdoor photo setups.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Camera Studio & Photo Hardware Settings */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#8fe617]/15 flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
            <Camera className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4]">Camera Studio &amp; Lens Hardware</h2>
            <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Mobile camera lens defaults, 300 DPI resolution, and shutter controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#080808] dark:text-[#f2f7f4] block">Default Camera Lens</span>
              <span className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Rear lens (sharpest) or front selfie</span>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-[#161c18] border border-[#dce7e1] dark:border-[#26332b] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, cameraFacing: "environment" })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                  settings.cameraFacing === "environment"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#7f9488] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                Back (Rear)
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, cameraFacing: "user" })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                  settings.cameraFacing === "user"
                    ? "bg-[#8fe617] text-[#062404] shadow-xs"
                    : "text-[#6b7771] dark:text-[#7f9488] hover:text-[#080808] dark:hover:text-[#f2f7f4]"
                }`}
              >
                Front (Selfie)
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#080808] dark:text-[#f2f7f4] block">Studio Photo Resolution</span>
              <span className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">JFIF 300 DPI metadata injection for ID card printing</span>
            </div>
            <select
              value={settings.photoQuality}
              onChange={(e) => setSettings({ ...settings, photoQuality: e.target.value as any })}
              className="rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] px-3 py-1.5 font-mono text-xs font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
            >
              <option value="300dpi">300 DPI (Ultra Crisp)</option>
              <option value="150dpi">150 DPI (Standard)</option>
            </select>
          </div>

          <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#080808] dark:text-[#f2f7f4] block">Auto-Open Cropper After Snap</span>
              <span className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Open 3:4 studio sliding crop editor on capture</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoOpenCropper}
                onChange={(e) => setSettings({ ...settings, autoOpenCropper: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8fe617]"></div>
            </label>
          </div>

          <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#080808] dark:text-[#f2f7f4] block">Camera Shutter Audio</span>
              <span className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Audible click feedback when photo is snapped</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shutterSound}
                onChange={(e) => setSettings({ ...settings, shutterSound: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8fe617]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Student Registration Defaults Card */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#8fe617]/15 flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4]">Student Registration Defaults</h2>
            <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Default values auto-populated for incoming students to maximize registration speed</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-[#080808] dark:text-[#f2f7f4] mb-1">
              Default Grade (Number)
            </label>
            <input
              type="text"
              value={settings.defaultGrade}
              onChange={(e) => setSettings({ ...settings, defaultGrade: e.target.value })}
              className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2 font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
              placeholder="e.g. 10 or 9"
            />
            <span className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-0.5 block">Entered as clean number</span>
          </div>

          <div>
            <label className="block font-medium text-[#080808] dark:text-[#f2f7f4] mb-1">
              Student ID Prefix
            </label>
            <input
              type="text"
              value={settings.idPrefix}
              onChange={(e) => setSettings({ ...settings, idPrefix: e.target.value })}
              className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2 font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
              placeholder="e.g. SB-"
            />
            <span className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-0.5 block">Generates {settings.idPrefix}2026-XXXXX</span>
          </div>

          <div>
            <label className="block font-medium text-[#080808] dark:text-[#f2f7f4] mb-1">
              Active Academic Year
            </label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2 font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
              placeholder="e.g. 2026-2027"
            />
            <span className="text-[10px] text-[#6b7771] dark:text-[#7f9488] mt-0.5 block">Default batch session</span>
          </div>

          <div>
            <label className="block font-medium text-[#080808] dark:text-[#f2f7f4] mb-1">
              School / Institution Name
            </label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
              className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2 text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
              placeholder="e.g. Silicon Labs Academy"
            />
          </div>

          <div>
            <label className="block font-medium text-[#080808] dark:text-[#f2f7f4] mb-1">
              Campus / Department
            </label>
            <input
              type="text"
              value={settings.campusName}
              onChange={(e) => setSettings({ ...settings, campusName: e.target.value })}
              className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2 text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
              placeholder="e.g. Main Campus"
            />
          </div>

          <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-3 flex items-center justify-between self-end">
            <div>
              <span className="font-semibold text-[#080808] dark:text-[#f2f7f4] block">Auto-Format Phone</span>
              <span className="text-[10px] text-[#6b7771] dark:text-[#7f9488]">Standardize prefix (e.g. 2519...)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-2 shrink-0">
              <input
                type="checkbox"
                checked={settings.autoPrefixPhone}
                onChange={(e) => setSettings({ ...settings, autoPrefixPhone: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8fe617]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 4. High-Capacity IndexedDB & Draft Cache Management */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#8fe617]/15 flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#080808] dark:text-[#f2f7f4]">High-Capacity Storage &amp; Draft Cache</h2>
              <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">Offline-ready database health, buffer management, and backup archive</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-[#8fe617]/15 text-[#062404] dark:text-[#8fe617]">
            {studentCount} Students Cached
          </span>
        </div>

        {/* Database & High-Capacity Storage Health */}
        <div className="rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dce7e1] dark:border-[#26332b] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#8fe617] animate-pulse" />
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">High-Capacity IndexedDB Engine</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] font-black">
                  UNLIMITED QUOTA
                </span>
              </div>
              <p className="text-[11px] text-[#6b7771] dark:text-[#7f9488] mt-0.5">
                Multi-gigabyte persistent storage capable of storing 6,000+ to 100,000+ students and high-resolution portraits offline and online.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-mono font-black text-[#080808] dark:text-[#f2f7f4]">{studentCount} Students</div>
              <div className="text-[10px] font-mono text-[#8fe617] font-bold">100% Retained</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="rounded-lg bg-white dark:bg-[#161c18] border border-[#dce7e1] dark:border-[#26332b] p-2.5 space-y-1">
              <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] uppercase">Settings Footprint</div>
              <div className="font-bold text-[#080808] dark:text-[#f2f7f4]">{storageUsedKb} KB (Optimal)</div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488]">Station defaults &amp; hardware flags</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-[#161c18] border border-[#dce7e1] dark:border-[#26332b] p-2.5 space-y-1">
              <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488] uppercase">Station Real-Time Sync</div>
              <div className="font-bold text-[#8fe617] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8fe617]" />
                <span>Active &amp; Broadcasting</span>
              </div>
              <div className="text-[10px] text-[#6b7771] dark:text-[#7f9488]">Receiver workstation auto-receives records</div>
            </div>
          </div>
        </div>

        {/* Station Backup & Cache Flush */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#080808] dark:bg-black text-[#f2f7f4] p-3 text-xs font-mono font-bold hover:bg-neutral-800 transition-colors shadow-xs cool-btn-hover"
          >
            <Download className="h-4 w-4 text-[#8fe617]" />
            <span>Export Station Backup</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] p-3 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] transition-colors cursor-pointer shadow-xs cool-btn-hover">
            <Upload className="h-4 w-4 text-[#6b7771] dark:text-[#7f9488]" />
            <span>Restore From JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleClearDraftCache}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-3 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cool-btn-hover"
          >
            <Trash2 className="h-4 w-4" />
            <span>Flush Photo Draft Cache</span>
          </button>
        </div>
      </div>

      {/* 5. System Status & Brand Card */}
      <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative shrink-0">
            <Image
              src="/logo.png"
              alt="Silicon Labs"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-1.5">
              <span>Silicon Labs Student Bridge</span>
              <span className="bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                SENDER STATION
              </span>
            </div>
            <div className="text-[11px] text-[#6b7771] dark:text-[#7f9488]">
              6,000+ Daily Student Capacity • Ultra-Fast Studio • Lemon Green #8fe617
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#062404] dark:text-[#8fe617] bg-[#8fe617]/15 border border-[#8fe617]/30 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-[#8fe617]" />
          <span>Sender Hardware Operational</span>
        </div>
      </div>
    </div>
  );
}
