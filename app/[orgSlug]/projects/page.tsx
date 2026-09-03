import { getTenantContext } from "@/lib/tenant-context";
import { getScopedPrisma } from "@/lib/prisma";
import { ProjectsClient } from "@/components/projects-client";

interface ProjectsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);

  // Scoped Prisma client automatically restricts to tenant.organizationId
  const db = getScopedPrisma(tenant.organizationId);

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProjectsClient
      initialProjects={projects}
      orgSlug={tenant.organizationSlug}
      userRole={tenant.userRole}
      currentTier={tenant.subscriptionTier}
    />
  );
}
