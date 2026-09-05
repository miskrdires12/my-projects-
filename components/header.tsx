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
import { useTheme } from "./theme-provider";
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      title: "Telebirr Deposit Confirmed",
      message: "+5,000.00 ETB settled to liquidity vault via Telebirr.",
      time: "2m ago",
      read: false,
      type: "payment" as const,
    },
    {
      id: "notif-2",
      title: "payment-telebirr-gateway Active",
      message: "Microservice running with 99.99% uptime on Edge runtime.",
      time: "15m ago",
      read: false,
      type: "service" as const,
    },
    {
      id: "notif-3",
      title: "Market Appreciation Alert",
      message: "Helios Composite index gained +2.42% in latest session.",
      time: "1h ago",
      read: false,
      type: "market" as const,
    },
    {
      id: "notif-4",
      title: "Security Session Verified",
      message: "Direct credentials authenticated with zero risk flags.",
      time: "3h ago",
      read: true,
      type: "security" as const,
    },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

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

  // Extract first word of what the user signed in with (name or email prefix)
  const resolvedDisplayName = userName || "Miskr";
  const resolvedEmail = userEmail || "miskr@example.com";
  const rawFirstWord = resolvedDisplayName.trim().split(/[\s._@-]+/)[0] || "Miskr";
  const capitalizedFirstWord = rawFirstWord.charAt(0).toUpperCase() + rawFirstWord.slice(1);

  // The 6 exact requested destinations
  const menuDestinations = [
    {
      name: "Dashboard",
      href: `/${organizationSlug}/dashboard`,
      icon: Compass,
    },
    {
      name: "Portfolio & Microservices",
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
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              title="Notifications"
              className="relative p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#09090d]">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsCommandOpen(true)}
              title="Search System"
              className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Log Out Immediately"
              className="p-2 rounded-xl bg-neutral-100 hover:bg-rose-500/10 hover:text-rose-600 dark:bg-white/[0.08] dark:hover:bg-rose-500/20 dark:hover:text-rose-400 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-xs">
              {capitalizedFirstWord.charAt(0)}
            </div>
          </div>
        </div>

        {/* Desktop & Mobile Main Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Menu Button + Greeting + Pill Tabs */}
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
                    Welcome, {capitalizedFirstWord}
                  </h1>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold border border-black/10 dark:border-white/10">
                    {tier}
                  </span>
                </div>
              </div>
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

            {/* Dedicated Notifications Button */}
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              title="Notifications"
              className="relative p-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-neutral-200/80 dark:hover:bg-[#1a1a24] border border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#09090d]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5 pl-2 py-1 pr-3 rounded-full bg-neutral-100 dark:bg-[#15151c] border border-neutral-200 dark:border-white/[0.08]">
              <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm">
                {capitalizedFirstWord.charAt(0)}
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">{resolvedDisplayName}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">{resolvedEmail}</p>
              </div>
            </div>

            {/* Direct Instant LogOut Button (No prompt, no question asked) */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Log Out"
              className="p-2 rounded-full bg-neutral-100 dark:bg-[#15151c] hover:bg-rose-500/15 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 border border-neutral-200 dark:border-white/[0.08] text-neutral-500 dark:text-neutral-400 transition-colors cursor-pointer flex items-center justify-center"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* DEDICATED NOTIFICATIONS DROPDOWN PANEL (Appears ONLY when bell is clicked) */}
      {isNotificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="absolute right-3 sm:right-6 top-16 w-[calc(100vw-24px)] sm:w-96 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/90 dark:border-white/[0.1] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="p-3.5 px-4 border-b border-neutral-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-neutral-950 dark:text-white tracking-wide uppercase">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={() => setNotifications(notifications.map((n) => ({ ...n, read: true })))}
                    className="text-[11px] text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer font-medium"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 px-4 transition-colors flex items-start gap-3 ${
                      notif.read
                        ? "bg-transparent opacity-75 hover:opacity-100"
                        : "bg-black/[0.02] dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {notif.type === "payment" && (
                        <div className="h-7 w-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {notif.type === "service" && (
                        <div className="h-7 w-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {notif.type === "market" && (
                        <div className="h-7 w-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </div>
                      )}
                      {notif.type === "security" && (
                        <div className="h-7 w-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-neutral-950 dark:text-white truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                    </div>

                    <button
                      onClick={() => setNotifications(notifications.filter((n) => n.id !== notif.id))}
                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-neutral-100 dark:bg-white/[0.05] flex items-center justify-center text-neutral-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                    No new notifications
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    You're completely caught up! We will alert you on updates.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2.5 px-4 bg-neutral-50 dark:bg-white/[0.02] border-t border-neutral-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={() => setNotifications([])}
                  className="text-[11px] font-semibold text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear all notifications
                </button>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {notifications.length} item{notifications.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </>
      )}

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
          {/* Left Panel matching user screenshot exactly with identical day & night balance */}
          <aside
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-y-0 left-0 z-[10000] w-72 sm:w-80 bg-white dark:bg-[#09090d] text-neutral-950 dark:text-white border-r border-neutral-200/90 dark:border-white/[0.08] shadow-2xl flex flex-col justify-between p-5 select-none animate-in slide-in-from-left duration-300 ease-out overflow-y-auto"
          >
            {/* Top Section: Brand + Navigation Items */}
            <div className="space-y-6">
              {/* Header: Rounded square logo + Title + Dropdown chevron */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Square logo container with bold "HI" */}
                  <div className="h-10 w-10 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
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
                      <span className="font-bold text-sm tracking-tight text-neutral-950 dark:text-white font-sans truncate group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                        {organizationName || "Helios Investments"}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${
                          showWorkspaceDropdown ? "rotate-180 text-black dark:text-white" : ""
                        }`}
                      />
                    </button>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono leading-tight mt-0.5">
                      by Miskr Dires
                    </p>
                  </div>
                </div>

                {/* Close (X) button */}
                <button
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Workspace Switcher dropdown (if chevron clicked) */}
              {showWorkspaceDropdown && userOrganizations.length > 0 && (
                <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/10 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-mono font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
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
                            ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-white/[0.06] hover:text-black dark:hover:text-white"
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
                          ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-md"
                          : "text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          isActive
                            ? "text-white dark:text-black"
                            : "text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white"
                        }`}
                      />
                      <span className="text-sm font-medium tracking-tight font-sans">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom of nav lists: Attribution & Tagline matching user prompt */}
              <div className="pt-3.5 pb-1 px-3 border-t border-neutral-200/70 dark:border-white/[0.08] text-xs space-y-0.5 select-none">
                <p className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <span>Developed by</span>
                  <strong className="text-black dark:text-white font-bold">Miskr Dires</strong>
                </p>
                <p className="text-neutral-400 dark:text-neutral-500 font-mono text-[10px]">·</p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                  Investment portfolio & cloud services
                </p>
              </div>
            </div>

            {/* Bottom Section: User Card & Footer Row matching user screenshot */}
            <div className="space-y-3.5 pt-4 border-t border-neutral-200/70 dark:border-white/[0.08]">
              {/* User Card */}
              <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Circular avatar with bold initial */}
                  <div className="h-9 w-9 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                    {capitalizedFirstWord.charAt(0) || "M"}
                  </div>
                  <div className="truncate leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-950 dark:text-white truncate">
                        {resolvedDisplayName}
                      </span>
                      {/* Green verified checkmark */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {/* VERIFIED badge pill */}
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 border border-black/10 dark:border-white/10 uppercase tracking-wider">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono truncate mt-0.5">
                      Platform Developer
                    </p>
                  </div>
                </div>

                {/* Sign Out action */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign Out"
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Footer Row: Settings link */}
              <div className="pt-0.5">
                <Link
                  href={`/${organizationSlug}/settings`}
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="flex items-center justify-between gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/[0.06] border border-neutral-200/80 dark:border-white/[0.08]"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Workspace & System Settings</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">Day/Night</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
