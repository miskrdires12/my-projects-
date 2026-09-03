import { notFound } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { RoleSimulatorBar } from "@/components/role-simulator-bar";
import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { OrganizationMembershipInfo, MembershipRole, SubscriptionTier, SubscriptionStatus } from "@/types/tenant";
import { ToastProvider } from "@/components/toast-provider";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { orgSlug } = await params;

  let tenant;
  try {
    tenant = await getTenantContext(orgSlug);
  } catch (error) {
    console.error("Failed to load tenant context:", error);
    notFound();
  }

  // Fetch all organizations the user is a member of for the switcher
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: tenant.userId },
    include: {
      organization: true,
    },
  });

  const userOrganizations: OrganizationMembershipInfo[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logoUrl,
    role: m.role as MembershipRole,
    subscriptionTier: m.organization.subscriptionTier as SubscriptionTier,
    subscriptionStatus: m.organization.subscriptionStatus as SubscriptionStatus,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans">
      {/* Dev Architecture Simulator Bar */}
      <RoleSimulatorBar
        currentOrgSlug={tenant.organizationSlug}
        currentRole={tenant.userRole}
        currentTier={tenant.subscriptionTier}
      />

      <div className="flex flex-1 min-h-0">
        {/* Modern B2B Sidebar */}
        <Sidebar
          currentOrg={{
            id: tenant.organizationId,
            slug: tenant.organizationSlug,
            name: tenant.organizationName,
            tier: tenant.subscriptionTier,
          }}
          currentUser={{
            id: tenant.userId,
            name: tenant.userName,
            email: tenant.userEmail,
            role: tenant.userRole,
          }}
          userOrganizations={userOrganizations}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header
            organizationName={tenant.organizationName}
            organizationSlug={tenant.organizationSlug}
            tier={tenant.subscriptionTier}
            status={tenant.subscriptionStatus}
            role={tenant.userRole}
          />
          <main className="p-6 max-w-7xl w-full mx-auto space-y-6 flex-1">
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
