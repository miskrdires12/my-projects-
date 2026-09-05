"use client";

import { useState } from "react";
import {
  Settings,
  Building,
  Shield,
  ShieldCheck,
  Bell,
  HardDrive,
  Download,
  AlertTriangle,
  Save,
  SquareCheck,
  Square,
  Globe,
  Lock,
  Clock,
  Key,
  CheckCircle2,
  Trash2,
  Plus,
} from "lucide-react";
import {
  updateOrganizationSettingsAction,
  updateSecurityPoliciesAction,
  exportOrganizationDataAction,
} from "@/app/actions/settings";
import { MembershipRole } from "@/types/tenant";
import { useToast } from "./toast-provider";
import { toTiny } from "@/lib/tiny-text";
import { TelebirrIcon } from "./payment-icons";

interface SettingsClientProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgTier: string;
  orgStatus: string;
  userRole: MembershipRole;
  userEmail: string;
}

export function SettingsClient({
  orgId,
  orgSlug,
  orgName,
  orgTier,
  orgStatus,
  userRole,
  userEmail,
}: SettingsClientProps) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"GENERAL" | "SECURITY" | "NOTIFICATIONS" | "BACKUPS" | "DANGER">("GENERAL");

  // General Settings state
  const [name, setName] = useState(orgName);
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [timezone, setTimezone] = useState("UTC+03:00 (East Africa / Addis Ababa)");
  const [currency, setCurrency] = useState("USD ($)");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Security Policies state
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [restrictInvites, setRestrictInvites] = useState(true);
  const [ipRanges, setIpRanges] = useState<string[]>([
    "192.168.1.0/24 (Helios VPN)",
    "10.0.0.0/16 (Cloud VPC)",
  ]);
  const [newIp, setNewIp] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // Notification Preferences state
  const [notifyTelebirrDeposit, setNotifyTelebirrDeposit] = useState(true);
  const [notifyBillingInvoices, setNotifyBillingInvoices] = useState(true);
  const [notifyNewMembers, setNotifyNewMembers] = useState(true);
  const [notifySecurityAudit, setNotifySecurityAudit] = useState(false);

  // Danger Zone
  const [confirmSlugInput, setConfirmSlugInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = userRole === "OWNER" || userRole === "ADMIN";
  const isOwner = userRole === "OWNER";

  // Handle General Settings Save
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error("Unauthorized", "Only Owners and Admins can update system settings.");
      return;
    }

    setIsSavingGeneral(true);
    const res = await updateOrganizationSettingsAction(orgSlug, {
      name,
      logoUrl,
      contactEmail,
      timezone,
      currency,
    });
    setIsSavingGeneral(false);

    if (res.success) {
      toast.success("Settings Saved", "Organization configuration updated successfully.");
    } else {
      toast.error("Save Failed", res.error || "Failed to update settings.");
    }
  };

  // Handle Security Policies Save
  const handleSaveSecurity = async () => {
    if (!isOwner) {
      toast.error("Unauthorized", "Only the Workspace Owner can alter security compliance rules.");
      return;
    }

    setIsSavingSecurity(true);
    const res = await updateSecurityPoliciesAction(orgSlug, {
      enforce2FA,
      sessionTimeoutMins: parseInt(sessionTimeout) || 60,
      restrictInvitesToAdmin: restrictInvites,
      ipWhitelist: ipRanges,
    });
    setIsSavingSecurity(false);

    if (res.success) {
      toast.success("Security Policies Saved", "Two-factor and access boundary policies enforced.");
    } else {
      toast.error("Error", res.error || "Failed to update security policies.");
    }
  };

  // Handle Add IP rule
  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    setIpRanges([...ipRanges, newIp.trim()]);
    setNewIp("");
    toast.info("IP Rule Added", `Allowed CIDR ${newIp.trim()} queued.`);
  };

  // Handle Download JSON Archive
  const handleExportArchive = async () => {
    toast.info("Preparing Export", "Assembling tenant database archive...");
    const res = await exportOrganizationDataAction(orgSlug);

    if (res.success && res.archiveJson) {
      const blob = new Blob([res.archiveJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${orgSlug}-system-archive-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Archive Exported", "System backup downloaded successfully.");
    } else {
      toast.error("Export Failed", res.error || "Could not generate archive.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white font-sans">
              System & Workspace Settings
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold border border-neutral-200 dark:border-white/10 uppercase">
              {orgTier} Tier
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Real system parameters, tenant isolation, security enforcement & data retention for{" "}
            <span className="font-mono text-neutral-900 dark:text-white font-semibold">/{orgSlug}</span> · Developed by Miskr Dires
          </p>
        </div>

        <button
          onClick={handleExportArchive}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-900 dark:text-white text-xs font-semibold border border-neutral-200 dark:border-white/10 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export System Archive</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] overflow-x-auto">
        {[
          { id: "GENERAL", label: "General", icon: Building },
          { id: "SECURITY", label: "Security & Access", icon: ShieldCheck },
          { id: "NOTIFICATIONS", label: "Notifications", icon: Bell },
          { id: "BACKUPS", label: "Backups & Compliance", icon: HardDrive },
          { id: "DANGER", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                  : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: GENERAL SETTINGS
          ===================================================================== */}
      {activeTab === "GENERAL" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGeneral} className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Organization Identity</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Public profile and identity attributes for this tenant boundary.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Workspace Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                  required
                  placeholder="e.g. Helios Capital"
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Workspace URL Identifier (Slug)
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-xs font-mono bg-neutral-100 dark:bg-white/[0.08] text-neutral-500 border border-r-0 border-neutral-200 dark:border-white/10 rounded-l-xl select-none">
                    /
                  </span>
                  <input
                    type="text"
                    value={orgSlug}
                    readOnly
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-r-xl bg-neutral-100 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">Partition slug is immutable to preserve DNS & database integrity.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Contact Billing Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={!canEdit}
                  placeholder="admin@helios.io"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Custom Brand Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://assets.helios.io/logo.png"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Primary Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  <option value="UTC+03:00 (East Africa / Addis Ababa)">UTC+03:00 (East Africa / Addis Ababa)</option>
                  <option value="UTC+00:00 (Coordinated Universal Time / London)">UTC+00:00 (London / GMT)</option>
                  <option value="UTC-05:00 (Eastern Time / New York)">UTC-05:00 (Eastern Time / New York)</option>
                  <option value="UTC-08:00 (Pacific Time / San Francisco)">UTC-08:00 (Pacific Time / San Francisco)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Default Display Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  <option value="USD ($)">USD ($) · United States Dollar</option>
                  <option value="ETB (ብር)">ETB (ብር) · Ethiopian Birr (Telebirr Pegged)</option>
                  <option value="EUR (€)">EUR (€) · Euro Currency</option>
                  <option value="USDT (₮)">USDT (₮) · Tether Stablecoin</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="text-xs text-neutral-400 font-mono">
                Partition ID: <span className="text-neutral-700 dark:text-neutral-300">{orgId}</span>
              </div>

              {canEdit && (
                <button
                  type="submit"
                  disabled={isSavingGeneral}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingGeneral ? "Saving..." : "Save Changes"}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 2: SECURITY & POLICIES
          ===================================================================== */}
      {activeTab === "SECURITY" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Authentication & Session Policies</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Cryptographic authentication, multi-factor barriers, and session timeouts.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
              {/* 2FA Toggle */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                    <span>Enforce Two-Factor Authentication (2FA)</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Require TOTP authenticator app or hardware keys for all workspace members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEnforce2FA(!enforce2FA)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                    enforce2FA
                      ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs"
                      : "bg-neutral-100 dark:bg-white/[0.06] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {enforce2FA ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span>{enforce2FA ? "Enabled" : "Disabled"}</span>
                </button>
              </div>

              {/* Session Timeout */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                    Idle Session Invalidation
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Automatically sign out inactive browser tabs after specified threshold.
                  </p>
                </div>

                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none cursor-pointer"
                >
                  <option value="15">15 Minutes</option>
                  <option value="60">1 Hour (Standard)</option>
                  <option value="480">8 Hours</option>
                  <option value="1440">24 Hours</option>
                </select>
              </div>

              {/* Member Invite Restriction */}
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                    Restrict Member Invitations to Owners
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    When active, standard admins cannot dispatch email invitations without owner approval.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRestrictInvites(!restrictInvites)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                    restrictInvites
                      ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs"
                      : "bg-neutral-100 dark:bg-white/[0.06] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {restrictInvites ? <SquareCheck className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span>{restrictInvites ? "Enforced" : "Permissive"}</span>
                </button>
              </div>
            </div>

            {/* IP Whitelist Sub-section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-950 dark:text-white flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Allowed CIDR IP Blocks</span>
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">{ipRanges.length} rules active</span>
              </div>

              <form onSubmit={handleAddIp} className="flex gap-2">
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 197.156.104.0/24"
                  className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add IP</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {ipRanges.map((ip) => (
                  <div
                    key={ip}
                    className="p-2.5 rounded-xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-neutral-800 dark:text-neutral-200">{ip}</span>
                    <button
                      type="button"
                      onClick={() => setIpRanges(ipRanges.filter((x) => x !== ip))}
                      className="text-neutral-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={handleSaveSecurity}
                disabled={isSavingSecurity || !isOwner}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingSecurity ? "Applying..." : "Apply Security Rules"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: NOTIFICATIONS
          ===================================================================== */}
      {activeTab === "NOTIFICATIONS" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Real-Time Alert Dispatchers</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Instant alerts for Telebirr mobile deposits, subscription renewals, and security breaches.
            </p>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-white/[0.06]">
            {/* Telebirr Deposit Alert */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <TelebirrIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                    Telebirr Deposit Push Notifications
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Receive instant push alerts whenever funds are deposited via Telebirr or CBE Birr.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotifyTelebirrDeposit(!notifyTelebirrDeposit)}
                className="cursor-pointer"
              >
                {notifyTelebirrDeposit ? (
                  <SquareCheck className="h-5 w-5 text-neutral-950 dark:text-white" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400" />
                )}
              </button>
            </div>

            {/* Invoicing Alert */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                  Monthly Subscription Invoices
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Send PDF payment receipts to {contactEmail} at every billing cycle renewal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifyBillingInvoices(!notifyBillingInvoices)}
                className="cursor-pointer"
              >
                {notifyBillingInvoices ? (
                  <SquareCheck className="h-5 w-5 text-neutral-950 dark:text-white" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400" />
                )}
              </button>
            </div>

            {/* Member Joined Alert */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                  Member Join & Role Escalation Alerts
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Notify owners when invitations are accepted or administrator privileges are granted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifyNewMembers(!notifyNewMembers)}
                className="cursor-pointer"
              >
                {notifyNewMembers ? (
                  <SquareCheck className="h-5 w-5 text-neutral-950 dark:text-white" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400" />
                )}
              </button>
            </div>

            {/* Weekly Audit Summary */}
            <div className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-neutral-950 dark:text-white">
                  Weekly Security & Audit Digest
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Summarized telemetry report of API calls, token rotations, and edge egress.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNotifySecurityAudit(!notifySecurityAudit)}
                className="cursor-pointer"
              >
                {notifySecurityAudit ? (
                  <SquareCheck className="h-5 w-5 text-neutral-950 dark:text-white" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: BACKUPS & COMPLIANCE
          ===================================================================== */}
      {activeTab === "BACKUPS" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span>Tenant Archive & Data Portability</span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Download zero-data-loss portable snapshots of your entire workspace partition.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-mono">Archive Spec</span>
                <div className="text-sm font-bold text-neutral-950 dark:text-white">v3.0.0 JSON Dump</div>
                <p className="text-[11px] text-neutral-500">Includes members, projects, roles & audit logs</p>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-mono">Encryption</span>
                <div className="text-sm font-bold text-neutral-950 dark:text-white">AES-256 Scoped</div>
                <p className="text-[11px] text-neutral-500">Tenant-isolated encryption key context</p>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/10 space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase font-mono">Compliance</span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <SquareCheck className="h-3.5 w-3.5" />
                  <span>GDPR & SOC 2 Ready</span>
                </div>
                <p className="text-[11px] text-neutral-500">Immediate right to data portability</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-neutral-950 dark:text-white">
                  Download Complete Organization Archive
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Generates an immutable JSON archive of all tenant models, verified by Miskr Dires.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportArchive}
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Generate Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: DANGER ZONE
          ===================================================================== */}
      {activeTab === "DANGER" && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-rose-500/30 shadow-sm dark:shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone: Irreversible Actions</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Destroying this tenant partition permanently purges all databases, memberships, and assets.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-rose-500/[0.04] border border-rose-500/20 space-y-3">
            <h3 className="text-xs font-bold text-neutral-950 dark:text-white">
              Delete Workspace Partition (<code className="font-mono text-rose-600 dark:text-rose-400">/{orgSlug}</code>)
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Once initiated, all associated projects, telemetry metrics, Telebirr payment logs, and invitation links will be permanently deleted. This action cannot be undone.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Type <span className="font-mono font-bold text-black dark:text-white">{orgSlug}</span> to confirm:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={confirmSlugInput}
                  onChange={(e) => setConfirmSlugInput(e.target.value)}
                  placeholder={orgSlug}
                  className="px-3.5 py-2 text-xs font-mono rounded-xl bg-white dark:bg-white/[0.04] border border-neutral-300 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  disabled={confirmSlugInput !== orgSlug || isDeleting}
                  onClick={() => {
                    toast.error("Partition Protected", "Demo safety guard active. Organization deletion is locked.");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
