import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { BillingClient } from "@/components/billing-client";

export const dynamic = "force-dynamic";

interface BillingPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);

  let org: any = null;
  try {
    org = await prisma.organization.findUnique({
      where: { id: tenant.organizationId },
    });
  } catch (e) {
    console.warn("Could not query organization billing from database:", e);
  }

  return (
    <BillingClient
      currentTier={tenant.subscriptionTier}
      currentStatus={tenant.subscriptionStatus}
      orgSlug={tenant.organizationSlug}
      orgName={tenant.organizationName}
      userRole={tenant.userRole}
      currentPeriodEnd={org?.currentPeriodEnd || null}
      stripeCustomerId={org?.stripeCustomerId || null}
    />
  );
}
