import { notFound } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { RoleSimulatorBar } from "@/components/role-simulator-bar";
import { getTenantContext } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { OrganizationMembershipInfo, MembershipRole, SubscriptionTier, SubscriptionStatus } from "@/types/tenant";
import { ToastProvider } from "@/components/toast-provider";

export const dynamic = "force-dynamic";

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
  let memberships: any[] = [];
  try {
    memberships = await prisma.organizationMember.findMany({
      where: { userId: tenant.userId },
      include: {
        organization: true,
      },
    });
  } catch (e) {
    console.warn("Could not load organization memberships:", e);
  }

  const userOrganizations: OrganizationMembershipInfo[] =
    memberships.length > 0
      ? memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          logoUrl: m.organization.logoUrl,
          role: m.role as MembershipRole,
          subscriptionTier: m.organization.subscriptionTier as SubscriptionTier,
          subscriptionStatus: m.organization.subscriptionStatus as SubscriptionStatus,
        }))
      : [
          {
            id: "org_helios",
            name: "Helios Capital",
            slug: "acme",
            logoUrl: null,
            role: "OWNER",
            subscriptionTier: "PRO",
            subscriptionStatus: "ACTIVE",
          },
          {
            id: "org_stark",
            name: "Stark Innovations",
            slug: "stark",
            logoUrl: null,
            role: "ADMIN",
            subscriptionTier: "ENTERPRISE",
            subscriptionStatus: "ACTIVE",
          },
        ];

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#050507] text-neutral-900 dark:text-[#f4f4f7] font-sans antialiased selection:bg-black dark:selection:bg-white selection:text-white dark:selection:text-black p-2 sm:p-4 lg:p-6 flex flex-col justify-center items-center transition-colors duration-200">
      {/* Outer Console Frame supporting Day/Night modes */}
      <div className="w-full max-w-[1600px] rounded-[2rem] sm:rounded-[2.5rem] bg-white dark:bg-[#0c0c10] border border-neutral-200/80 dark:border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden min-h-[92vh] transition-colors duration-200">
        {/* Simulator Bar */}
        <RoleSimulatorBar
          currentOrgSlug={tenant.organizationSlug}
          currentRole={tenant.userRole}
          currentTier={tenant.subscriptionTier}
        />

        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Monochrome Sidebar */}
          <Sidebar
            currentOrg={{
              id: tenant.organizationId,
              slug: tenant.organizationSlug,
              name: tenant.organizationName,
              tier: tenant.subscriptionTier,
            }}
            currentUser={{
              id: tenant.userId,
              name: tenant.userName || "Nadia Rachel",
              email: tenant.userEmail || "rachel_helios@gmail.com",
              role: tenant.userRole,
            }}
            userOrganizations={userOrganizations}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-neutral-50 dark:bg-[#07070a] transition-colors duration-200">
            <Header
              organizationName={tenant.organizationName}
              organizationSlug={tenant.organizationSlug}
              tier={tenant.subscriptionTier}
              status={tenant.subscriptionStatus}
              role={tenant.userRole}
              userName={tenant.userName || "Nadia Rachel"}
              userEmail={tenant.userEmail || "rachel_helios@gmail.com"}
            />
            <main className="p-4 sm:p-6 w-full mx-auto space-y-6 flex-1">
              <ToastProvider>{children}</ToastProvider>
            </main>

            {/* Global Watermark Footer: Developed by Miskr Dires */}
            <footer className="px-6 py-4 border-t border-neutral-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-white">Helios Enterprise</span>
                <span>·</span>
                <span>Engineered & Developed by <strong className="text-black dark:text-white font-semibold">Miskr Dires</strong></span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>v3.0.0 · Production Ready</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
