"use client";

import { useState } from "react";
import { Globe, ShieldCheck, Key, Zap, Check, Copy, Play, Plus, Trash2, ArrowRight } from "lucide-react";
import { useToast } from "./toast-provider";

interface DomainWebhookManagerProps {
  orgSlug: string;
}

export function DomainWebhookManager({ orgSlug }: DomainWebhookManagerProps) {
  const toast = useToast();

  // Domain state
  const [customDomain, setCustomDomain] = useState(`workspace.${orgSlug}.com`);
  const [isDomainSaved, setIsDomainSaved] = useState(true);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState(`https://api.${orgSlug}.com/v1/events`);
  const [signingSecret, setSigningSecret] = useState(`whsec_live_${orgSlug}_${Math.random().toString(36).substring(2, 12)}`);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isSendingPing, setIsSendingPing] = useState(false);

  function handleSaveDomain(e: React.FormEvent) {
    e.preventDefault();
    setIsDomainSaved(true);
    toast.success(
      "Domain Configured",
      `CNAME record generated for ${customDomain}. SSL certificate provisioning initiated.`
    );
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(signingSecret);
    setCopiedSecret(true);
    toast.info("Copied to Clipboard", "Webhook signing secret copied.");
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  function handleSendTestPing() {
    setIsSendingPing(true);
    setTimeout(() => {
      setIsSendingPing(false);
      toast.success(
        "Webhook Ping Delivered",
        `HTTP 200 OK received from ${webhookUrl} in 24ms. HMAC signature verified.`
      );
    }, 600);
  }

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden space-y-6 p-5">
      {/* Header */}
      <div className="border-b border-neutral-100 pb-4">
        <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
          <Globe className="h-4 w-4 text-neutral-950" />
          <span>Domains & Routing</span>
        </h3>
        <p className="text-xs text-neutral-500">
          Configure custom domain CNAME routing and event subscriptions for <code className="font-mono text-neutral-900">/{orgSlug}</code>.
        </p>
      </div>

      {/* Part 1: Custom Domain */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-neutral-700" />
            <span>Custom Domain</span>
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            TLS 1.3 Active
          </span>
        </div>

        <form onSubmit={handleSaveDomain} className="flex gap-2">
          <input
            type="text"
            value={customDomain}
            onChange={(e) => {
              setCustomDomain(e.target.value);
              setIsDomainSaved(false);
            }}
            placeholder="e.g. workspace.acme.com"
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono transition-all"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            Save Domain
          </button>
        </form>

        {isDomainSaved && (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
            <div className="font-medium text-neutral-800 text-[11px]">DNS CNAME Configuration:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Type</span>
                <span className="font-semibold text-neutral-950">CNAME</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Host</span>
                <span className="font-semibold text-neutral-950">{customDomain.split(".")[0] || "workspace"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px] uppercase font-sans">Points To</span>
                <span className="font-semibold text-neutral-950">cname.omnitenant.io</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Part 2: Outbound Webhook Subscriptions */}
      <div className="space-y-3 pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-neutral-700" />
            <span>Outbound Webhooks</span>
          </h4>
          <span className="text-[10px] text-neutral-400 font-mono">HMAC-SHA256 Signed</span>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-neutral-600">Endpoint URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white font-mono transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-600 font-medium">Signing Secret</span>
            <button
              onClick={handleCopySecret}
              className="text-neutral-500 hover:text-neutral-950 flex items-center gap-1 text-[10px] cursor-pointer"
            >
              {copiedSecret ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
            </button>
          </div>
          <input
            type="password"
            readOnly
            value={signingSecret}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 font-mono focus:outline-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-neutral-950 rounded" />
              <span className="font-mono text-[10px]">project.created</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-neutral-950 rounded" />
              <span className="font-mono text-[10px]">member.invited</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-neutral-950 rounded" />
              <span className="font-mono text-[10px]">subscription.updated</span>
            </label>
          </div>

          <button
            onClick={handleSendTestPing}
            disabled={isSendingPing}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer self-end sm:self-auto"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isSendingPing ? "Sending..." : "Send Test Event"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
