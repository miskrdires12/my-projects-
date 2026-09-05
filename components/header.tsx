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
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CommandPalette } from "./command-palette";
import { ThemeToggle, useTheme } from "./theme-provider";
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
  userName = "Miskr Dires",
  userEmail = "miskr@example.com",
  userOrganizations = [],
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);

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

  const firstName = userName?.split(" ")[0] || "Miskr";

  // The 6 exact requested destinations
  const menuDestinations = [
    {
      name: "Dashboard",
      href: `/${organizationSlug}/dashboard`,
      icon: Compass,
    },
    {
      name: "Portfolio",
      href: `/${organizationSlug}/projects`,
      icon: ShoppingBag,
    },
    {
      name: "Analysis",
      href: `/${organizationSlug}/billing`,
      icon: BarChart3,
    },
    {
      name: "Market",
      href: `/${organizationSlug}/market`,
      icon: TrendingUp,
    },
    {
      name: "Community",
      href: `/${organizationSlug}/team`,
      icon: Users2,
    },
    {
      name: "Settings",
      href: `/${organizationSlug}/settings`,
      icon: Settings,
    },
  ];

  return (
    <>
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c0c10]/80 backdrop-blur-md transition-colors duration-200 sticky top-0 z-30 w-full">
        {/* Mobile Top Bar (< md screens): Sleek brand bar + stylish menu icon */}
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
                  {organizationName || "Helios Investments"}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  by Miskr Dires
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
          {/* Left: Menu Button + Greeting + Subtitle + Pill Tabs */}
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

      {/* LEFT SLIDE-OUT NAVIGATION DRAWER (Appears ONLY when clicked, from LEFT side) */}
      {isNavDrawerOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out animate-in fade-in"
          onClick={() => setIsNavDrawerOpen(false)}
        >
          {/* Left Panel matching user screenshot exactly */}
          <aside
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-y-0 left-0 z-[10000] w-72 sm:w-80 bg-[#09090d] dark:bg-[#07070b] text-white border-r border-white/[0.08] shadow-2xl flex flex-col justify-between p-5 select-none animate-in slide-in-from-left duration-300 ease-out"
          >
            {/* Top Section: Brand + Navigation Items */}
            <div className="space-y-6">
              {/* Header: Rounded white square logo + Title + Dropdown chevron */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* White rounded square logo container with bold black "HI" */}
                  <div className="h-10 w-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <path d="M4 6h4v12H4z" />
                      <path d="M16 6h4v12h-4z" />
                      <path d="M8 12h8" />
                    </svg>
                  </div>

                  <div className="truncate">
                    <button
                      onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                      className="flex items-center gap-1.5 text-left group cursor-pointer"
                    >
                      <span className="font-bold text-sm tracking-tight text-white font-sans truncate group-hover:text-neutral-200">
                        {organizationName || "Helios Investments"}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
                          showWorkspaceDropdown ? "rotate-180 text-white" : ""
                        }`}
                      />
                    </button>
                    <p className="text-[11px] text-neutral-400 font-mono leading-tight mt-0.5">
                      by Miskr Dires
                    </p>
                  </div>
                </div>

                {/* Close (X) button */}
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Workspace Switcher dropdown (if chevron clicked) */}
              {showWorkspaceDropdown && userOrganizations.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">
                    Switch Workspace
                  </span>
                  <div className="space-y-1">
                    {userOrganizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setShowWorkspaceDropdown(false);
                          setIsNavDrawerOpen(false);
                          router.push(`/${org.slug}/dashboard`);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          org.slug === organizationSlug
                            ? "bg-white text-black font-semibold shadow-xs"
                            : "text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        <span className="text-[10px] font-mono opacity-75">/{org.slug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Items (The exact 6 modules) */}
              <nav className="space-y-1 pt-1">
                {menuDestinations.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.name !== "Dashboard" && pathname?.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsNavDrawerOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-150 cursor-pointer group ${
                        isActive
                          ? "bg-white text-black font-semibold shadow-md"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          isActive ? "text-black" : "text-neutral-400 group-hover:text-white"
                        }`}
                      />
                      <span className="text-sm font-medium tracking-tight font-sans">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Section: User Card & Footer Row matching user screenshot */}
            <div className="space-y-3.5 pt-4 border-t border-white/[0.08]">
              {/* User Card */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Circular white container with bold black "M" */}
                  <div className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                    {firstName.charAt(0) || "M"}
                  </div>
                  <div className="truncate leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {userName || "Miskr Dires"}
                      </span>
                      {/* Green verified checkmark */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {/* VERIFIED badge pill */}
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-white/10 text-neutral-300 border border-white/10 uppercase tracking-wider">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5">
                      Platform Developer
                    </p>
                  </div>
                </div>

                {/* Sign Out action */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign Out"
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Footer Row: Settings link + Day/Night Pill Switcher */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <Link
                  href={`/${organizationSlug}/settings`}
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/[0.06]"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>

                {/* Day / Night pill toggle matching screenshot */}
                <ThemeToggle />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
