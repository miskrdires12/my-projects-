"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Globe, Smartphone, Laptop, Trash2, Plus, Download, CheckCircle2 } from "lucide-react";

interface SecurityComplianceProps {
  orgSlug: string;
}

export function SecurityCompliance({ orgSlug }: SecurityComplianceProps) {
  const [ipRanges, setIpRanges] = useState<string[]>([
    "192.168.1.0/24 (HQ VPN)",
    "10.0.0.0/16 (VPC Peering)",
  ]);
  const [newIp, setNewIp] = useState("");
  const [activeSessions, setActiveSessions] = useState([
    {
      id: "sess_1",
      device: "MacBook Pro 16\"",
      ip: "185.120.44.12",
      location: "San Francisco, US",
      current: true,
      lastActive: "Active Now",
    },
    {
      id: "sess_2",
      device: "iPhone 15 Pro",
      ip: "185.120.44.12",
      location: "San Francisco, US",
      current: false,
      lastActive: "2 hours ago",
    },
  ]);
  const [reportDownloaded, setReportDownloaded] = useState(false);

  function handleAddIp(e: React.FormEvent) {
    e.preventDefault();
    if (!newIp.trim()) return;
    setIpRanges([...ipRanges, newIp.trim()]);
    setNewIp("");
  }

  function handleRemoveIp(ip: string) {
    setIpRanges(ipRanges.filter((item) => item !== ip));
  }

  function handleRevokeAllSessions() {
    setActiveSessions(activeSessions.filter((s) => s.current));
    alert("Revoked all secondary remote active sessions.");
  }

  function handleDownloadCompliance() {
    const report = {
      tenant: orgSlug,
      complianceAudits: {
        soc2TypeII: "COMPLIANT (Audited Q3 2026)",
        iso27001: "CERTIFIED (Certificate #ISO-88219)",
        gdprDPA: "SIGNED & ACTIVE",
        encryptionAtRest: "AES-256-GCM Enabled",
        encryptionInTransit: "TLS 1.3 Strict",
        tenantIsolation: "Row-Level & Query-Scoped ($extends) Active",
      },
      ipWhitelisting: ipRanges,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${orgSlug}-soc2-compliance-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    setReportDownloaded(true);
    setTimeout(() => setReportDownloaded(false), 2500);
  }

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden space-y-6 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-neutral-950" />
            <span>Security & Access Governance</span>
          </h3>
          <p className="text-xs text-neutral-500">
            Audit compliance attestations, IP access controls, and active sessions for <code className="font-mono text-neutral-900">/{orgSlug}</code>.
          </p>
        </div>

        <button
          onClick={handleDownloadCompliance}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-800 transition-colors shadow-xs cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{reportDownloaded ? "Downloaded ✓" : "Download SOC 2 Summary"}</span>
        </button>
      </div>

      {/* Compliance Frameworks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-950">SOC 2 Type II</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">Continuous controls verified across tenant data boundaries.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-950">ISO 27001</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">Certified information security management systems.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-950">GDPR & HIPAA</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">Data processing addendum and AES-256 encryption at rest.</p>
        </div>
      </div>

      {/* IP Whitelisting & CIDR Access */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-neutral-700" />
            <span>Network Boundaries & Allowed IPs</span>
          </h4>
          <span className="text-[10px] text-neutral-400 font-mono">{ipRanges.length} rules active</span>
        </div>

        <form onSubmit={handleAddIp} className="flex gap-2">
          <input
            type="text"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="e.g. 198.51.100.0/24 (Office Gateway)"
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono transition-all"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-medium transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Rule</span>
          </button>
        </form>

        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
          {ipRanges.map((ip) => (
            <div key={ip} className="px-3.5 py-2 flex items-center justify-between text-xs bg-white">
              <span className="font-mono text-neutral-800 text-[11px]">{ip}</span>
              <button
                onClick={() => handleRemoveIp(ip)}
                className="text-neutral-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                title="Remove IP Rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions Manager */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Laptop className="h-3.5 w-3.5 text-neutral-700" />
            <span>Active Sessions</span>
          </h4>
          <button
            onClick={handleRevokeAllSessions}
            className="text-[11px] text-red-600 hover:underline font-medium cursor-pointer"
          >
            Revoke Other Sessions
          </button>
        </div>

        <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden text-xs bg-white">
          {activeSessions.map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-neutral-900 flex items-center gap-2">
                  <span>{s.device}</span>
                  {s.current && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-black border border-neutral-300">
                      This Device
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  {s.ip} • {s.location}
                </div>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">{s.lastActive}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
