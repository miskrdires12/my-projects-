import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { TeamClient } from "@/components/team-client";

export const dynamic = "force-dynamic";

interface TeamPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);

  let members: any[] = [];
  let invitations: any[] = [];

  try {
    const [m, inv] = await Promise.all([
      prisma.organizationMember.findMany({
        where: { organizationId: tenant.organizationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.invitation.findMany({
        where: { organizationId: tenant.organizationId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    members = m;
    invitations = inv;
  } catch (e) {
    console.warn("Could not query team data from database:", e);
  }

  return (
    <TeamClient
      initialMembers={members}
      initialInvitations={invitations}
      orgSlug={tenant.organizationSlug}
      currentUserRole={tenant.userRole}
      currentUserId={tenant.userId}
      currentTier={tenant.subscriptionTier}
    />
  );
}
