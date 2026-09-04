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

    try {
      const res = await simulateSubscriptionChangeAction(targetTier, targetStatus, orgSlug);
      setSimulatorLoading(false);

      if (res.success) {
        setTier(targetTier);
        setStatus(targetStatus);
        setSimulatorLog(`✓ Simulated '${eventName}'. Database state updated to ${targetTier} [${targetStatus}].`);
      }
    } catch (err: any) {
      setSimulatorLoading(false);
      setSimulatorLog(`✗ Failed: ${err?.message || "Simulation error"}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">Analysis & Billing Plans</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Subscription tier, compute quotas, and invoice history for <span className="font-mono text-neutral-900 dark:text-white">/{orgSlug}</span> · Developed by Miskr Dires.
          </p>
        </div>

        {canManageBilling && (
          <button
            onClick={handleOpenPortal}
            disabled={isLoadingPortal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{isLoadingPortal ? "Opening Portal..." : "Stripe Customer Portal"}</span>
          </button>
        )}
      </div>

      {/* Current Plan Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono font-medium">Active Subscription</span>
            <span className="text-[10px] font-medium font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{status.toLowerCase()}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-bold text-neutral-950 dark:text-white tracking-tight">
              {PLAN_CONFIGS[tier].name} Plan
            </h2>
            <span className="text-lg font-bold text-neutral-900 dark:text-white font-mono">
              ${PLAN_CONFIGS[tier].monthlyPrice}
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400 font-sans"> / month</span>
            </span>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
            {PLAN_CONFIGS[tier].description}{" "}
            {currentPeriodEnd && `Next billing cycle renews on ${new Date(currentPeriodEnd).toLocaleDateString()}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#14141a] border border-neutral-200/80 dark:border-white/[0.06] text-left">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">Stripe Customer ID</div>
            <div className="text-xs font-mono text-neutral-900 dark:text-white font-medium truncate max-w-[170px] mt-0.5">
              {stripeCustomerId || `cus_live_${orgSlug}`}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Subscription Tiers</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Scale microservice quotas, bandwidth, and team member seats.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(Object.keys(PLAN_CONFIGS) as SubscriptionTier[]).map((planKey) => {
            const plan = PLAN_CONFIGS[planKey];
            const isCurrent = tier === planKey;

            return (
              <div
                key={planKey}
                className={`p-6 rounded-3xl flex flex-col justify-between space-y-6 transition-all duration-200 ${
                  isCurrent
                    ? "bg-white dark:bg-[#15151c] border-2 border-black dark:border-white shadow-md dark:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    : "bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 shadow-sm dark:shadow-xl"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-950 dark:text-white">{plan.name}</h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{plan.description}</p>
                    </div>
                    {plan.isPopular && (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-bold text-neutral-950 dark:text-white">${plan.monthlyPrice}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">/ mo</span>
                  </div>

                  <ul className="space-y-2 pt-3 border-t border-neutral-100 dark:border-white/[0.05]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <Check className="h-3.5 w-3.5 text-neutral-950 dark:text-white flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-xs font-semibold rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 cursor-default">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSimulateWebhook(planKey, "ACTIVE", "customer.subscription.updated")}
                      disabled={!canManageBilling || simulatorLoading}
                      className="w-full py-2.5 text-center text-xs font-semibold rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
      <div className="rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl overflow-hidden">
        <div className="p-5 border-b border-neutral-100 dark:border-white/[0.05] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-neutral-950 dark:text-white">Invoice History</h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Download billing receipts and statements.</p>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">All amounts USD</span>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.04] text-xs">
          <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-950 dark:text-white font-medium text-[11px]">INV-2026-081</span>
              <span className="text-neutral-400 text-[11px]">Aug 1, 2026</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Paid
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-900 dark:text-white font-bold">${PLAN_CONFIGS[tier].monthlyPrice}.00</span>
              <span className="text-neutral-700 dark:text-neutral-300 hover:underline text-[11px] cursor-pointer">
                Receipt
              </span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-950 dark:text-white font-medium text-[11px]">INV-2026-064</span>
              <span className="text-neutral-400 text-[11px]">Jul 1, 2026</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Paid
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-neutral-900 dark:text-white font-bold">${PLAN_CONFIGS[tier].monthlyPrice}.00</span>
              <span className="text-neutral-700 dark:text-neutral-300 hover:underline text-[11px] cursor-pointer">
                Receipt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Stripe Webhook Simulator Widget */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-neutral-900 dark:text-white" />
          <h3 className="font-bold text-xs text-neutral-950 dark:text-white">Webhook Testing Sandbox</h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Simulate incoming Stripe events to test subscription transitions and webhook consumers locally without live test cards.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSimulateWebhook("PRO", "ACTIVE", "customer.subscription.updated (Pro)")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Simulate Pro Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("ENTERPRISE", "ACTIVE", "customer.subscription.updated (Enterprise)")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Building className="h-3.5 w-3.5" />
            <span>Simulate Enterprise Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook(tier, "PAST_DUE", "invoice.payment_failed")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-amber-600 dark:text-amber-300 border border-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Simulate Payment Failed (past_due)</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("FREE", "CANCELED", "customer.subscription.deleted")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-rose-600 dark:text-rose-300 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
            <span>Simulate Cancellation</span>
          </button>
        </div>

        {simulatorLog && (
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/10 text-xs font-mono text-neutral-900 dark:text-white mt-2">
            {simulatorLog}
          </div>
        )}
      </div>
    </div>
  );
}
