"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Bell, Sparkles } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-provider";
import { toTiny } from "@/lib/tiny-text";

interface HeaderProps {
  organizationName: string;
  organizationSlug: string;
  tier: string;
  status: string;
  role: string;
  userName?: string;
  userEmail?: string;
}

export function Header({
  organizationName,
  organizationSlug,
  tier,
  status,
  role,
  userName = "Nadia Rachel",
  userEmail = "rachel_helios@gmail.com",
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const currentTab =
    pathname?.endsWith("/market") || searchParams?.get("tab") === "market"
      ? "market"
      : pathname?.endsWith("/tools") || searchParams?.get("tab") === "tools"
      ? "tools"
      : "wallet";

  const handleTabSwitch = (tab: string) => {
    if (tab === "market") {
      router.push(`/${organizationSlug}/market`);
    } else if (tab === "tools") {
      router.push(`/${organizationSlug}/tools`);
    } else {
      router.push(`/${organizationSlug}/dashboard`);
    }
  };

  const firstName = userName?.split(" ")[0] || "Nadia";

  return (
    <>
      <header className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-neutral-200/80 dark:border-white/[0.06] bg-white/70 dark:bg-[#0c0c10]/70 backdrop-blur-md transition-colors duration-200">
        {/* Left: Greeting + Subtitle + Pill Tabs */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
                Welcome, {firstName}
              </h1>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold border border-black/10 dark:border-white/10">
                {tier}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Developed by <strong className="text-neutral-900 dark:text-white font-semibold">Miskr Dires</strong></span>
              <span>·</span>
              <span>Investment portfolio & cloud services</span>
            </p>
          </div>

          {/* Pill Selector: Market, Wallet, Tools */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={() => handleTabSwitch("market")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "market"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => handleTabSwitch("wallet")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "wallet"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => handleTabSwitch("tools")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "tools"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Tools
            </button>
          </div>
        </div>

        {/* Right: AI Search Pill + Day/Night Toggle + Profile */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ask AI Search Pill Bar with 'Type something to start' font */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-neutral-200/80 dark:hover:bg-[#1a1a24] border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all text-xs cursor-pointer group shadow-2xs w-full sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-neutral-800 dark:text-white group-hover:scale-110 transition-transform" />
            <span className="truncate pr-2 font-medium">{toTiny("Type something to start")}</span>
            <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.08]">
              ⌘K
            </span>
          </button>

          {/* Action Icons including Day / Night Mode Switcher */}
          <div className="flex items-center gap-2">
            {/* Day / Night Theme Toggle */}
            <ThemeToggle />

            <button
              onClick={() => setIsCommandOpen(true)}
              title={toTiny("Notifications")}
              className="p-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-neutral-200/80 dark:hover:bg-[#1a1a24] border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full bg-neutral-100 dark:bg-[#15151c] border border-neutral-200 dark:border-white/[0.08]">
            <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm">
              {firstName.charAt(0)}
            </div>
            <div className="text-left hidden sm:block leading-tight">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">{userName}</p>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">{userEmail}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Global ⌘K Command Palette & AI Dialog */}
      <CommandPalette
        currentOrgSlug={organizationSlug}
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
