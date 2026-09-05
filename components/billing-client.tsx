"use client";

import { useState } from "react";
import {
  CreditCard,
  SquareCheck,
  Zap,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Building,
  Plus,
  Trash2,
  PhoneCall,
  ArrowUpRight,
  Download,
  FileText,
  X,
  ShieldCheck,
  Wallet,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";
import { getCustomerPortalUrlAction, simulateSubscriptionChangeAction } from "@/app/actions/billing";
import { PLAN_CONFIGS } from "@/lib/stripe";
import { SubscriptionTier, SubscriptionStatus, MembershipRole } from "@/types/tenant";
import { TelebirrIcon, CbeBirrIcon, VisaCardIcon, CryptoUsdtIcon } from "./payment-icons";
import { toTiny } from "@/lib/tiny-text";

interface PaymentMethodItem {
  id: string;
  type: "TELEBIRR" | "CBE_BIRR" | "CARD" | "CRYPTO";
  name: string;
  account: string;
  subtitle: string;
  isDefault: boolean;
}

interface InvoiceItem {
  id: string;
  date: string;
  amount: number;
  status: "PAID" | "PENDING";
  paymentMethod: string;
  planName: string;
}

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

  // Saved Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([
    {
      id: "pm_telebirr_1",
      type: "TELEBIRR",
      name: "Telebirr Mobile Money",
      account: "+251 91 849 2011",
      subtitle: "Ethio Telecom · Instant Settlement",
      isDefault: true,
    },
    {
      id: "pm_cbe_1",
      type: "CBE_BIRR",
      name: "CBE Birr Wallet",
      account: "Account: 1000293849102",
      subtitle: "Commercial Bank of Ethiopia",
      isDefault: false,
    },
    {
      id: "pm_visa_1",
      type: "CARD",
      name: "Visa Business Debit",
      account: "•••• •••• •••• 4242",
      subtitle: "Expires 12/28",
      isDefault: false,
    },
    {
      id: "pm_crypto_1",
      type: "CRYPTO",
      name: "USDT TRC-20 Vault",
      account: "0x71C...38A9",
      subtitle: "Tether Settlement Network",
      isDefault: false,
    },
  ]);

  // Invoice History State
  const [invoices, setInvoices] = useState<InvoiceItem[]>([
    {
      id: "INV-2026-TB01",
      date: "Sep 5, 2026",
      amount: PLAN_CONFIGS[tier].monthlyPrice,
      status: "PAID",
      paymentMethod: "Telebirr (+251 91 849 2011)",
      planName: `${PLAN_CONFIGS[tier].name} Plan`,
    },
    {
      id: "INV-2026-081",
      date: "Aug 1, 2026",
      amount: 49,
      status: "PAID",
      paymentMethod: "Visa Card (•••• 4242)",
      planName: "Pro Plan",
    },
    {
      id: "INV-2026-064",
      date: "Jul 1, 2026",
      amount: 49,
      status: "PAID",
      paymentMethod: "Telebirr (+251 91 849 2011)",
      planName: "Pro Plan",
    },
  ]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionTier | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<InvoiceItem | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // New Payment Method Form state
  const [newMethodType, setNewMethodType] = useState<"TELEBIRR" | "CBE_BIRR" | "CARD">("TELEBIRR");
  const [newPhone, setNewPhone] = useState("+251 9");
  const [newAccountName, setNewAccountName] = useState("Nadia Rachel");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExp, setNewCardExp] = useState("12/28");

  // Deposit Form state
  const [depositAmountUsd, setDepositAmountUsd] = useState(50);
  const [depositPhone, setDepositPhone] = useState("+251 91 849 2011");
  const [depositStep, setDepositStep] = useState<"INPUT" | "PUSH_SENT" | "CONFIRMED">("INPUT");
  const [depositTxRef, setDepositTxRef] = useState("");

  const canManageBilling = userRole === "OWNER" || userRole === "ADMIN";

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
    const target = paymentMethods.find((p) => p.id === id);
    showToast(`✓ Set ${target?.name || "method"} as default payment source.`);
  };

  const handleRemoveMethod = (id: string) => {
    if (paymentMethods.length <= 1) {
      showToast("Cannot remove the last remaining payment method.");
      return;
    }
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
    showToast("Payment method removed successfully.");
  };

  const handleAddNewMethod = (e: React.FormEvent) => {
    e.preventDefault();
    let newItem: PaymentMethodItem;

    if (newMethodType === "TELEBIRR") {
      newItem = {
        id: `pm_telebirr_${Date.now()}`,
        type: "TELEBIRR",
        name: "Telebirr Mobile Money",
        account: newPhone.trim(),
        subtitle: `${newAccountName.trim()} · Ethio Telecom`,
        isDefault: false,
      };
    } else if (newMethodType === "CBE_BIRR") {
      newItem = {
        id: `pm_cbe_${Date.now()}`,
        type: "CBE_BIRR",
        name: "CBE Birr Wallet",
        account: newPhone.trim(),
        subtitle: `${newAccountName.trim()} · Commercial Bank of Ethiopia`,
        isDefault: false,
      };
    } else {
      newItem = {
        id: `pm_card_${Date.now()}`,
        type: "CARD",
        name: "Credit / Debit Card",
        account: `•••• •••• •••• ${newCardNumber.slice(-4) || "8821"}`,
        subtitle: `Expires ${newCardExp}`,
        isDefault: false,
      };
    }

    setPaymentMethods((prev) => [...prev, newItem]);
    setIsAddModalOpen(false);
    showToast(`✓ ${newItem.name} connected successfully.`);
  };

  // Telebirr Deposit Handler
  const handleExecuteTelebirrDeposit = () => {
    setDepositStep("PUSH_SENT");
    const generatedRef = `TB-${Math.floor(100000000 + Math.random() * 900000000)}`;
    setDepositTxRef(generatedRef);

    setTimeout(() => {
      setDepositStep("CONFIRMED");

      // Add to invoices
      const newInv: InvoiceItem = {
        id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: "Today",
        amount: depositAmountUsd,
        status: "PAID",
        paymentMethod: `Telebirr (${depositPhone})`,
        planName: "Wallet Funding",
      };
      setInvoices((prev) => [newInv, ...prev]);
    }, 2400);
  };

  // Subscription Plan Upgrade / Downgrade with Telebirr
  const handleConfirmPlanPayment = async () => {
    if (!selectedPlanForUpgrade) return;
    setSimulatorLoading(true);

    try {
      const res = await simulateSubscriptionChangeAction(
        selectedPlanForUpgrade,
        "ACTIVE",
        orgSlug
      );
      setSimulatorLoading(false);

      if (res.success) {
        setTier(selectedPlanForUpgrade);
        setStatus("ACTIVE");

        // Add to invoice history
        const newInv: InvoiceItem = {
          id: `INV-TB-${Date.now().toString().slice(-4)}`,
          date: "Today",
          amount: PLAN_CONFIGS[selectedPlanForUpgrade].monthlyPrice,
          status: "PAID",
          paymentMethod: "Telebirr (+251 91 849 2011)",
          planName: `${PLAN_CONFIGS[selectedPlanForUpgrade].name} Upgrade`,
        };
        setInvoices((prev) => [newInv, ...prev]);

        setIsCheckoutModalOpen(false);
        setSelectedPlanForUpgrade(null);
        showToast(`✓ Successfully upgraded to ${PLAN_CONFIGS[selectedPlanForUpgrade].name} plan with Telebirr.`);
      }
    } catch (err: any) {
      setSimulatorLoading(false);
      alert("Plan update failed: " + err.message);
    }
  };

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

  async function handleSimulateWebhook(
    targetTier: SubscriptionTier,
    targetStatus: SubscriptionStatus,
    eventName: string
  ) {
    setSimulatorLoading(true);
    setSimulatorLog(`Executing webhook '${eventName}' -> ${targetTier} (${targetStatus})...`);
    try {
      const res = await simulateSubscriptionChangeAction(targetTier, targetStatus, orgSlug);
      setSimulatorLoading(false);
      if (res.success) {
        setTier(targetTier);
        setStatus(targetStatus);
        setSimulatorLog(`✓ Simulated '${eventName}'. Database state updated to ${targetTier} [${targetStatus}].`);
        showToast(`✓ Database updated to ${targetTier} [${targetStatus}]`);
      }
    } catch (err: any) {
      setSimulatorLoading(false);
      setSimulatorLog(`✗ Failed: ${err?.message || "Simulation error"}`);
    }
  }

  function getMethodIcon(type: PaymentMethodItem["type"]) {
    switch (type) {
      case "TELEBIRR":
        return <TelebirrIcon className="h-8 w-8 rounded-xl flex-shrink-0 shadow-xs" />;
      case "CBE_BIRR":
        return <CbeBirrIcon className="h-8 w-8 rounded-xl flex-shrink-0 shadow-xs" />;
      case "CARD":
        return <VisaCardIcon className="h-8 w-8 rounded-xl flex-shrink-0 shadow-xs" />;
      case "CRYPTO":
        return <CryptoUsdtIcon className="h-8 w-8 rounded-xl flex-shrink-0 shadow-xs" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 text-xs font-semibold flex items-center gap-2">
            <SquareCheck className="h-4 w-4 text-emerald-400 dark:text-emerald-600 flex-shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Analysis, Payments & Billing
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Telebirr mobile money, payment methods, compute quotas & statements for{" "}
            <span className="font-mono text-neutral-900 dark:text-white font-semibold">/{orgSlug}</span> · Developed by Miskr Dires.
          </p>
        </div>

        {canManageBilling && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setDepositStep("INPUT");
                setIsDepositModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <TelebirrIcon className="h-4 w-4" />
              <span>Deposit with Telebirr</span>
            </button>

            <button
              onClick={handleOpenPortal}
              disabled={isLoadingPortal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-900 dark:text-white text-xs font-semibold border border-neutral-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{isLoadingPortal ? "Opening..." : "Stripe Portal"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Subscription Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono font-medium">
              Active Subscription
            </span>
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

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#14141a] border border-neutral-200/80 dark:border-white/[0.06] text-left w-full sm:w-auto">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">Primary Method</div>
            <div className="flex items-center gap-2 mt-1">
              <TelebirrIcon className="h-4 w-4" />
              <span className="text-xs font-mono font-semibold text-neutral-900 dark:text-white">
                Telebirr (+251 91 849 2011)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods & Digital Wallets Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100 dark:border-white/[0.05]">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-neutral-900 dark:text-white" />
              <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
                Connected Payment Methods
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Telebirr mobile money, CBE Birr, cards, and crypto settlement channels
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Method</span>
            </button>
          </div>
        </div>

        {/* Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                pm.isDefault
                  ? "bg-neutral-50/80 dark:bg-white/[0.03] border-black dark:border-white shadow-xs"
                  : "bg-white dark:bg-[#121218] border-neutral-200/80 dark:border-white/[0.06] hover:border-black/30 dark:hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                {getMethodIcon(pm.type)}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-neutral-950 dark:text-white truncate">
                      {pm.name}
                    </span>
                    {pm.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.2 rounded-full bg-black text-white dark:bg-white dark:text-black">
                        <SquareCheck className="h-3 w-3" />
                        <span>DEFAULT</span>
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200 font-medium">
                    {pm.account}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate">{pm.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!pm.isDefault ? (
                  <button
                    onClick={() => handleSetDefault(pm.id)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-white/[0.06] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10 transition-all cursor-pointer"
                  >
                    Set Default
                  </button>
                ) : (
                  <span className="p-1 text-emerald-600 dark:text-emerald-400" title="Active default method">
                    <SquareCheck className="h-4 w-4" />
                  </span>
                )}

                <button
                  onClick={() => handleRemoveMethod(pm.id)}
                  title="Remove method"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Tiers Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Subscription Tiers</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Scale microservice quotas, bandwidth, and team member seats with Telebirr.
          </p>
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

                  {/* Feature checklist with distinctive SquareCheck */}
                  <ul className="space-y-2 pt-3 border-t border-neutral-100 dark:border-white/[0.05]">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <SquareCheck className="h-3.5 w-3.5 text-neutral-950 dark:text-white flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2.5 text-center text-xs font-semibold rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 flex items-center justify-center gap-1.5 cursor-default">
                      <SquareCheck className="h-3.5 w-3.5" />
                      <span>Active Plan</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPlanForUpgrade(planKey);
                        setIsCheckoutModalOpen(true);
                      }}
                      disabled={!canManageBilling || simulatorLoading}
                      className="w-full py-2.5 text-center text-xs font-semibold rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <TelebirrIcon className="h-3.5 w-3.5" />
                      <span>{plan.monthlyPrice > PLAN_CONFIGS[tier].monthlyPrice ? "Upgrade with Telebirr" : "Downgrade Plan"}</span>
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
            <h2 className="text-xs font-bold text-neutral-950 dark:text-white">Invoice History & Receipts</h2>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Download itemized billing receipts for Telebirr and card transactions.</p>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">All amounts USD</span>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-white/[0.04] text-xs">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/80 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.05]">
                  <FileText className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-950 dark:text-white font-medium text-[11px]">
                      {inv.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <SquareCheck className="h-2.5 w-2.5" />
                      <span>{inv.status}</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    {inv.date} · {inv.paymentMethod}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-neutral-900 dark:text-white font-bold text-xs">
                  ${inv.amount}.00
                </span>
                <button
                  onClick={() => setActiveReceipt(inv)}
                  className="px-3 py-1 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/[0.1] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Receipt</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Webhook Simulator Widget */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-neutral-900 dark:text-white" />
          <h3 className="font-bold text-xs text-neutral-950 dark:text-white">Webhook & Telebirr Testing Sandbox</h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Simulate incoming Stripe and Telebirr events to test subscription transitions locally without real funds.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSimulateWebhook("PRO", "ACTIVE", "telebirr.subscription.paid (Pro)")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <TelebirrIcon className="h-3.5 w-3.5" />
            <span>Simulate Telebirr Pro Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook("ENTERPRISE", "ACTIVE", "telebirr.subscription.paid (Enterprise)")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Building className="h-3.5 w-3.5" />
            <span>Simulate Enterprise Upgrade</span>
          </button>

          <button
            onClick={() => handleSimulateWebhook(tier, "PAST_DUE", "telebirr.payment_failed")}
            disabled={simulatorLoading}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-amber-600 dark:text-amber-300 border border-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Simulate Past Due</span>
          </button>
        </div>

        {simulatorLog && (
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/10 text-xs font-mono text-neutral-900 dark:text-white mt-2">
            {simulatorLog}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ADD PAYMENT METHOD (Telebirr / CBE Birr / Card)
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121218] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Add Payment Method</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Connect Telebirr, CBE Birr or Bank Card</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Method Type Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewMethodType("TELEBIRR")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  newMethodType === "TELEBIRR"
                    ? "bg-neutral-50 dark:bg-white/[0.05] border-black dark:border-white shadow-2xs font-semibold"
                    : "border-neutral-200 dark:border-white/10 text-neutral-500"
                }`}
              >
                <TelebirrIcon className="h-5 w-5" />
                <span className="text-[11px]">Telebirr</span>
              </button>

              <button
                type="button"
                onClick={() => setNewMethodType("CBE_BIRR")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  newMethodType === "CBE_BIRR"
                    ? "bg-neutral-50 dark:bg-white/[0.05] border-black dark:border-white shadow-2xs font-semibold"
                    : "border-neutral-200 dark:border-white/10 text-neutral-500"
                }`}
              >
                <CbeBirrIcon className="h-5 w-5" />
                <span className="text-[11px]">CBE Birr</span>
              </button>

              <button
                type="button"
                onClick={() => setNewMethodType("CARD")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  newMethodType === "CARD"
                    ? "bg-neutral-50 dark:bg-white/[0.05] border-black dark:border-white shadow-2xs font-semibold"
                    : "border-neutral-200 dark:border-white/10 text-neutral-500"
                }`}
              >
                <VisaCardIcon className="h-5 w-5" />
                <span className="text-[11px]">Card</span>
              </button>
            </div>

            <form onSubmit={handleAddNewMethod} className="space-y-4">
              {newMethodType === "TELEBIRR" || newMethodType === "CBE_BIRR" ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+251 91 234 5678"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Must be registered with your Ethio Telecom or CBE account.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g. Nadia Rachel"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        value={newCardExp}
                        onChange={(e) => setNewCardExp(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">CVC</label>
                      <input
                        type="text"
                        required
                        defaultValue="842"
                        placeholder="123"
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <SquareCheck className="h-3.5 w-3.5" />
                  <span>Save Method</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DEPOSIT FUNDS WITH TELEBIRR
          ========================================================================= */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121218] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TelebirrIcon className="h-6 w-6" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Telebirr Wallet Deposit</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Ethio Telecom USSD Push</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {depositStep === "INPUT" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Select Deposit Amount
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 250].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmountUsd(amt)}
                        className={`py-2 rounded-2xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                          depositAmountUsd === amt
                            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs"
                            : "bg-neutral-50 dark:bg-white/[0.04] border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">USD Amount:</span>
                    <span className="font-mono font-bold text-neutral-950 dark:text-white">${depositAmountUsd}.00</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Equivalent in ETB:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {(depositAmountUsd * 130).toLocaleString()} ETB (Rate: 130 ETB/$)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Destination Account:</span>
                    <span className="font-mono text-neutral-900 dark:text-white">Helios Cloud Vault</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Telebirr Registered Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={depositPhone}
                      onChange={(e) => setDepositPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteTelebirrDeposit}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <TelebirrIcon className="h-3.5 w-3.5" />
                    <span>Send USSD Push</span>
                  </button>
                </div>
              </div>
            )}

            {depositStep === "PUSH_SENT" && (
              <div className="py-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto animate-pulse">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white">
                    USSD Prompt Sent to Handset
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                    Please check your phone ({depositPhone}) and enter your 4-digit Telebirr PIN to confirm.
                  </p>
                </div>
                <div className="font-mono text-xs text-neutral-400 animate-pulse">
                  Waiting for Ethio Telecom gateway confirmation...
                </div>
              </div>
            )}

            {depositStep === "CONFIRMED" && (
              <div className="space-y-4 py-2 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <SquareCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white">
                    Deposit Successful!
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    ${depositAmountUsd}.00 ({(depositAmountUsd * 130).toLocaleString()} ETB) added to your organization balance.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/10 font-mono text-[11px] text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Transaction ID:</span>
                    <span className="text-neutral-950 dark:text-white font-bold">{depositTxRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Provider:</span>
                    <span className="text-neutral-950 dark:text-white">Telebirr (Ethio Telecom)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">SETTLED</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="w-full py-2.5 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: CHECKOUT WITH TELEBIRR (PLAN UPGRADE)
          ========================================================================= */}
      {isCheckoutModalOpen && selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121218] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                  Confirm Subscription Upgrade
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Select payment source for {PLAN_CONFIGS[selectedPlanForUpgrade].name}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.06] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Target Plan:</span>
                <span className="font-bold text-neutral-950 dark:text-white">
                  {PLAN_CONFIGS[selectedPlanForUpgrade].name} Tier
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Monthly Billing:</span>
                <span className="font-mono font-bold text-neutral-950 dark:text-white">
                  ${PLAN_CONFIGS[selectedPlanForUpgrade].monthlyPrice}.00 / month
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">Telebirr Equivalent:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {(PLAN_CONFIGS[selectedPlanForUpgrade].monthlyPrice * 130).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Choose Payment Method
              </label>
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    onClick={() => handleSetDefault(pm.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      pm.isDefault
                        ? "bg-neutral-50 dark:bg-white/[0.04] border-black dark:border-white shadow-2xs font-semibold"
                        : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-black/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(pm.type)}
                      <div>
                        <div className="text-xs font-semibold text-neutral-950 dark:text-white">{pm.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{pm.account}</div>
                      </div>
                    </div>

                    {pm.isDefault && (
                      <SquareCheck className="h-4 w-4 text-neutral-950 dark:text-white" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPlanPayment}
                disabled={simulatorLoading}
                className="px-5 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <TelebirrIcon className="h-3.5 w-3.5" />
                <span>{simulatorLoading ? "Authorizing..." : "Confirm & Pay"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: INVOICE RECEIPT MODAL
          ========================================================================= */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121218] border border-neutral-200 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-bold font-mono">
                  HI
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Helios Official Receipt</h3>
                  <p className="text-[10px] text-neutral-400 font-mono">Receipt ref: {activeReceipt.id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Billed Organization:</span>
                <span className="font-semibold text-neutral-950 dark:text-white">{orgName} ({orgSlug})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Issue Date:</span>
                <span className="font-mono text-neutral-950 dark:text-white">{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Payment Gateway:</span>
                <span className="font-mono text-neutral-950 dark:text-white flex items-center gap-1">
                  <TelebirrIcon className="h-3.5 w-3.5" />
                  <span>{activeReceipt.paymentMethod}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <SquareCheck className="h-3.5 w-3.5" />
                  <span>PAYMENT VERIFIED</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/[0.06] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>{activeReceipt.planName}</span>
                  <span className="font-bold">${activeReceipt.amount}.00</span>
                </div>
                <div className="flex justify-between text-neutral-400 text-[10px]">
                  <span>VAT (15%) Included</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-white/10 pt-1.5 flex justify-between font-bold text-xs">
                  <span>Total Settled:</span>
                  <span className="text-neutral-950 dark:text-white">${activeReceipt.amount}.00 USD</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Developed by Miskr Dires</span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="h-3 w-3" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
