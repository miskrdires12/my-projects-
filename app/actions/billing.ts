"use server";

import { getTenantContext, assertAuthorizedRole } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { createCustomerPortalSession, PLAN_CONFIGS } from "@/lib/stripe";
import { SubscriptionTier, SubscriptionStatus } from "@/types/tenant";
import { revalidatePath } from "next/cache";

export async function getCustomerPortalUrlAction(orgSlug: string) {
  const tenant = await getTenantContext(orgSlug);
  assertAuthorizedRole(tenant.userRole, "ADMIN");

  const org = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
  });

  const returnUrl = `http://localhost:3000/${tenant.organizationSlug}/billing`;
  const customerId = org?.stripeCustomerId || `cus_mock_${tenant.organizationSlug}`;

  const portalUrl = await createCustomerPortalSession(customerId, returnUrl);
  return { success: true, url: portalUrl };
}

/**
 * Triggers a real or simulated subscription tier change.
 * In development, calls the webhook logic directly to sync database state.
 */
export async function simulateSubscriptionChangeAction(
  targetTier: SubscriptionTier,
  targetStatus: SubscriptionStatus,
  orgSlug: string
) {
  const tenant = await getTenantContext(orgSlug);
  assertAuthorizedRole(tenant.userRole, "ADMIN");

  const priceId = PLAN_CONFIGS[targetTier].priceId;
  const mockCustomerId = `cus_${tenant.organizationSlug}_${Date.now()}`;
  const mockSubscriptionId = `sub_${tenant.organizationSlug}_${Date.now()}`;

  // Update organization
  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: {
      subscriptionTier: targetTier,
      subscriptionStatus: targetStatus,
      stripeCustomerId: mockCustomerId,
      stripeSubscriptionId: targetTier === "FREE" ? null : mockSubscriptionId,
      stripePriceId: targetTier === "FREE" ? null : priceId,
      currentPeriodEnd: targetTier === "FREE" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "PLAN_MODIFIED",
      resourceType: "Subscription",
      resourceId: mockSubscriptionId,
      metadata: JSON.stringify({
        tier: targetTier,
        status: targetStatus,
        priceId,
      }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/billing`);
  revalidatePath(`/${tenant.organizationSlug}/dashboard`);
  revalidatePath(`/${tenant.organizationSlug}/team`);
  revalidatePath(`/${tenant.organizationSlug}/projects`);

  return { success: true, tier: targetTier, status: targetStatus };
}
