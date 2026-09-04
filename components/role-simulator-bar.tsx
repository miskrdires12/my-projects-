"use client";

import { useRouter, usePathname } from "next/navigation";
import { MembershipRole } from "@/types/tenant";

interface RoleSimulatorBarProps {
  currentOrgSlug: string;
  currentRole: MembershipRole;
  currentTier: string;
}

export function RoleSimulatorBar({ currentOrgSlug, currentRole, currentTier }: RoleSimulatorBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const switchTenant = (slug: string) => {
    const currentSubpath = pathname?.replace(`/${currentOrgSlug}`, "") || "/dashboard";
    router.push(`/${slug}${currentSubpath}`);
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
      <div className="flex items-center gap-2.5 text-neutral-600">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-[11px] font-mono text-neutral-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>production</span>
        </span>
        <span className="text-neutral-400">·</span>
        <span className="text-neutral-500">
          Workspace: <span className="font-mono text-neutral-900 font-medium">{currentOrgSlug}.omnitenant.io</span>
        </span>
        <span className="text-neutral-400 hidden sm:inline">·</span>
        <span className="text-neutral-500 hidden sm:inline">
          Role: <strong className="text-neutral-900 font-medium">{currentRole}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-neutral-400 text-[11px] hidden md:inline font-mono">Switch:</span>
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
          <button
            onClick={() => switchTenant("acme")}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "acme"
                ? "bg-white text-neutral-950 font-semibold shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            Acme Tech
          </button>
          <button
            onClick={() => switchTenant("stark")}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "stark"
                ? "bg-white text-neutral-950 font-semibold shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            Stark Innovations
          </button>
          <button
            onClick={() => switchTenant("studio")}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "studio"
                ? "bg-white text-neutral-950 font-semibold shadow-xs"
                : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            Startup Studio
          </button>
        </div>
      </div>
    </div>
  );
}
