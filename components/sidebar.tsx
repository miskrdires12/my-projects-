"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Users2,
  Settings,
  LogOut,
  ChevronDown,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { OrganizationMembershipInfo, MembershipRole } from "@/types/tenant";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { TenantSwitcher } from "./tenant-switcher";
import { ThemeToggle } from "./theme-provider";

interface SidebarProps {
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
    image?: string | null;
  };
  userOrganizations: OrganizationMembershipInfo[];
}

export function Sidebar({ currentOrg, currentUser, userOrganizations }: SidebarProps) {
  const pathname = usePathname();
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: `/${currentOrg.slug}/dashboard`,
      icon: Compass,
      roleRequired: "MEMBER" as MembershipRole,
    },
    {
      name: "Portfolio",
      href: `/${currentOrg.slug}/projects`,
      icon: ShoppingBag,
      roleRequired: "MEMBER" as MembershipRole,
    },
    {
      name: "Analysis",
      href: `/${currentOrg.slug}/billing`,
      icon: BarChart3,
      roleRequired: "ADMIN" as MembershipRole,
    },
    {
      name: "Market",
      href: `/${currentOrg.slug}/dashboard?tab=market`,
      icon: TrendingUp,
      roleRequired: "MEMBER" as MembershipRole,
    },
    {
      name: "Community",
      href: `/${currentOrg.slug}/team`,
      icon: Users2,
      roleRequired: "ADMIN" as MembershipRole,
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0c0c10] border-r border-neutral-200/80 dark:border-white/[0.06] flex flex-col justify-between h-full min-h-[750px] p-5 select-none transition-colors duration-200">
      {/* Top Section: Brand & Nav */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <Link
            href={`/${currentOrg.slug}/dashboard`}
            className="flex items-center gap-3 group transition-transform active:scale-95"
          >
            {/* Pure Monochrome Geometric Icon */}
            <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
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
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white group-hover:opacity-80 transition-opacity font-sans">
                Helios Investments
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                by Miskr Dires
              </span>
            </div>
          </Link>

          <button
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            title="Switch Workspace"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOrgMenu ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Dropdown for workspace switcher if toggled */}
        {showOrgMenu && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-150">
            <TenantSwitcher
              currentSlug={currentOrg.slug}
              currentName={currentOrg.name}
              currentTier={currentOrg.tier}
              organizations={userOrganizations}
            />
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="space-y-1 pt-1">
          {navigation.map((item) => {
            const isActive =
              item.name === "Dashboard"
                ? pathname === item.href && !pathname?.includes("tab=market")
                : item.name === "Market"
                ? pathname?.includes("tab=market")
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);

            const isRestricted =
              currentUser.role === "MEMBER" &&
              (item.name === "Analysis" || item.name === "Community");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? "text-white dark:text-black"
                        : "text-neutral-500 group-hover:text-black dark:text-neutral-400 dark:group-hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="tracking-wide text-xs">{item.name}</span>
                </div>

                {isRestricted && (
                  <span title="Admin Access Only">
                    <Lock className="h-3 w-3 text-neutral-400" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Developed by Miskr Dires + Settings + User */}
      <div className="space-y-3 pt-4 border-t border-neutral-200/80 dark:border-white/[0.06]">
        {/* Creator Card */}
        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-[#141419] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              M
            </div>
            <div className="truncate leading-tight">
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate font-sans">
                  Miskr Dires
                </p>
                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono">
                Platform Developer
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-semibold uppercase tracking-wider">
            Verified
          </span>
        </div>

        {/* Settings & Support Links */}
        <div className="flex items-center justify-between px-1">
          <Link
            href={`/${currentOrg.slug}/billing`}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors font-medium"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick Night/Day Toggle in Sidebar */}
            <ThemeToggle className="h-8 px-2.5" />

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
