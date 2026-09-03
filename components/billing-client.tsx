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
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">Billing & Subscriptions</h1>
          <p className="text-xs text-neutral-500">
            Subscription tier, recurring invoices, and Stripe billing cycle for <code className="font-mono text-black">/{orgSlug}</code>.
          </p>
        </div>

        {canManageBilling && (
          <button
            onClick={handleOpenPortal}
            disabled={isLoadingPortal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all"
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
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Active Tier</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-300">
              Status: {status}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-extrabold text-neutral-950 tracking-tight">
              {PLAN_CONFIGS[tier].name} Plan
            </h2>
            <span className="text-lg font-bold text-neutral-800">
              ${PLAN_CONFIGS[tier].monthlyPrice}
              <span className="text-xs font-normal text-neutral-500"> / month</span>
            </span>
          </div>

          <p className="text-xs text-neutral-500 max-w-xl">
            {PLAN_CONFIGS[tier].description}{" "}
            {currentPeriodEnd && `Next billing cycle: ${new Date(currentPeriodEnd).toLocaleDateString()}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-left">
            <div className="text-[10px] text-neutral-400 font-semibold uppercase">Stripe Customer</div>
            <div className="text-xs font-mono text-neutral-900 font-medium truncate max-w-[170px] mt-0.5">
              {stripeCustomerId || `cus_mock_${orgSlug}`}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-950">Available Subscription Plans</h2>
          <p className="text-xs text-neutral-500">Scale workspace limits and infrastructure tiers.</p>
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
                    ? "bg-white border-2 border-black shadow-md"
                    : "bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-950">{plan.name}</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{plan.description}</p>
                    </div>
                    {plan.isPopular && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-black border border-neutral-300">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-neutral-950">${plan.monthlyPrice}</span>
                    <span className="text-xs text-neutral-400 font-medium">/ month</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-neutral-100">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-xs text-neutral-700">
                        <Check className="h-3.5 w-3.5 text-black flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2 text-center text-xs font-bold rounded-xl bg-neutral-100 text-black border border-neutral-300 cursor-default">
                      Active Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSimulateWebhook(planKey, "ACTIVE", "customer.subscription.updated")}
                      disabled={!canManageBilling || simulatorLoading}
                      className="w-full py-2 text-center text-xs font-semibold rounded-xl bg-black hover:bg-neutral-800 text-white transition-all shadow-xs disabled:opacity-50"
                    >
                      {plan.monthlyPrice > PLAN_CONFIGS[tier].monthlyPrice ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Developer Stripe Webhook Simulator Widget */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-black" />
          <h3 className="font-bold text-xs text-neutral-950">Stripe Webhook & Lifecycle Simulator</h3>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Simulate Stripe lifecycle events (synced directly to <code className="font-mono text-black font-medium">/api/webhooks/stripe</code>). 
          Test upgrade flows, automated past-due recovery, and cancellation without test card numbers.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSimulateWebhook("PRO", "ACTIVE", "customer.subscription.updated (Pro)")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5 text-black" />
            <span>Simulate Upgrade to PRO</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("ENTERPRISE", "ACTIVE", "customer.subscription.updated (Enterprise)")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <Building className="h-3.5 w-3.5 text-black" />
            <span>Simulate Upgrade to ENTERPRISE</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook(tier, "PAST_DUE", "invoice.payment_failed")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-black" />
            <span>Simulate Payment Failed (PAST_DUE)</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("FREE", "CANCELED", "customer.subscription.deleted")}
            disabled={simulatorLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-black" />
            <span>Simulate Cancel (CANCELED)</span>
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
