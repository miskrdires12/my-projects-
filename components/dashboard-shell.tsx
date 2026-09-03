"use client";

import { useState } from "react";
import { LayoutDashboard, Terminal, Zap, ShieldCheck, Globe } from "lucide-react";
import { ApiPlayground } from "./api-playground";
import { WebhookInspector } from "./webhook-inspector";
import { SecurityCompliance } from "./security-compliance";
import { DomainWebhookManager } from "./domain-webhook-manager";

interface DashboardShellProps {
  orgSlug: string;
  children: React.ReactNode;
}

export function DashboardShell({ orgSlug, children }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "playground" | "domains" | "webhooks" | "compliance">("overview");

  return (
    <div className="space-y-6">
      {/* Segmented Top View Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "playground"
                ? "bg-white text-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>API Playground & cURL</span>
          </button>

          <button
            onClick={() => setActiveTab("domains")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "domains"
                ? "bg-white text-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Domains & Webhooks</span>
          </button>

          <button
            onClick={() => setActiveTab("webhooks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "webhooks"
                ? "bg-white text-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Stripe Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab("compliance")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "compliance"
                ? "bg-white text-black shadow-xs"
                : "text-neutral-600 hover:text-black"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Security & Compliance</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-400 hidden lg:block">
          Press <kbd className="bg-white border border-neutral-200 px-1 py-0.5 rounded text-neutral-600 font-bold">⌘K</kbd> for quick command jump
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && children}
      {activeTab === "playground" && <ApiPlayground orgSlug={orgSlug} />}
      {activeTab === "domains" && <DomainWebhookManager orgSlug={orgSlug} />}
      {activeTab === "webhooks" && <WebhookInspector orgSlug={orgSlug} />}
      {activeTab === "compliance" && <SecurityCompliance orgSlug={orgSlug} />}
    </div>
  );
}
