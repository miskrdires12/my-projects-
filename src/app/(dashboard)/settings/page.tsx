"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Camera,
  HardDrive,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  FileSpreadsheet,
  Smartphone,
  Save,
} from "lucide-react";
import Image from "next/image";

interface AppSettings {
  schoolName: string;
  campusName: string;
  academicYear: string;
  cameraFacing: "user" | "environment";
  autoOpenCropper: boolean;
  photoQuality: "300dpi" | "150dpi";
  shutterSound: boolean;
  defaultExportFormat: "csv" | "xlsx";
  autoPrefixPhone: boolean;
  receiverFolderPath: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  schoolName: "Silicon Labs Academy",
  campusName: "Main Campus",
  academicYear: "2025-2026",
  cameraFacing: "environment",
  autoOpenCropper: true,
  photoQuality: "300dpi",
  shutterSound: true,
  defaultExportFormat: "csv",
  autoPrefixPhone: true,
  receiverFolderPath: "C:\\SiliconLabs\\Credentials",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [storageUsedKb, setStorageUsedKb] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);

  // Load saved settings & storage usage on mount
  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem("sb_app_settings");
      if (rawSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      }

      // Calculate localStorage consumption
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalBytes += (localStorage.getItem(key) || "").length * 2;
        }
      }
      setStorageUsedKb(Math.round(totalBytes / 1024));

      const rawStudents = localStorage.getItem("sb_enrolled_students");
      if (rawStudents) {
        const list = JSON.parse(rawStudents);
        if (Array.isArray(list)) setStudentCount(list.length);
      }
    } catch (e) {
      console.warn("Error reading settings/storage:", e);
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("sb_app_settings", JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      alert("Failed to save settings to device storage.");
    }
  };

  const handleResetSettings = () => {
    if (confirm("Reset all application settings to factory defaults?")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("sb_app_settings", JSON.stringify(DEFAULT_SETTINGS));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleClearCache = () => {
    if (confirm("Clear temporary cache, photo draft buffers, and deleted tombstones?")) {
      try {
        localStorage.removeItem("sb_student_draft");
        localStorage.removeItem("sb_deleted_student_ids");
        alert("Cache cleared successfully. Performance optimized.");
        window.location.reload();
      } catch (e) {
        alert("Failed to clear cache.");
      }
    }
  };

  const handleExportBackup = () => {
    try {
      const studentsRaw = localStorage.getItem("sb_enrolled_students") || "[]";
      const settingsRaw = localStorage.getItem("sb_app_settings") || "{}";
      const backupData = {
        app: "SiliconLabs Student Bridge",
        version: "2.4.0",
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
      a.download = `SiliconLabs_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Error generating backup archive.");
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
        }

        alert(`Backup restored successfully! ${data.students?.length || 0} student records reloaded.`);
        window.location.reload();
      } catch (err) {
        alert("Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              SYSTEM CONTROL
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">APP PREFERENCES</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Smartphone className="h-6 w-6 text-accent" />
            <span>Institutional APK Settings</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Configure camera studio hardware, real-time data storage, institution branding, and export pipelines
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetSettings}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-neutral-100 transition-colors shadow-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="flex items-center gap-2 rounded-xl bg-[#02f52b] px-5 py-2 text-xs font-bold text-[#080808] hover:brightness-105 shadow-glow-sm transition-all cursor-pointer"
          >
            <Save className="h-4 w-4 text-[#080808]" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl border border-[#02f52b] bg-[#02f52b]/15 p-3.5 flex items-center gap-2.5 text-xs font-semibold text-[#080808] shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-[#080808]" />
          <span>All settings updated and saved to local device storage.</span>
        </div>
      )}

      {/* 1. School & Institution Profile Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#02f52b]/20 flex items-center justify-center text-[#080808]">
            <Building2 className="h-4 w-4 text-[#080808]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Institution & Campus Profile</h2>
            <p className="text-[11px] text-foreground-muted">Branding rendered on ID badges and official exports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">School / Organization Name</label>
            <input
              type="text"
              value={settings.schoolName}
              onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
              placeholder="e.g. Silicon Labs Academy"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Campus / Branch</label>
            <input
              type="text"
              value={settings.campusName}
              onChange={(e) => setSettings({ ...settings, campusName: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
              placeholder="e.g. Main Campus"
            />
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Active Academic Year</label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none font-mono"
              placeholder="e.g. 2025-2026"
            />
          </div>
        </div>
      </div>

      {/* 2. Camera & Photo Studio Settings */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#02f52b]/20 flex items-center justify-center text-[#080808]">
            <Camera className="h-4 w-4 text-[#080808]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Camera Studio & Cropper Hardware</h2>
            <p className="text-[11px] text-foreground-muted">Mobile phone camera lenses, studio crop ratio, and resolution</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-border bg-surface-secondary/60 p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">Default Camera Lens</span>
              <span className="text-[11px] text-foreground-muted">Choose front selfie or back camera for registration</span>
            </div>
            <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, cameraFacing: "environment" })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  settings.cameraFacing === "environment"
                    ? "bg-[#02f52b] text-[#080808] font-bold shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Back (Environment)
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, cameraFacing: "user" })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  settings.cameraFacing === "user"
                    ? "bg-[#02f52b] text-[#080808] font-bold shadow-xs"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Front (Selfie)
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary/60 p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">Auto-Open Cropper After Capture</span>
              <span className="text-[11px] text-foreground-muted">Instantly open 3:4 studio cropper when photo taken</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoOpenCropper}
                onChange={(e) => setSettings({ ...settings, autoOpenCropper: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02f52b]"></div>
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary/60 p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">Output Photo DPI</span>
              <span className="text-[11px] text-foreground-muted">JFIF header DPI specification for ID card printing</span>
            </div>
            <select
              value={settings.photoQuality}
              onChange={(e) => setSettings({ ...settings, photoQuality: e.target.value as any })}
              className="rounded-lg border border-border bg-white px-3 py-1.5 font-mono text-xs font-semibold text-foreground focus:border-accent focus:outline-none"
            >
              <option value="300dpi">300 DPI (Ultra Crisp)</option>
              <option value="150dpi">150 DPI (Standard)</option>
            </select>
          </div>

          <div className="rounded-xl border border-border bg-surface-secondary/60 p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">Camera Shutter Audio</span>
              <span className="text-[11px] text-foreground-muted">Audible shutter sound feedback on capture</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.shutterSound}
                onChange={(e) => setSettings({ ...settings, shutterSound: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02f52b]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Export & Receiver Settings */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="h-8 w-8 rounded-lg bg-[#02f52b]/20 flex items-center justify-center text-[#080808]">
            <FileSpreadsheet className="h-4 w-4 text-[#080808]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Export & Receiver Directory Preferences</h2>
            <p className="text-[11px] text-foreground-muted">6-column strict output format (StudentID, Name, Sex, Grade, Phone, @photo)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-foreground mb-1">Default Quick Export Format</label>
            <select
              value={settings.defaultExportFormat}
              onChange={(e) => setSettings({ ...settings, defaultExportFormat: e.target.value as any })}
              className="w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
            >
              <option value="csv">CSV (Comma-Separated Values, UTF-8 BOM)</option>
              <option value="xlsx">Excel Workbook (.xlsx)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-foreground mb-1">Local Receiver Folder Path</label>
            <input
              type="text"
              value={settings.receiverFolderPath}
              onChange={(e) => setSettings({ ...settings, receiverFolderPath: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-2 text-foreground font-mono focus:border-accent focus:outline-none"
              placeholder="C:\SiliconLabs\Credentials"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-border bg-surface-secondary/60 p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-foreground block">Auto-Normalize Telephone Phone Numbers</span>
              <span className="text-[11px] text-foreground-muted">Automatically ensure format (e.g. 251912345678) for Ethiopian & global lines</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPrefixPhone}
                onChange={(e) => setSettings({ ...settings, autoPrefixPhone: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02f52b]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Real APK Storage & Backup Management */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#02f52b]/20 flex items-center justify-center text-[#080808]">
              <HardDrive className="h-4 w-4 text-[#080808]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Storage Meter & Database Backup</h2>
              <p className="text-[11px] text-foreground-muted">Real-time local storage health, backup archives, and cache purge</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-100 text-[#080808]">
            {studentCount} Students Cached
          </span>
        </div>

        {/* Live Storage Meter Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-foreground-muted">Local Storage Meter:</span>
            <span className="font-bold text-foreground">{storageUsedKb} KB / ~5,120 KB</span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full bg-[#02f52b] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, (storageUsedKb / 5120) * 100))}%` }}
            />
          </div>
        </div>

        {/* Backup & Restore Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 rounded-xl bg-black text-white p-3 text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-[#02f52b]" />
            <span>Export Full DB Backup</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white p-3 text-xs font-bold text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer shadow-xs">
            <Upload className="h-4 w-4 text-neutral-600" />
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
            onClick={handleClearCache}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Cache & Temp</span>
          </button>
        </div>
      </div>

      {/* 5. System Status & Brand Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Silicon Labs Student Bridge Pro</span>
              <span className="bg-[#02f52b]/20 text-[#080808] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                v2.4.0 APK
              </span>
            </div>
            <div className="text-[11px] text-foreground-muted">
              High-Speed Next.js Web Engine • 60/30/10 Architecture • 300 DPI Studio
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>System Healthy & Operational</span>
        </div>
      </div>
    </div>
  );
}
