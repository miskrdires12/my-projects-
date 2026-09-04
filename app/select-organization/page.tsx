import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-[#07070b] text-white flex flex-col justify-center items-center p-6 font-sans relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-pink-600/10 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-purple-600/30 border border-fuchsia-500/30 flex items-center justify-center text-white mx-auto shadow-[0_0_20px_rgba(217,70,239,0.3)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-white"
            >
              <path d="M4 6h4v12H4z" />
              <path d="M16 6h4v12h-4z" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white font-sans">
            Select Workspace
          </h1>
          <p className="text-xs text-neutral-400">
            Choose an active portfolio or switch teams.
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/${org.slug}/dashboard`}
              className="p-4 rounded-3xl bg-[#13131b] border border-white/[0.08] hover:border-purple-500/40 hover:bg-[#161622] transition-all flex items-center justify-between group shadow-xl cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {org.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-white group-hover:text-fuchsia-300 transition-colors">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                    <span className="font-mono text-fuchsia-300">/{org.slug}</span>
                    <span>·</span>
                    <span>{org._count.projects} services</span>
                    <span>·</span>
                    <span>{org._count.members} seats</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/10 uppercase">
                  {org.subscriptionTier}
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-xs text-neutral-400 hover:text-white underline transition-colors"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
