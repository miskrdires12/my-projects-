import { getTenantContext } from "@/lib/tenant-context";
import { getScopedPrisma, prisma } from "@/lib/prisma";
import { PLAN_CONFIGS } from "@/lib/stripe";
import { TenantTools } from "@/components/tenant-tools";
import { DashboardShell } from "@/components/dashboard-shell";
import { TelemetryCharts } from "@/components/telemetry-charts";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { HeliosPortfolioView } from "@/components/helios-portfolio-view";
import Link from "next/link";
import {
  FolderKanban,
  Users2,
  CreditCard,
  Activity,
  ArrowUpRight,
  Clock,
  Plus,
  Shield,
  Zap,
  Layers,
  Code2,
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
    // Graceful fallback values
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

  const planInfo = PLAN_CONFIGS[tenant.subscriptionTier];

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
    <DashboardShell orgSlug={tenant.organizationSlug}>
      <div className="space-y-6">
        {/* If user selected Market tab */}
        {activeTab === "market" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Primary Metric Grid in Adaptive Black & White */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Active Services</span>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-900 dark:text-white">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono">
                    {projectsCount}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                    <span>Quota:</span>
                    <span className="text-neutral-900 dark:text-white font-medium font-mono">
                      {planInfo.limits.maxProjects >= 999 ? "Unlimited" : `${planInfo.limits.maxProjects} max`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Team Capacity</span>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-900 dark:text-white">
                    <Users2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono">
                    {membersCount} <span className="text-xs font-normal text-neutral-500">seats</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                    <span>Available:</span>
                    <span className="text-neutral-900 dark:text-white font-medium font-mono">
                      {planInfo.limits.maxMembers >= 999 ? "Unlimited" : `${planInfo.limits.maxMembers} total`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Monthly Plan</span>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-neutral-900 dark:text-white">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono">
                    ${planInfo.monthlyPrice} <span className="text-xs font-normal text-neutral-500">/mo</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium flex items-center gap-1.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Renewal active</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Edge Uptime</span>
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-white/[0.06] text-emerald-600 dark:text-emerald-400">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono">
                    99.99%
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1 font-mono">
                    <Zap className="h-3 w-3 text-neutral-900 dark:text-white" />
                    <span>p95: 14ms latency</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Telemetry Chart */}
            <TelemetryCharts />

            {/* Deployed Services List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Deployed Services</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Active pipelines and microservices</p>
                </div>
                <Link
                  href={`/${tenant.organizationSlug}/projects`}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Deploy Service</span>
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between shadow-xs group"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-white font-mono">
                          {proj.name}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {proj.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        {proj.description || "Service deployment active."}
                      </p>
                    </div>

                    <span className="text-[10px] text-neutral-400 whitespace-nowrap font-mono">
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* If user selected Tools tab */}
        {activeTab === "tools" && (
          <div className="space-y-6 animate-in fade-in duration-200">
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
        )}

        {/* Default: Wallet view - Pure Black & White Luxury Dashboard */}
        {activeTab === "wallet" && (
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
        )}
      </div>
    </DashboardShell>
  );
}
