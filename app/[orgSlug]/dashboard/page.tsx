import { getTenantContext } from "@/lib/tenant-context";
import { getScopedPrisma, prisma } from "@/lib/prisma";
import { PLAN_CONFIGS } from "@/lib/stripe";
import { HeliosPortfolioView } from "@/components/helios-portfolio-view";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { orgSlug } = await params;
  const sParams = await searchParams;
  const activeTab = sParams?.tab || "wallet";

  const tenant = await getTenantContext(orgSlug);

  if (activeTab === "market") {
    redirect(`/${tenant.organizationSlug}/market`);
  }
  if (activeTab === "tools") {
    redirect(`/${tenant.organizationSlug}/tools`);
  }

  const db = getScopedPrisma(tenant.organizationId);

  let projectsCount = 0;
  let membersCount = 0;
  let recentProjects: any[] = [];
  let recentAuditLogs: any[] = [];

  try {
    const [pCount, mCount, rProjects, rAuditLogs] = await Promise.all([
      prisma.project.count({ where: { organizationId: tenant.organizationId } }),
      prisma.organizationMember.count({ where: { organizationId: tenant.organizationId } }),
      db.project.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: true },
      }),
    ]);
    projectsCount = pCount;
    membersCount = mCount;
    recentProjects = rProjects;
    recentAuditLogs = rAuditLogs;
  } catch (e) {
    console.warn("Could not query dashboard data from database:", e);
    projectsCount = 3;
    membersCount = 2;
    recentProjects = [
      {
        id: "proj_demo_1",
        name: "auth-edge-service",
        description: "JWT token validation and edge proxy authentication.",
        status: "ACTIVE",
        createdAt: new Date(),
      },
      {
        id: "proj_demo_2",
        name: "stripe-billing-sync",
        description: "Webhook event processor syncing customer subscriptions.",
        status: "ACTIVE",
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        id: "proj_demo_3",
        name: "search-indexing-worker",
        description: "Background worker syncing tenant database records to search index.",
        status: "ACTIVE",
        createdAt: new Date(Date.now() - 86400000),
      },
    ];
    recentAuditLogs = [
      {
        id: "log_1",
        action: "ORGANIZATION_CREATED",
        createdAt: new Date(Date.now() - 7200000),
        user: { name: "Nadia Rachel" },
      },
      {
        id: "log_2",
        action: "MEMBER_INVITED",
        createdAt: new Date(Date.now() - 3600000),
        user: { name: "Miskr Dires" },
      },
      {
        id: "log_3",
        action: "SUBSCRIPTION_UPGRADED",
        createdAt: new Date(Date.now() - 1800000),
        user: { name: "Nadia Rachel" },
      },
      {
        id: "log_4",
        action: "PROJECT_CREATED",
        createdAt: new Date(Date.now() - 600000),
        user: { name: "Miskr Dires" },
      },
    ];
  }

  function formatAction(action: string) {
    const map: Record<string, string> = {
      ORGANIZATION_CREATED: "workspace.created",
      MEMBER_INVITED: "member.invited",
      SUBSCRIPTION_UPGRADED: "billing.upgraded",
      PROJECT_CREATED: "service.deployed",
      PROJECT_ARCHIVED: "service.archived",
      PROJECT_DELETED: "service.deleted",
    };
    return map[action] || action.toLowerCase().replace(/_/g, ".");
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* The Master Helios Investment Dashboard */}
      <HeliosPortfolioView />

      {/* Quick Access to Services and Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-2">
        {/* Deployed Services Quick Card */}
        <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/[0.05]">
            <div>
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Active Infrastructure & Pipelines</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Microservices in {tenant.organizationName} · Developed by Miskr Dires</p>
            </div>
            <Link
              href={`/${tenant.organizationSlug}/projects`}
              className="text-xs text-neutral-900 dark:text-white font-medium hover:underline flex items-center gap-1"
            >
              <span>Manage All ({projectsCount})</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentProjects.map((proj) => (
              <div
                key={proj.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#14141a] border border-neutral-200/60 dark:border-white/[0.05] hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-neutral-900 dark:text-white font-mono">
                      {proj.name}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {proj.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">{proj.description}</p>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {new Date(proj.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Trail Quick Card */}
        <div className="rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-xl space-y-3">
          <div className="pb-2 border-b border-neutral-100 dark:border-white/[0.05]">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white">Activity Trail</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Real-time immutable audit logs</p>
          </div>

          <div className="space-y-2.5">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs">
                <div className="h-6 w-6 rounded-lg bg-neutral-100 dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-800 dark:text-neutral-200 flex-shrink-0 mt-0.5">
                  <Clock className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-neutral-900 dark:text-white font-semibold">
                      {formatAction(log.action)}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    Triggered by {log.user?.name || "Automated Worker"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
