import Stripe from "stripe";
import { SubscriptionTier } from "@/types/tenant";

// Initialize Stripe with fallback mock handling for development if key isn't provided
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2025-02-24.acacia" as any,
  typescript: true,
});

export const PLAN_CONFIGS: Record<
  SubscriptionTier,
  {
    name: string;
    description: string;
    monthlyPrice: number;
    priceId: string;
    features: string[];
    isPopular?: boolean;
    limits: {
      maxProjects: number;
      maxMembers: number;
      hasAuditLogs: boolean;
      hasPrioritySupport: boolean;
    };
  }
> = {
  FREE: {
    name: "Starter",
    description: "Ideal for small experiments, MVPs, and solo founders.",
    monthlyPrice: 0,
    priceId: "price_free",
    features: [
      "Up to 3 Active Projects",
      "Up to 2 Team Members",
      "Community Forum Support",
      "Standard Latency API",
    ],
    limits: {
      maxProjects: 3,
      maxMembers: 2,
      hasAuditLogs: false,
      hasPrioritySupport: false,
    },
  },
  PRO: {
    name: "Professional",
    description: "Built for scaling teams requiring higher throughput and team collaboration.",
    monthlyPrice: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly_123",
    isPopular: true,
    features: [
      "Unlimited Projects",
      "Up to 15 Team Members",
      "Full Audit Trail & Logs",
      "Role-Based Access Control",
      "Priority Email & Chat Support",
    ],
    limits: {
      maxProjects: 100,
      maxMembers: 15,
      hasAuditLogs: true,
      hasPrioritySupport: true,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "Dedicated infrastructure, custom SLAs, and advanced security governance.",
    monthlyPrice: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_monthly_456",
    features: [
      "Unlimited Everything",
      "Dedicated Slack Connect Channel",
      "Custom SLA & 99.99% Uptime",
      "SSO / SAML Identity Provider",
      "Custom Data Residency",
    ],
    limits: {
      maxProjects: 9999,
      maxMembers: 9999,
      hasAuditLogs: true,
      hasPrioritySupport: true,
    },
  },
};

/**
 * Maps incoming Stripe Price IDs to internal subscription tiers.
 */
export function mapPriceIdToTier(priceId: string): SubscriptionTier {
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === "price_enterprise_monthly_456") {
    return "ENTERPRISE";
  }
  if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === "price_pro_monthly_123") {
    return "PRO";
  }
  return "FREE";
}

/**
 * Creates a Stripe Billing Customer Portal session for updating payment methods or canceling.
 */
export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  // If running in development with mock keys, return simulated portal URL
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("mock")) {
    return `${returnUrl}?portal_mock=success`;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return portalSession.url;
}
