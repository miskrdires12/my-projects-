"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Users2,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { OrganizationMembershipInfo, MembershipRole } from "@/types/tenant";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-provider";
import { signOut } from "next-auth/react";
import { toTiny } from "@/lib/tiny-text";

interface MobileNavProps {
  currentOrg: {
    id: string;
    slug: string;
    name: string;
    tier: string;
  };
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: MembershipRole;
  };
  userOrganizations: OrganizationMembershipInfo[];
}

export function MobileNav({
  currentOrg,
  currentUser,
  userOrganizations,
}: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: `/${currentOrg.slug}/dashboard`,
      icon: Compass,
      desc: "Overview & metrics",
    },
    {
      name: "Portfolio",
      href: `/${currentOrg.slug}/projects`,
      icon: ShoppingBag,
      desc: "Managed assets & holdings",
    },
    {
      name: "Analysis",
      href: `/${currentOrg.slug}/billing`,
      icon: BarChart3,
      desc: "Telebirr & subscription tiers",
    },
    {
      name: "Market",
      href: `/${currentOrg.slug}/market`,
      icon: TrendingUp,
      desc: "Fluctuating area index & live feed",
    },
    {
      name: "Community",
      href: `/${currentOrg.slug}/team`,
      icon: Users2,
      desc: "Members & role governance",
    },
    {
      name: "Settings",
      href: `/${currentOrg.slug}/settings`,
      icon: Settings,
      desc: "System parameters & backups",
    },
  ];

  return (
    <div className="md:hidden sticky top-0 z-40 w-full bg-white/90 dark:bg-[#07070a]/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-white/[0.06] transition-colors duration-200">
      {/* Mobile Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href={`/${currentOrg.slug}/dashboard`}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs flex-shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M4 6h4v12H4z" />
              <path d="M16 6h4v12h-4z" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div className="truncate">
            <div className="font-bold text-xs tracking-tight text-neutral-900 dark:text-white truncate font-sans">
              Helios Investments
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono leading-none truncate">
              by Miskr Dires
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Day / Night Theme Toggle */}
          <ThemeToggle className="h-8 px-2" />

          {/* Structured Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Navigation Menu"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{isOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {/* Structured Slide-Over Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-[53px] z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 flex flex-col justify-between overflow-y-auto">
          <div className="bg-white dark:bg-[#0c0c10] border-b border-neutral-200 dark:border-white/10 p-5 space-y-5 shadow-2xl">
            {/* Workspace Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                Current Workspace
              </span>
              <TenantSwitcher
                currentSlug={currentOrg.slug}
                currentName={currentOrg.name}
                currentTier={currentOrg.tier}
                organizations={userOrganizations}
              />
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block pb-1">
                Navigation
              </span>
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.name !== "Dashboard" && pathname?.startsWith(`${item.href}/`));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isActive
                        ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                        : "bg-neutral-50 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-xl ${
                          isActive
                            ? "bg-white/10 text-white dark:bg-black/10 dark:text-black"
                            : "bg-neutral-200/60 dark:bg-white/[0.05] text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold leading-tight">{item.name}</div>
                        <div className={`text-[10px] truncate ${isActive ? "opacity-80" : "text-neutral-400"}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#141419] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="truncate leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                    {currentUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign Out"
                className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Creator Watermark */}
            <div className="pt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
              <span>Developed & Maintained by </span>
              <strong className="text-neutral-900 dark:text-white font-semibold">Miskr Dires</strong>
            </div>
          </div>

          <div
            onClick={() => setIsOpen(false)}
            className="flex-1 w-full"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
