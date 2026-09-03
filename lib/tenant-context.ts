import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipRole, TenantContext, SubscriptionTier, SubscriptionStatus } from "@/types/tenant";

const ROLE_RANK: Record<MembershipRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/**
 * Checks if the user's role meets or exceeds the required role.
 */
export function hasRolePermission(currentRole: MembershipRole, requiredRole: MembershipRole): boolean {
  return ROLE_RANK[currentRole] >= ROLE_RANK[requiredRole];
}

/**
 * Enforces role authorization; throws an error if the user's role is insufficient.
 */
export function assertAuthorizedRole(currentRole: MembershipRole, requiredRole: MembershipRole): void {
  if (!hasRolePermission(currentRole, requiredRole)) {
    throw new Error(
      `FORBIDDEN_INSUFFICIENT_PERMISSIONS: Requires '${requiredRole}' role, but user holds '${currentRole}'.`
    );
  }
}

/**
 * Resolves the authenticated user and their active tenant context.
 * Safely extracts header injections from middleware or falls back to database lookup.
 */
export async function getTenantContext(explicitSlug?: string): Promise<TenantContext> {
  const session = await getServerSession(authOptions);

  // Fallback demo user for immediate inspection if not signed in
  let userId = session?.user && (session.user as any).id;
  let userEmail = session?.user?.email;
  let userName = session?.user?.name || "Demo User";

  if (!userId) {
    const demoUser =
      (await prisma.user.findFirst({
        where: { email: "miskr@example.com" },
      })) ||
      (await prisma.user.findFirst({
        where: { email: "alex@example.com" },
      }));
    if (demoUser) {
      userId = demoUser.id;
      userEmail = demoUser.email;
      userName = demoUser.name || "Miskr";
    } else {
      throw new Error("UNAUTHENTICATED: No active session and no default user found.");
    }
  }

  // Check headers injected by Next.js middleware
  const headerList = await headers();
  const headerOrgId = headerList.get("x-tenant-id");
  const headerOrgSlug = headerList.get("x-tenant-slug");
  const headerOrgRole = headerList.get("x-tenant-role") as MembershipRole | null;

  const targetSlug = explicitSlug || headerOrgSlug || "acme";

  // Lookup target organization
  const organization = await prisma.organization.findUnique({
    where: { slug: targetSlug },
  });

  if (!organization) {
    throw new Error(`TENANT_NOT_FOUND: Organization with slug '${targetSlug}' does not exist.`);
  }

  // Lookup membership role for this user
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: userId!,
      },
    },
  });

  const userRole: MembershipRole = (membership?.role as MembershipRole) || headerOrgRole || "MEMBER";

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    userRole,
    subscriptionTier: organization.subscriptionTier as SubscriptionTier,
    subscriptionStatus: organization.subscriptionStatus as SubscriptionStatus,
    userId: userId!,
    userEmail: userEmail || "alex@example.com",
    userName,
  };
}
