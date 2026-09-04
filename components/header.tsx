"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Bell, Settings, Sparkles, Mic } from "lucide-react";
import { CommandPalette } from "./command-palette";

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
  const searchParams = useSearchParams();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const currentTab = searchParams?.get("tab") || "wallet";

  const handleTabSwitch = (tab: string) => {
    if (tab === "wallet") {
      router.push(`/${organizationSlug}/dashboard`);
    } else {
      router.push(`/${organizationSlug}/dashboard?tab=${tab}`);
    }
  };

  // Get first name for warm greeting
  const firstName = userName?.split(" ")[0] || "Nadia";

  return (
    <>
      <header className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.06] bg-[#0d0d13]/80 backdrop-blur-md">
        {/* Left: Greeting + Subtitle + Pill Tabs */}
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white font-sans">
              Welcome, {firstName}
            </h1>
            <p className="text-xs text-neutral-400 font-normal mt-0.5">
              Here&apos;s your investment portfolio overview
            </p>
          </div>

          {/* Pill Selector: Market, Wallet, Tools */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => handleTabSwitch("market")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "market"
                  ? "helios-pill-active text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                  : "helios-pill-inactive"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => handleTabSwitch("wallet")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "wallet"
                  ? "helios-pill-active text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.35)]"
              : "helios-pill-inactive"
          }`}
            >
              Wallet
            </button>
            <button
              onClick={() => handleTabSwitch("tools")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                currentTab === "tools"
                  ? "helios-pill-active text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                  : "helios-pill-inactive"
              }`}
            >
              Tools
            </button>
          </div>
        </div>

        {/* Right: AI Search Pill + Actions + Profile Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ask AI Search Pill Bar */}
          <button
            onClick={() => setIsCommandOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#15151f] hover:bg-[#1a1a26] border border-white/[0.08] hover:border-purple-500/40 text-neutral-400 hover:text-white transition-all text-xs cursor-pointer group shadow-sm w-full sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-400 group-hover:scale-110 transition-transform" />
            <span className="truncate pr-2">Ask helios.ai anything</span>
            <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-400 border border-white/[0.06]">
              ⌘K
            </span>
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCommandOpen(true)}
              title="Notifications"
              className="p-2.5 rounded-full bg-[#15151f] hover:bg-[#1a1a26] border border-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => router.push(`/${organizationSlug}/billing`)}
              title="Settings"
              className="p-2.5 rounded-full bg-[#15151f] hover:bg-[#1a1a26] border border-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full bg-[#15151f] border border-white/[0.08]">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-300 p-0.5 flex-shrink-0">
              <div className="w-full h-full rounded-full bg-[#13131a] flex items-center justify-center text-[11px] font-bold text-white">
                {firstName.charAt(0)}
              </div>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{userName}</p>
              <p className="text-[10px] text-neutral-400 leading-tight">{userEmail}</p>
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
