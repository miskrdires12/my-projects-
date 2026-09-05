import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { PLAN_CONFIGS } from "@/lib/stripe";
import { TenantTools } from "@/components/tenant-tools";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export const dynamic = "force-dynamic";

interface ToolsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function ToolsPage({ params }: ToolsPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);

  let projectsCount = 0;
  let membersCount = 0;

  try {
    const [pCount, mCount] = await Promise.all([
      prisma.project.count({ where: { organizationId: tenant.organizationId } }),
      prisma.organizationMember.count({ where: { organizationId: tenant.organizationId } }),
    ]);
    projectsCount = pCount;
    membersCount = mCount;
  } catch (e) {
    projectsCount = 3;
    membersCount = 2;
  }

  const planInfo = PLAN_CONFIGS[tenant.subscriptionTier];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="pb-2">
        <h2 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
          Developer & Tenant Infrastructure Tools
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          API credentials, webhooks, domain routing & security policy · Developed by Miskr Dires
        </p>
      </div>

      <TenantTools
        organizationId={tenant.organizationId}
        organizationName={tenant.organizationName}
        organizationSlug={tenant.organizationSlug}
        subscriptionTier={tenant.subscriptionTier}
        userRole={tenant.userRole}
        projectsCount={projectsCount}
        membersCount={membersCount}
        maxProjects={planInfo.limits.maxProjects}
        maxMembers={planInfo.limits.maxMembers}
      />

      <OnboardingChecklist orgSlug={tenant.organizationSlug} />
    </div>
  );
}
