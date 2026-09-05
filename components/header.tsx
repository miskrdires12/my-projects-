"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Sparkles,
  Menu,
  X,
  Compass,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Users2,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

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
      <header className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-white/[0.06] bg-white/70 dark:bg-[#0c0c10]/70 backdrop-blur-md transition-colors duration-200">
        {/* Left: Greeting + Subtitle + Pill Tabs */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-3">
              {/* Universal Menu Icon Button (Pure Icon, for both PC and Phone) */}
              <button
                onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
                title="Toggle Navigation Menu"
                aria-label="Toggle Navigation Menu"
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 transition-all cursor-pointer shadow-xs active:scale-90 flex items-center justify-center flex-shrink-0"
              >
                {isNavDrawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
                  Welcome, {firstName}
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold border border-black/10 dark:border-white/10">
                  {tier}
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-normal mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Developed by <strong className="text-neutral-900 dark:text-white font-semibold">Miskr Dires</strong></span>
              <span>·</span>
              <span>Investment portfolio & cloud services</span>
            </p>
          </div>

          {/* Pill Selector: Market, Wallet, Tools */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => handleTabSwitch("market")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                currentTab === "market"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => handleTabSwitch("wallet")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                currentTab === "wallet"
                  ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => handleTabSwitch("tools")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
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
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
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

      {/* Universal Quick Navigation Drawer (PC & Phone) */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl bg-white dark:bg-[#0c0c12] border border-neutral-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-5 overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header with Brand & Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs font-bold text-xs">
                  HI
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white font-sans">
                    {organizationName}
                  </h3>
                  <p className="text-[10px] font-mono text-neutral-400">
                    /{organizationSlug} · {tier} Tier
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNavDrawerOpen(false)}
                title="Close Navigation"
                className="p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Navigation Destinations */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
                Quick Navigation
              </span>
              {[
                { name: "Dashboard", href: `/${organizationSlug}/dashboard`, icon: Compass, desc: "Overview, performance & metrics" },
                { name: "Portfolio", href: `/${organizationSlug}/projects`, icon: ShoppingBag, desc: "Managed asset allocation & vault" },
                { name: "Analysis", href: `/${organizationSlug}/billing`, icon: BarChart3, desc: "Telebirr payments & statements" },
                { name: "Market", href: `/${organizationSlug}/market`, icon: TrendingUp, desc: "Fluctuating composite area index" },
                { name: "Community", href: `/${organizationSlug}/team`, icon: Users2, desc: "Organization members & permissions" },
                { name: "Settings", href: `/${organizationSlug}/settings`, icon: Settings, desc: "System parameters, 2FA & backups" },
              ].map((dest) => {
                const isCurrent = pathname === dest.href || (dest.name !== "Dashboard" && pathname?.startsWith(`${dest.href}/`));
                return (
                  <Link
                    key={dest.name}
                    href={dest.href}
                    onClick={() => setIsNavDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                        : "bg-neutral-50 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-xl ${
                          isCurrent
                            ? "bg-white/10 text-white dark:bg-black/10 dark:text-black"
                            : "bg-neutral-200/70 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        <dest.icon className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold leading-tight">{dest.name}</div>
                        <div className={`text-[10px] truncate ${isCurrent ? "opacity-80" : "text-neutral-400"}`}>
                          {dest.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* Profile & Security Section */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200/80 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {firstName.charAt(0)}
                </div>
                <div className="truncate leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-950 dark:text-white truncate">
                      {userName}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                      {role}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono truncate">{userEmail}</span>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign Out"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Footer */}
            <div className="pt-1 text-center text-xs text-neutral-400 font-mono flex items-center justify-center gap-2">
              <span>Developed by <strong className="text-neutral-900 dark:text-white font-sans font-semibold">Miskr Dires</strong></span>
              <span>·</span>
              <span className="text-emerald-500 font-sans">Active & Secured</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
