"use client";

import { useState } from "react";
import {
  Key,
  Download,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Zap,
  HardDrive,
  FileCode2,
} from "lucide-react";
import { MembershipRole, SubscriptionTier } from "@/types/tenant";
import { useToast } from "./toast-provider";

interface TenantToolsProps {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionTier: SubscriptionTier;
  userRole: MembershipRole;
  projectsCount: number;
  membersCount: number;
  maxProjects: number;
  maxMembers: number;
}

export function TenantTools({
  organizationId,
  organizationName,
  organizationSlug,
  subscriptionTier,
  userRole,
  projectsCount,
  membersCount,
  maxProjects,
  maxMembers,
}: TenantToolsProps) {
  const toast = useToast();
  // Tool 1: API Key Generator
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Tool 2: Security & Workspace Toggles
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [lockInvites, setLockInvites] = useState(false);
  const [enforce2FA, setEnforce2FA] = useState(true);

  // Tool 3: Export feedback
  const [exporting, setExporting] = useState(false);

  function handleGenerateApiKey() {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const generated = `omni_live_${organizationSlug}_${randomHex}`;
    setApiKey(generated);
    toast.success("API Key Generated", "Secret token created for /" + organizationSlug);
  }

  function handleCopyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.info("Copied to Clipboard", "API token copied.");
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleExportTenantData() {
    setExporting(true);
    const exportBundle = {
      tenant: {
        id: organizationId,
        name: organizationName,
        slug: organizationSlug,
        tier: subscriptionTier,
        exportedAt: new Date().toISOString(),
      },
      quota: {
        projectsUsed: projectsCount,
        projectsMax: maxProjects,
        membersUsed: membersCount,
        membersMax: maxMembers,
      },
      policies: {
        maintenanceMode,
        lockInvites,
        enforce2FA,
      },
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${organizationSlug}-tenant-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Tenant Backup Downloaded", `${organizationSlug} JSON configuration saved.`);
    setTimeout(() => setExporting(false), 1000);
  }

  const projectPercent = Math.min(100, Math.round((projectsCount / (maxProjects || 1)) * 100));
  const memberPercent = Math.min(100, Math.round((membersCount / (maxMembers || 1)) * 100));

  return (
    <div className="space-y-4">
      {/* Maintenance Mode Alert Banner if enabled */}
      {maintenanceMode && (
        <div className="p-3.5 rounded-xl bg-neutral-900 text-white text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              <strong>Maintenance Mode Active:</strong> Public tenant API endpoints are temporarily paused for routine updates.
            </span>
          </div>
          <button
            onClick={() => setMaintenanceMode(false)}
            className="text-[11px] underline text-neutral-300 hover:text-white"
          >
            Disable
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-black" />
            <span>Tenant Tools & Developer Utilities</span>
          </h2>
          <p className="text-xs text-neutral-500">
            Self-service options and developer utilities for workspace <code className="font-mono text-black">/{organizationSlug}</code>.
          </p>
        </div>
      </div>

      {/* 4-Column Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tool 1: API Key Generator */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-black" />
                <span>API Key Access</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">Scoped Token</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Generate a scoped API token for automated CI/CD and programmatic CRUD.
            </p>
          </div>

          <div className="space-y-2">
            {apiKey ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                  <input
                    type="password"
                    readOnly
                    value={apiKey}
                    className="text-[10px] font-mono bg-transparent w-full text-neutral-800 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyKey}
                    title="Copy Key"
                    className="p-1 text-neutral-500 hover:text-black rounded transition-colors"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => setApiKey(null)}
                  className="text-[10px] text-red-600 hover:underline"
                >
                  Revoke Key
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateApiKey}
                className="w-full py-1.5 px-3 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Generate Key</span>
              </button>
            )}
          </div>
        </div>

        {/* Tool 2: 1-Click Tenant JSON Data Exporter */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-black" />
                <span>Export Tenant Data</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">JSON</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Export complete tenant configuration, project quotas, and policy state as JSON.
            </p>
          </div>

          <button
            onClick={handleExportTenantData}
            disabled={exporting}
            className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>{exporting ? "Generating..." : "Download Backup"}</span>
          </button>
        </div>

        {/* Tool 3: Policy & Security Controls */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-black" />
                <span>Security Policies</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">Toggles</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Configure tenant-wide access restrictions and maintenance flags.
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700">Maintenance Mode</span>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-3.5 w-3.5 accent-black rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700">Lock Member Invites</span>
              <input
                type="checkbox"
                checked={lockInvites}
                onChange={(e) => setLockInvites(e.target.checked)}
                className="h-3.5 w-3.5 accent-black rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700">Enforce 2FA</span>
              <input
                type="checkbox"
                checked={enforce2FA}
                onChange={(e) => setEnforce2FA(e.target.checked)}
                className="h-3.5 w-3.5 accent-black rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Tool 4: Quota & Capacity Meter */}
        <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-black" />
                <span>Resource Quotas</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">{subscriptionTier}</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Live capacity and usage monitoring for this organization tier.
            </p>
          </div>

          <div className="space-y-2">
            {/* Project meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-neutral-700">
                <span>Projects</span>
                <span>
                  {projectsCount} / {maxProjects >= 999 ? "∞" : maxProjects}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${projectPercent}%` }}
                />
              </div>
            </div>

            {/* Member meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-neutral-700">
                <span>Team Seats</span>
                <span>
                  {membersCount} / {maxMembers >= 999 ? "∞" : maxMembers}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${memberPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
