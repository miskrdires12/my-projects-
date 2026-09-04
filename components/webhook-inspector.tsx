"use client";

import { useState } from "react";
import { Zap, CheckCircle2, ChevronDown, ChevronUp, RotateCcw, Copy, Check, Clock } from "lucide-react";

interface WebhookInspectorProps {
  orgSlug: string;
}

interface WebhookEventLog {
  id: string;
  type: string;
  status: number;
  durationMs: number;
  timestamp: string;
  payload: any;
}

export function WebhookInspector({ orgSlug }: WebhookInspectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>("evt_01");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRedelivering, setIsRedelivering] = useState(false);
  const [events, setEvents] = useState<WebhookEventLog[]>([
    {
      id: "evt_sub_upd_01",
      type: "customer.subscription.updated",
      status: 200,
      durationMs: 38,
      timestamp: "Just now",
      payload: {
        id: "sub_acme_pro_01",
        object: "subscription",
        status: "active",
        customer: `cus_${orgSlug}`,
        tier: "PRO",
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      },
    },
    {
      id: "evt_inv_suc_02",
      type: "invoice.payment_succeeded",
      status: 200,
      durationMs: 24,
      timestamp: "12m ago",
      payload: {
        id: "in_mock_9921",
        object: "invoice",
        amount_paid: 4900,
        currency: "usd",
        status: "paid",
        customer: `cus_${orgSlug}`,
      },
    },
    {
      id: "evt_chk_cmp_03",
      type: "checkout.session.completed",
      status: 200,
      durationMs: 42,
      timestamp: "1h ago",
      payload: {
        id: "cs_mock_initial_checkout",
        object: "checkout.session",
        mode: "subscription",
        customer: `cus_${orgSlug}`,
        payment_status: "paid",
      },
    },
  ]);

  function handleCopy(id: string, payload: any) {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleRedeliver(evt: WebhookEventLog) {
    setIsRedelivering(true);
    try {
      await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-webhook": "true",
        },
        body: JSON.stringify({
          id: `evt_replay_${Date.now()}`,
          type: evt.type,
          data: { object: evt.payload },
        }),
      });

      setEvents([
        {
          ...evt,
          id: `evt_replay_${Date.now().toString().slice(-4)}`,
          timestamp: "Just now (Replayed)",
          durationMs: Math.floor(Math.random() * 20) + 15,
        },
        ...events,
      ]);
    } finally {
      setIsRedelivering(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden space-y-4 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
            <Zap className="h-4 w-4 text-neutral-950" />
            <span>Webhook Deliveries</span>
          </h3>
          <p className="text-xs text-neutral-500">
            Recent incoming webhook deliveries processed by <code className="font-mono text-neutral-900">/api/webhooks/stripe</code>.
          </p>
        </div>

        <div className="text-xs font-mono text-neutral-500 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Listener active</span>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {events.map((evt) => {
          const isExpanded = expandedId === evt.id;

          return (
            <div key={evt.id} className="py-2.5 space-y-2">
              <div
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                className="flex items-center justify-between cursor-pointer hover:bg-neutral-50 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {evt.status} OK
                  </span>
                  <span className="text-xs font-semibold font-mono text-neutral-900">{evt.type}</span>
                  <span className="text-[11px] text-neutral-400 font-mono hidden md:inline">({evt.id})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{evt.durationMs}ms</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">{evt.timestamp}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                </div>
              </div>

              {isExpanded && (
                <div className="pl-4 pr-2 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Parsed Event Payload</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRedeliver(evt)}
                        disabled={isRedelivering}
                        className="flex items-center gap-1 text-[11px] text-neutral-700 hover:text-neutral-950 font-medium disabled:opacity-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Replay Event</span>
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleCopy(evt.id, evt.payload)}
                        className="flex items-center gap-1 text-[11px] text-neutral-700 hover:text-neutral-950 font-medium cursor-pointer"
                      >
                        {copiedId === evt.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedId === evt.id ? "Copied" : "Copy Payload"}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-neutral-950 text-neutral-100 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-48">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
