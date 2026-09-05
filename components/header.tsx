"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Bell,
  Sparkles,
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
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-provider";
import { TenantSwitcher } from "./tenant-switcher";
import { OrganizationMembershipInfo } from "@/types/tenant";
import { toTiny } from "@/lib/tiny-text";

interface HeaderProps {
  organizationName: string;
  organizationSlug: string;
  tier: string;
  status: string;
  role: string;
  userName?: string;
  userEmail?: string;
  userOrganizations?: OrganizationMembershipInfo[];
}

/**
 * High-precision, designer-grade Menu Button.
 * Features an asymmetric luxury 3-line geometric layout that smoothly
 * morphs into a balanced geometric "X" with hardware-accelerated animations.
 */
export function StylishMenuButton({
  isOpen,
  onClick,
  className = "",
}: {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      title={isOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
      aria-label={isOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
      className={`group relative h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex flex-col items-center justify-center gap-[5px] bg-neutral-100 hover:bg-neutral-200/90 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border border-neutral-200/90 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer active:scale-90 flex-shrink-0 ${className}`}
    >
      {/* Top Bar */}
      <span
        className={`h-[2px] rounded-full bg-neutral-900 dark:bg-white transition-all duration-300 ease-out ${
          isOpen
            ? "w-[20px] translate-y-[7px] rotate-45"
            : "w-[20px] group-hover:w-[22px]"
        }`}
      />
      {/* Middle Bar (Asymmetric luxury staggered bar) */}
      <span
        className={`h-[2px] rounded-full bg-neutral-900 dark:bg-white transition-all duration-200 ease-out ${
          isOpen
            ? "w-0 opacity-0 scale-0"
            : "w-[13px] self-start ml-[9px] group-hover:w-[19px]"
        }`}
      />
      {/* Bottom Bar */}
      <span
        className={`h-[2px] rounded-full bg-neutral-900 dark:bg-white transition-all duration-300 ease-out ${
          isOpen
            ? "w-[20px] -translate-y-[7px] -rotate-45"
            : "w-[17px] group-hover:w-[22px]"
        }`}
      />
    </button>
  );
}

export function Header({
  organizationName,
  organizationSlug,
  tier,
  status,
  role,
  userName = "Nadia Rachel",
  userEmail = "rachel_helios@gmail.com",
  userOrganizations = [],
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Close drawer on route change or Escape key
  useEffect(() => {
    setIsNavDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsNavDrawerOpen(false);
      }
    };
    if (isNavDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isNavDrawerOpen]);

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

  // The 6 exact requested destinations with their exact routes
  const menuDestinations = [
    {
      name: "Dashboard",
      routeSlug: `/${organizationSlug}/dashboard`,
      href: `/${organizationSlug}/dashboard`,
      icon: Compass,
      desc: "Live analytics, revenue engine & metrics",
      badge: "Overview",
    },
    {
      name: "Portfolio",
      routeSlug: `/${organizationSlug}/projects`,
      href: `/${organizationSlug}/projects`,
      icon: ShoppingBag,
      desc: "Managed asset allocation & vault holdings",
      badge: "Holdings",
    },
    {
      name: "Analysis",
      routeSlug: `/${organizationSlug}/billing`,
      href: `/${organizationSlug}/billing`,
      icon: BarChart3,
      desc: "Telebirr payments & financial statements",
      badge: "Billing",
    },
    {
      name: "Market",
      routeSlug: `/${organizationSlug}/market`,
      href: `/${organizationSlug}/market`,
      icon: TrendingUp,
      desc: "Fluctuating area index & live feed",
      badge: "Real-Time",
    },
    {
      name: "Community",
      routeSlug: `/${organizationSlug}/team`,
      href: `/${organizationSlug}/team`,
      icon: Users2,
      desc: "Organization members & role governance",
      badge: "Workspace",
    },
    {
      name: "Settings",
      routeSlug: `/${organizationSlug}/settings`,
      href: `/${organizationSlug}/settings`,
      icon: Settings,
      desc: "System parameters, 2FA & JSON backups",
      badge: "Security",
    },
  ];

  return (
    <>
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c0c10]/80 backdrop-blur-md transition-colors duration-200 sticky top-0 z-30">
        {/* Mobile Top Row (< md screens): Sleek brand bar + stylish menu icon */}
        <div className="flex md:hidden items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pure Stylish Menu Button */}
            <StylishMenuButton
              isOpen={isNavDrawerOpen}
              onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
            />
            <Link
              href={`/${organizationSlug}/dashboard`}
              className="flex items-center gap-2 min-w-0"
            >
              <div className="h-7 w-7 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs font-bold text-xs flex-shrink-0">
                HI
              </div>
              <div className="truncate leading-tight">
                <span className="font-bold text-xs text-neutral-900 dark:text-white font-sans truncate block">
                  {organizationName}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  /{organizationSlug} · {tier}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle className="h-9 px-2" />
            <button
              onClick={() => setIsCommandOpen(true)}
              title="Search System"
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300"
            >
              <Search className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-xs">
              {firstName.charAt(0)}
            </div>
          </div>
        </div>

        {/* Desktop & Mobile Main Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Greeting + Subtitle + Pill Tabs */}
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center gap-3">
                {/* Pure Stylish Menu Button (Desktop) */}
                <div className="hidden md:block">
                  <StylishMenuButton
                    isOpen={isNavDrawerOpen}
                    onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">
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
            <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => handleTabSwitch("market")}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === "market"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Market
              </button>
              <button
                onClick={() => handleTabSwitch("wallet")}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === "wallet"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Wallet
              </button>
              <button
                onClick={() => handleTabSwitch("tools")}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  currentTab === "tools"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Tools
              </button>
            </div>
          </div>

          {/* Right (Desktop): AI Search Pill + Day/Night Toggle + Profile */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Ask AI Search Pill Bar */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-neutral-200/80 dark:hover:bg-[#1a1a24] border border-neutral-200 dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-all text-xs cursor-pointer group shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-neutral-800 dark:text-white group-hover:scale-110 transition-transform" />
              <span className="truncate pr-2 font-medium">{toTiny("Type something to start")}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-white/[0.08]">
                ⌘K
              </span>
            </button>

            {/* Day / Night Theme Toggle */}
            <ThemeToggle />

            {/* Notifications Button */}
            <button
              onClick={() => setIsCommandOpen(true)}
              title={toTiny("Notifications")}
              className="p-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-neutral-200/80 dark:hover:bg-[#1a1a24] border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full bg-neutral-100 dark:bg-[#15151c] border border-neutral-200 dark:border-white/[0.08]">
              <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm">
                {firstName.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">{userName}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">{userEmail}</p>
              </div>
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

      {/* Master Navigation Drawer / Modal (Flawless on both PC and Phone) */}
      {isNavDrawerOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNavDrawerOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-xl h-[92dvh] sm:h-auto sm:max-h-[88vh] rounded-t-[32px] sm:rounded-3xl bg-white dark:bg-[#0c0c12] border-t sm:border border-neutral-200/90 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex items-center justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Header: Organization & Close Button */}
            <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/[0.06] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs font-bold text-xs flex-shrink-0">
                  HI
                </div>
                <div className="truncate leading-tight">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-950 dark:text-white font-sans truncate">
                      {organizationName}
                    </h3>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-black/10 dark:border-white/10">
                      {tier}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                    Workspace: /{organizationSlug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle className="h-8 px-2" />
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  title="Close Menu"
                  aria-label="Close Menu"
                  className="p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Workspace Switcher if available */}
            {userOrganizations.length > 1 && (
              <div className="px-6 pt-3 pb-1">
                <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Switch Workspace
                </span>
                <TenantSwitcher
                  currentSlug={organizationSlug}
                  currentName={organizationName}
                  currentTier={tier}
                  organizations={userOrganizations}
                />
              </div>
            )}

            {/* Core Destinations: The 6 required destinations */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                  Platform Destinations
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  6 Core Modules
                </span>
              </div>

              {menuDestinations.map((dest) => {
                const isCurrent =
                  pathname === dest.href ||
                  (dest.name !== "Dashboard" && pathname?.startsWith(`${dest.href}/`));

                return (
                  <Link
                    key={dest.name}
                    href={dest.href}
                    onClick={() => setIsNavDrawerOpen(false)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-150 cursor-pointer group ${
                      isCurrent
                        ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-md"
                        : "bg-neutral-50 dark:bg-white/[0.03] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.07] border border-neutral-200/60 dark:border-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl flex-shrink-0 transition-transform group-hover:scale-105 ${
                          isCurrent
                            ? "bg-white/15 text-white dark:bg-black/15 dark:text-black"
                            : "bg-neutral-200/70 dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        <dest.icon className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold leading-tight font-sans">
                            {dest.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                              isCurrent
                                ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                                : "bg-neutral-200/80 dark:bg-white/[0.08] text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {dest.routeSlug}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isCurrent ? "opacity-85" : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {dest.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isCurrent ? (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/20 text-white dark:bg-black/20 dark:text-black font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-white/[0.05] text-neutral-500 dark:text-neutral-400 hidden sm:inline-block">
                          {dest.badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Profile, Security & Sign Out Section */}
            <div className="p-4 sm:p-5 border-t border-neutral-100 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.01] space-y-3">
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#121218] border border-neutral-200/80 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs flex-shrink-0">
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
                    <span className="text-[10px] text-neutral-400 font-mono truncate block">
                      {userEmail}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign Out of Session"
                  className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer flex-shrink-0 flex items-center gap-1 text-xs font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>

              {/* Watermark Attribution */}
              <div className="text-center text-xs text-neutral-400 font-mono flex items-center justify-center gap-2">
                <span>Developed by <strong className="text-neutral-900 dark:text-white font-sans font-semibold">Miskr Dires</strong></span>
                <span>·</span>
                <span className="text-emerald-500 font-sans">Active & Secured</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
