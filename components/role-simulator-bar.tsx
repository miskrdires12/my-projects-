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
    <div className="bg-[#0c0c12]/95 border-b border-white/[0.06] px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-xs gap-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-neutral-400">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>live instance</span>
        </span>
        <span className="text-white/20">·</span>
        <span className="text-neutral-400 text-[11px]">
          Workspace: <span className="font-mono text-white font-medium">{currentOrgSlug}.omnitenant.io</span>
        </span>
        <span className="text-white/20 hidden sm:inline">·</span>
        <span className="text-neutral-400 text-[11px] hidden sm:inline">
          Role: <strong className="text-fuchsia-400 font-medium">{currentRole}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-neutral-500 text-[10px] hidden md:inline font-mono">Simulate:</span>
        <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => switchTenant("acme")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "acme"
                ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Acme (Pro)
          </button>
          <button
            onClick={() => switchTenant("stark")}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
              currentOrgSlug === "stark"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Stark (Enterprise)
          </button>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          title="Hide bar"
          className="text-neutral-500 hover:text-white p-1 rounded transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
