"use client";

import { useRouter, usePathname } from "next/navigation";
import { MembershipRole } from "@/types/tenant";
import { useState } from "react";
import { Shield, ChevronRight, X } from "lucide-react";

interface RoleSimulatorBarProps {
  currentOrgSlug: string;
  currentRole: MembershipRole;
  currentTier: string;
}

export function RoleSimulatorBar({ currentOrgSlug, currentRole, currentTier }: RoleSimulatorBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(false);

  const switchTenant = (slug: string) => {
    const currentSubpath = pathname?.replace(`/${currentOrgSlug}`, "") || "/dashboard";
    router.push(`/${slug}${currentSubpath}`);
  };

  if (isDismissed) return null;

  return (
    <div className="bg-neutral-50 dark:bg-[#0a0a0f] border-b border-neutral-200/80 dark:border-white/[0.06] px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-xs gap-3 transition-colors duration-200">
      <div className="flex items-center gap-2.5 text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>live instance</span>
        </span>
        <span className="text-neutral-300 dark:text-white/20">·</span>
        <span className="text-[11px]">
          Workspace: <span className="font-mono text-neutral-900 dark:text-white font-semibold">{currentOrgSlug}.omnitenant.io</span>
        </span>
        <span className="text-neutral-300 dark:text-white/20 hidden sm:inline">·</span>
        <span className="text-[11px] hidden sm:inline">
          Role: <strong className="text-neutral-900 dark:text-white font-semibold">{currentRole}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-neutral-500 text-[10px] hidden md:inline font-mono">Simulate:</span>
        <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-white/[0.04] p-0.5 rounded-lg border border-neutral-300 dark:border-white/[0.06]">
          <button
            onClick={() => switchTenant("acme")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "acme"
                ? "bg-white dark:bg-white text-black font-semibold shadow-2xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Acme (Pro)
          </button>
          <button
            onClick={() => switchTenant("stark")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "stark"
                ? "bg-white dark:bg-white text-black font-semibold shadow-2xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
            }`}
          >
            Stark (Enterprise)
          </button>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          title="Hide bar"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white p-1 rounded transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
