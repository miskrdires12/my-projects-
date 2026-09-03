import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { TeamClient } from "@/components/team-client";

interface TeamPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = await params;
  const tenant = await getTenantContext(orgSlug);

  const [members, invitations] = await Promise.all([
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
