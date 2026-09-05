import { getTenantContext } from "@/lib/tenant-context";
import { prisma, getScopedPrisma } from "@/lib/prisma";
import { HeliosMarketView } from "@/components/helios-market-view";

export const dynamic = "force-dynamic";

interface MarketPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);
  const db = getScopedPrisma(tenant.organizationId);

  let projectsCount = 3;
  let membersCount = 2;
  let recentProjects: any[] = [];

  try {
    const [pCount, mCount, rProjects] = await Promise.all([
      prisma.project.count({ where: { organizationId: tenant.organizationId } }),
      prisma.organizationMember.count({ where: { organizationId: tenant.organizationId } }),
      db.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);
    projectsCount = pCount;
    membersCount = mCount;
    recentProjects = rProjects;
  } catch (e) {
    console.warn("Could not query market data from database:", e);
  }

  return (
    <div className="space-y-6">
      <HeliosMarketView
        orgSlug={tenant.organizationSlug}
        projectsCount={projectsCount}
        membersCount={membersCount}
        recentProjects={recentProjects}
      />
    </div>
  );
}
