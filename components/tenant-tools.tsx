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
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              <strong>Maintenance Mode Active:</strong> Public tenant API endpoints are temporarily paused for routine updates.
            </span>
          </div>
          <button
            onClick={() => setMaintenanceMode(false)}
            className="text-[11px] underline text-amber-700 dark:text-amber-300 hover:opacity-80"
          >
            Disable
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-neutral-900 dark:text-white" />
            <span>Developer Tools</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Service credentials, security policies, and workspace data export for <code className="font-mono text-neutral-800 dark:text-neutral-200">/{organizationSlug}</code> · Developed by Miskr Dires.
          </p>
        </div>
      </div>

      {/* 4-Column Tools Grid in Pure Black & White */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tool 1: API Key Generator */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-3 flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                <span>Service Tokens</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Bearer Token</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Scoped Bearer credentials for backend workers, webhooks, and CI/CD pipelines.
            </p>
          </div>

          <div className="space-y-2">
            {apiKey ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/[0.04] p-2 rounded-xl border border-neutral-200 dark:border-white/10">
                  <input
                    type="password"
                    readOnly
                    value={apiKey}
                    className="text-[10px] font-mono bg-transparent w-full text-neutral-900 dark:text-neutral-200 focus:outline-none"
                  />
                  <button
                    onClick={handleCopyKey}
                    title="Copy Key"
                    className="p-1 text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white rounded transition-colors"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => setApiKey(null)}
                  className="text-[10px] text-red-500 hover:underline font-medium"
                >
                  Revoke Token
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateApiKey}
                className="w-full py-2 px-3 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Generate Token</span>
              </button>
            )}
          </div>
        </div>

        {/* Tool 2: Tenant JSON Data Exporter */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-3 flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span>Workspace Export</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">JSON Archive</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Download complete workspace schema, project registry, and member roster.
            </p>
          </div>

          <button
            onClick={handleExportTenantData}
            disabled={exporting}
            className="w-full py-2 px-3 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <HardDrive className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>{exporting ? "Generating Archive..." : "Export Workspace JSON"}</span>
          </button>
        </div>

        {/* Tool 3: Policy & Security Controls */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-3 flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Security Policies</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Rules</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Tenant-wide access controls and edge maintenance boundaries.
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700 dark:text-neutral-300">Maintenance Mode</span>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-3.5 w-3.5 accent-black dark:accent-white rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700 dark:text-neutral-300">Lock Team Invites</span>
              <input
                type="checkbox"
                checked={lockInvites}
                onChange={(e) => setLockInvites(e.target.checked)}
                className="h-3.5 w-3.5 accent-black dark:accent-white rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-[11px] text-neutral-700 dark:text-neutral-300">Enforce 2FA</span>
              <input
                type="checkbox"
                checked={enforce2FA}
                onChange={(e) => setEnforce2FA(e.target.checked)}
                className="h-3.5 w-3.5 accent-black dark:accent-white rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Tool 4: Quota & Capacity Meter */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-3 flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Resource Allocation</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase">{subscriptionTier}</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Compute capacity and seat allocation for the current plan.
            </p>
          </div>

          <div className="space-y-3">
            {/* Project meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                <span>Services</span>
                <span className="font-mono text-neutral-900 dark:text-white">
                  {projectsCount} / {maxProjects >= 999 ? "Unlimited" : maxProjects}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white rounded-full transition-all"
                  style={{ width: `${projectPercent}%` }}
                />
              </div>
            </div>

            {/* Member meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
                <span>Team Seats</span>
                <span className="font-mono text-neutral-900 dark:text-white">
                  {membersCount} / {maxMembers >= 999 ? "Unlimited" : maxMembers}
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white rounded-full transition-all"
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
