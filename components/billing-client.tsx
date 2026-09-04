"use client";

import { useState } from "react";
import {
  CreditCard,
  Check,
  Zap,
  ExternalLink,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Building,
} from "lucide-react";
import { getCustomerPortalUrlAction, simulateSubscriptionChangeAction } from "@/app/actions/billing";
import { PLAN_CONFIGS } from "@/lib/stripe";
import { SubscriptionTier, SubscriptionStatus, MembershipRole } from "@/types/tenant";

interface BillingClientProps {
  currentTier: SubscriptionTier;
  currentStatus: SubscriptionStatus;
  orgSlug: string;
  orgName: string;
  userRole: MembershipRole;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}

export function BillingClient({
  currentTier,
  currentStatus,
  orgSlug,
  orgName,
  userRole,
  currentPeriodEnd,
  stripeCustomerId,
}: BillingClientProps) {
  const [tier, setTier] = useState<SubscriptionTier>(currentTier);
  const [status, setStatus] = useState<SubscriptionStatus>(currentStatus);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorLog, setSimulatorLog] = useState<string | null>(null);

  const canManageBilling = userRole === "OWNER" || userRole === "ADMIN";

  async function handleOpenPortal() {
    setIsLoadingPortal(true);
    const res = await getCustomerPortalUrlAction(orgSlug);
    setIsLoadingPortal(false);
    if (res.success && res.url) {
      window.open(res.url, "_blank");
    } else {
      alert("Failed to create Customer Portal link");
    }
  }

  async function handleSimulateWebhook(targetTier: SubscriptionTier, targetStatus: SubscriptionStatus, eventName: string) {
    setSimulatorLoading(true);
    setSimulatorLog(`Executing webhook '${eventName}' -> ${targetTier} (${targetStatus})...`);

    const res = await simulateSubscriptionChangeAction(targetTier, targetStatus, orgSlug);

    setSimulatorLoading(false);
    if (res.success) {
      setTier(res.tier);
      setStatus(res.status);
      setSimulatorLog(`✓ Synchronized with database: Organization state set to ${res.tier} (${res.status}).`);
    } else {
      setSimulatorLog(`✗ Webhook event failed to process.`);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">Billing & Plans</h1>
          <p className="text-xs text-neutral-500">
            Subscription tier, recurring invoices, and payment methods for <code className="font-mono text-neutral-900">/{orgSlug}</code>.
          </p>
        </div>

        {canManageBilling && (
          <button
            onClick={handleOpenPortal}
            disabled={isLoadingPortal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{isLoadingPortal ? "Opening Portal..." : "Stripe Customer Portal"}</span>
          </button>
        )}
      </div>

      {/* Current Plan Overview Card */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono font-medium">Active Subscription</span>
            <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{status.toLowerCase()}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-semibold text-neutral-950 tracking-tight">
              {PLAN_CONFIGS[tier].name} Plan
            </h2>
            <span className="text-lg font-semibold text-neutral-900 font-mono">
              ${PLAN_CONFIGS[tier].monthlyPrice}
              <span className="text-xs font-normal text-neutral-500 font-sans"> / month</span>
            </span>
          </div>

          <p className="text-xs text-neutral-500 max-w-xl leading-relaxed">
            {PLAN_CONFIGS[tier].description}{" "}
            {currentPeriodEnd && `Next billing cycle renews on ${new Date(currentPeriodEnd).toLocaleDateString()}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-left">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">Stripe Customer ID</div>
            <div className="text-xs font-mono text-neutral-900 font-medium truncate max-w-[170px] mt-0.5">
              {stripeCustomerId || `cus_live_${orgSlug}`}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Subscription Tiers</h2>
          <p className="text-xs text-neutral-500">Scale microservice quotas, bandwidth, and team member seats.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(Object.keys(PLAN_CONFIGS) as SubscriptionTier[]).map((planKey) => {
            const plan = PLAN_CONFIGS[planKey];
            const isCurrent = tier === planKey;

            return (
              <div
                key={planKey}
                className={`p-6 rounded-2xl flex flex-col justify-between space-y-6 transition-all duration-150 ${
                  isCurrent
                    ? "bg-white border-2 border-neutral-950 shadow-xs"
                    : "bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-950">{plan.name}</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{plan.description}</p>
                    </div>
                    {plan.isPopular && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-200">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-semibold text-neutral-950">${plan.monthlyPrice}</span>
                    <span className="text-xs text-neutral-500 font-sans">/ mo</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-neutral-100">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-xs text-neutral-600">
                        <Check className="h-3.5 w-3.5 text-neutral-950 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2 text-center text-xs font-medium rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200 cursor-default">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSimulateWebhook(planKey, "ACTIVE", "customer.subscription.updated")}
                      disabled={!canManageBilling || simulatorLoading}
                      className="w-full py-2 text-center text-xs font-medium rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {plan.monthlyPrice > PLAN_CONFIGS[tier].monthlyPrice ? "Upgrade Plan" : "Downgrade Plan"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="rounded-2xl bg-white border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-neutral-950">Invoice History</h2>
            <p className="text-[11px] text-neutral-500">Download billing receipts and statements.</p>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">All amounts USD</span>
        </div>

        <div className="divide-y divide-neutral-100 text-xs">
          <div className="p-3.5 flex items-center justify-between hover:bg-neutral-50/60 transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-950 font-medium text-[11px]">INV-2026-081</span>
              <span className="text-neutral-500 text-[11px]">Aug 1, 2026</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                Paid
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-900 font-semibold">${PLAN_CONFIGS[tier].monthlyPrice}.00</span>
              <span className="text-neutral-500 hover:text-neutral-950 underline text-[11px] cursor-pointer">
                Receipt
              </span>
            </div>
          </div>

          <div className="p-3.5 flex items-center justify-between hover:bg-neutral-50/60 transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-950 font-medium text-[11px]">INV-2026-064</span>
              <span className="text-neutral-500 text-[11px]">Jul 1, 2026</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                Paid
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-900 font-semibold">${PLAN_CONFIGS[tier].monthlyPrice}.00</span>
              <span className="text-neutral-500 hover:text-neutral-950 underline text-[11px] cursor-pointer">
                Receipt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Stripe Webhook Simulator Widget */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-neutral-950" />
          <h3 className="font-semibold text-xs text-neutral-950">Webhook Testing Sandbox</h3>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Simulate incoming Stripe events to test subscription transitions and webhook consumers locally without live test cards.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSimulateWebhook("PRO", "ACTIVE", "customer.subscription.updated (Pro)")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-neutral-900" />
            <span>Simulate Pro Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("ENTERPRISE", "ACTIVE", "customer.subscription.updated (Enterprise)")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Building className="h-3.5 w-3.5 text-neutral-900" />
            <span>Simulate Enterprise Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook(tier, "PAST_DUE", "invoice.payment_failed")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-neutral-900" />
            <span>Simulate Payment Failed (past_due)</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("FREE", "CANCELED", "customer.subscription.deleted")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-neutral-900" />
            <span>Simulate Cancellation</span>
          </button>
        </div>

        {simulatorLog && (
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono text-neutral-800 mt-2">
            {simulatorLog}
          </div>
        )}
      </div>
    </div>
  );
}
