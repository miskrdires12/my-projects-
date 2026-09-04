import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Plus, Building2 } from "lucide-react";

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
        name: "Acme Corp",
        slug: "acme",
        subscriptionTier: "PRO",
        _count: { projects: 8, members: 4 },
      },
      {
        id: "org_stark",
        name: "Stark Industries",
        slug: "stark",
        subscriptionTier: "ENTERPRISE",
        _count: { projects: 24, members: 12 },
      },
      {
        id: "org_studio",
        name: "Studio Craft",
        slug: "studio",
        subscriptionTier: "FREE",
        _count: { projects: 2, members: 2 },
      },
    ];
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white font-bold mx-auto shadow-xs">
            ▲
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950">Select Organization</h1>
          <p className="text-xs text-neutral-500">
            Choose a workspace tenant or launch a new multi-tenant organization.
          </p>
        </div>

        <div className="space-y-2.5">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/${org.slug}/dashboard`}
              className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-neutral-400 transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                  {org.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-neutral-950 group-hover:underline transition-colors">
                    {org.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="font-mono">/{org.slug}</span>
                    <span>•</span>
                    <span>{org._count.projects} projects</span>
                    <span>•</span>
                    <span>{org._count.members} members</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-900 border border-neutral-300">
                  {org.subscriptionTier}
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
