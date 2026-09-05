import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";
import { toTiny } from "@/lib/tiny-text";

export const dynamic = "force-dynamic";

export default async function SelectOrganizationPage() {
  let organizations: any[] = [];
  try {
    organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { members: true, projects: true },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.warn("Could not fetch organizations:", e);
  }

  if (organizations.length === 0) {
    organizations = [
      {
        id: "org_acme",
        name: "Helios Capital",
        slug: "acme",
        subscriptionTier: "PRO",
        _count: { projects: 8, members: 4 },
      },
      {
        id: "org_stark",
        name: "Stark Innovations",
        slug: "stark",
        subscriptionTier: "ENTERPRISE",
        _count: { projects: 24, members: 12 },
      },
    ];
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#07070b] text-neutral-900 dark:text-white flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden transition-colors duration-200">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M4 6h4v12H4z" />
                <path d="M16 6h4v12h-4z" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <span className="font-bold text-sm">{toTiny("Helios Platform")}</span>
          </div>

          <ThemeToggle />
        </div>

        <div className="text-center space-y-1.5 pt-2">
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white font-sans">
            {toTiny("Select Workspace")}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {toTiny("Engineered & Developed by")} <strong className="text-black dark:text-white font-semibold">{toTiny("Miskr Dires")}</strong>
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/${org.slug}/dashboard`}
              className="p-4 rounded-3xl bg-white dark:bg-[#121217] border border-neutral-200/80 dark:border-white/[0.08] hover:border-black/30 dark:hover:border-white/30 hover:bg-neutral-50 dark:hover:bg-[#161622] transition-all flex items-center justify-between group shadow-sm dark:shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
                  {org.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-neutral-950 dark:text-white transition-colors">
                    {toTiny(org.name)}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    <span className="font-mono text-neutral-800 dark:text-neutral-200">/{org.slug}</span>
                    <span>·</span>
                    <span>{org._count.projects} {toTiny("services")}</span>
                    <span>·</span>
                    <span>{org._count.members} {toTiny("seats")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/10 uppercase">
                  {toTiny(org.subscriptionTier)}
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white underline transition-colors"
          >
            ← {toTiny("Back to Sign In")}
          </Link>
        </div>
      </div>
    </div>
  );
}
