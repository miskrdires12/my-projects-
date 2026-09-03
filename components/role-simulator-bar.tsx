"use client";

import { useRouter, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
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
        <div className="h-2 w-2 rounded-full bg-black animate-pulse" />
        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-neutral-800" />
          Multi-Tenant Workspace:
        </span>
        <span className="text-neutral-500 hidden sm:inline">
          Active Tenant <strong className="text-neutral-900 font-mono">/{currentOrgSlug}</strong> as{" "}
          <strong className="text-neutral-900">{currentRole}</strong> ({currentTier} Plan)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-neutral-400 text-[11px] hidden md:inline">Quick Switch:</span>
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          <button
            onClick={() => switchTenant("acme")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              currentOrgSlug === "acme"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
            }`}
          >
            Acme (PRO • Owner)
          </button>
          <button
            onClick={() => switchTenant("stark")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              currentOrgSlug === "stark"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
            }`}
          >
            Stark (ENT • Admin)
          </button>
          <button
            onClick={() => switchTenant("studio")}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              currentOrgSlug === "studio"
                ? "bg-black text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white"
            }`}
          >
            Studio (FREE • Member)
          </button>
        </div>
      </div>
    </div>
  );
}
