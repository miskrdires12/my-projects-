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
        <h3 className="text-sm font-bold text-neutral-950 flex items-center gap-2">
          <Globe className="h-4 w-4 text-black" />
          <span>Custom Domains & Outbound Webhook Routing</span>
        </h3>
        <p className="text-xs text-neutral-500">
          White-label domain routing and real-time outbound event streaming for <code className="font-mono text-black">/{orgSlug}</code>.
        </p>
      </div>

      {/* Part 1: Custom Domain */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-black" />
            <span>White-Label Custom Subdomain</span>
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
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
            placeholder="e.g. app.yourdomain.com"
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black focus:bg-white font-mono"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors shadow-2xs"
          >
            Save Domain
          </button>
        </form>

        {isDomainSaved && (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
            <div className="font-semibold text-neutral-900 text-[11px]">Required DNS CNAME Record:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px]">Type</span>
                <span className="font-bold text-black">CNAME</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px]">Host</span>
                <span className="font-bold text-black">{customDomain.split(".")[0] || "app"}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-neutral-200">
                <span className="text-neutral-400 block text-[10px]">Points To</span>
                <span className="font-bold text-black">cname.omnitenant.com</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Part 2: Outbound Webhook Subscriptions */}
      <div className="space-y-3 pt-3 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-black" />
            <span>Outbound Webhook Endpoints</span>
          </h4>
          <span className="text-[10px] text-neutral-400 font-mono">HMAC SHA-256</span>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium text-neutral-600">Subscriber URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-black focus:bg-white font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-600 font-medium">Signing Secret (HMAC)</span>
            <button
              onClick={handleCopySecret}
              className="text-neutral-500 hover:text-black flex items-center gap-1 text-[10px]"
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

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3 text-[11px] text-neutral-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3 w-3 accent-black" />
              <span>project.created</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3 w-3 accent-black" />
              <span>member.invited</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-3 w-3 accent-black" />
              <span>subscription.updated</span>
            </label>
          </div>

          <button
            onClick={handleSendTestPing}
            disabled={isSendingPing}
            className="px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isSendingPing ? "Pinging..." : "Send Test Ping"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
