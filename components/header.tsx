"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { CommandPalette } from "./command-palette";

interface HeaderProps {
  organizationName: string;
  organizationSlug: string;
  tier: string;
  status: string;
  role: string;
}

export function Header({ organizationName, organizationSlug, tier, status, role }: HeaderProps) {
  const pathname = usePathname();
  const currentSection = pathname?.split("/")[2] || "dashboard";
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-neutral-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Breadcrumb & Organization Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-neutral-900">{organizationName}</span>
            <span className="text-neutral-300">/</span>
            <span className="text-neutral-500 capitalize">{currentSection}</span>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center gap-1.5">
            <span>{tier}</span>
            <span className="text-[9px] text-neutral-400">• {status}</span>
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Search bar which opens Command Palette */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="relative hidden sm:flex items-center text-left pl-8 pr-12 py-1.5 text-xs rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-500 hover:text-neutral-800 w-64 transition-all group"
          >
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-black" />
            <span className="truncate">Search or type command...</span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
              ⌘K
            </span>
          </button>

          <div className="flex items-center gap-2">
            {tier === "FREE" && (
              <Link
                href={`/${organizationSlug}/billing`}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 transition-all"
              >
                <span>Upgrade</span>
              </Link>
            )}

            <div className="h-6 w-px bg-neutral-200 hidden sm:block mx-1" />

            <button
              title="Notifications"
              className="p-2 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-100 border border-transparent transition-colors"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global ⌘K Command Palette Modal */}
      <CommandPalette
        currentOrgSlug={organizationSlug}
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
