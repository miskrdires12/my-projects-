import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings-client";

interface SettingsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { orgSlug } = await params;

  let tenant;
  try {
    tenant = await getTenantContext(orgSlug);
  } catch (error) {
    notFound();
  }

  const organization = await prisma.organization.findUnique({
    where: { id: tenant.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <SettingsClient
      orgId={organization.id}
      orgSlug={organization.slug}
      orgName={organization.name}
      orgTier={organization.subscriptionTier}
      orgStatus={organization.subscriptionStatus}
      userRole={tenant.userRole}
      userEmail={tenant.userEmail || "admin@helios.io"}
    />
  );
}
