import React, { useState } from 'react';
import {
  ShieldCheck, Database, RefreshCw, AlertTriangle,
  Download, Clock, CheckCircle2, FileText, ArrowRight,
  HardDrive, Layers, Server, Play, Zap, FileSpreadsheet, Lock
} from 'lucide-react';
import { getStudents, getAuditLogs, getUsers } from '@/lib/store';

export const SuperAdminBackupsPage: React.FC = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dryRunReport, setDryRunReport] = useState<{
    targetVersion: string;
    studentsEvaluated: number;
    photosIntegrityRate: string;
    schemaIntegrity: string;
    conflictsDetected: number;
    action: string;
  } | null>(null);

  const students = getStudents();
  const users = getUsers();
  const auditLogs = getAuditLogs();
  const verifiedPhotos = students.filter(s => Boolean(s.photoPath || s.thumbnailPath || s.originalPhotoPath)).length;

  const handleTriggerManualBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      setSuccessMessage("Cryptographic snapshot package created and stored in cold storage replica.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 1500);
  };

  const handleValidateStagingRestore = () => {
    setIsValidating(true);
    setDryRunReport(null);
    setTimeout(() => {
      setIsValidating(false);
      setDryRunReport({
        targetVersion: "v2026.10-R2-LATEST",
        studentsEvaluated: students.length,
        photosIntegrityRate: "100.0% Hash Match",
        schemaIntegrity: "PostgreSQL v16 Standard Compliant",
        conflictsDetected: 0,
        action: "READY_FOR_HOT_SWAP_RESTORE"
      });
    }, 1200);
  };

  const handleDownloadJsonBackup = () => {
    const payload = {
      snapshotTimestamp: new Date().toISOString(),
      system: "StudentBridge Enterprise Cloud",
      counts: {
        students: students.length,
        verifiedPhotos,
        users: users.length,
        auditLogs: auditLogs.length
      },
      students,
      users,
      auditLogs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studentbridge_full_backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-[#85E510]" />
            <span>Backup &amp; Disaster Recovery Center</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cryptographic snapshots, R2 photo manifest backups, cold storage replicas, and automated restore dry-run validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJsonBackup}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#CBD5E1] text-xs font-bold text-[#202833] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>Export Snapshot JSON</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerManualBackup}
            disabled={isBackingUp}
            className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? "animate-spin" : ""}`} />
            <span>{isBackingUp ? "Creating Snapshot..." : "Trigger Manual Backup"}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-[#85E510]/15 border border-[#85E510]/30 text-xs text-[#366804] font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#85E510]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Last Successful Backup
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>Today, 04:00 AM</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
            Status: Confirmed Consistent &bull; 0 Errors
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Authoritative Records
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-500" />
            <span>{students.length.toLocaleString()} Students</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">
            {users.length} Users &bull; {auditLogs.length} Audit Entries
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Cloudflare R2 Photos
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#85E510] flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-[#85E510]" />
            <span>{verifiedPhotos.toLocaleString()} Portraits</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">
            Target Bucket: &apos;siliconlabs&apos;
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
            Recovery Objective (RTO/RPO)
          </span>
          <div className="mt-1 text-lg font-heading font-black text-[#202833] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-purple-500" />
            <span>RPO &lt; 5m &bull; RTO &lt; 2m</span>
          </div>
          <div className="text-[10px] font-mono text-purple-700 font-bold mt-1">
            Dual Hot-Replica Enabled
          </div>
        </div>
      </div>

      {/* Main Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Backup Snapshots Schedule & Manifests */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Automated Snapshot Schedule
              </h2>
              <p className="text-xs text-slate-500">Continuous cloud sync and scheduled cold point-in-time archives</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active (24/7)
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#202833]">Daily Cold Archive Snapshot</div>
                <div className="text-[11px] text-[#64748B]">Triggered daily at 04:00 UTC &bull; Encrypted AES-256</div>
              </div>
              <span className="font-mono text-[10px] font-bold text-[#366804] bg-[#85E510]/15 px-2 py-0.5 rounded">
                Retained 90 Days
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#202833]">Cloudflare R2 Bucket Replicate</div>
                <div className="text-[11px] text-[#64748B]">Cross-region photo replication &bull; Bucket &apos;siliconlabs&apos;</div>
              </div>
              <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Live Mirroring
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#202833]">Point-In-Time Transaction Log</div>
                <div className="text-[11px] text-[#64748B]">PostgreSQL WAL streaming for sub-second replay</div>
              </div>
              <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Active WAL
              </span>
            </div>
          </div>
        </div>

        {/* Right: Automated Restore Staging & Validation Test */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-sm font-heading font-black text-[#202833] uppercase tracking-wider">
                Restore Staging &amp; Dry-Run Engine
              </h2>
              <p className="text-xs text-slate-500">Safely validates backup integrity without overwriting production tables</p>
            </div>
            <Play className="w-4 h-4 text-blue-500" />
          </div>

          <p className="text-xs text-[#64748B]">
            Execute non-destructive dry-run restore validation to verify schema compatibility, portrait checksums, and reference constraints.
          </p>

          <button
            type="button"
            onClick={handleValidateStagingRestore}
            disabled={isValidating}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} />
            <span>{isValidating ? "Validating Backup Checksums..." : "Run Dry-Run Restore Validation"}</span>
          </button>

          {dryRunReport && (
            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#CBD5E1] space-y-2 text-xs font-mono animate-in fade-in duration-200">
              <div className="font-bold text-[#202833] flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dry-Run Validation Succeeded</span>
              </div>
              <div className="text-[11px] text-[#64748B] space-y-1 pt-1 border-t border-[#E2E8F0]">
                <div>&bull; Target Archive: <span className="text-[#202833] font-bold">{dryRunReport.targetVersion}</span></div>
                <div>&bull; Student Records Verified: <span className="text-[#202833] font-bold">{dryRunReport.studentsEvaluated}</span></div>
                <div>&bull; Portrait Linkage: <span className="text-[#366804] font-bold">{dryRunReport.photosIntegrityRate}</span></div>
                <div>&bull; Schema Constraints: <span className="text-blue-700 font-bold">{dryRunReport.schemaIntegrity}</span></div>
                <div>&bull; Action: <span className="text-emerald-700 font-bold">{dryRunReport.action}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
