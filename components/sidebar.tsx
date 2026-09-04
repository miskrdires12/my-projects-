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
  LifeBuoy,
  LogOut,
  ChevronDown,
  Lock,
} from "lucide-react";
import { OrganizationMembershipInfo, MembershipRole } from "@/types/tenant";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { TenantSwitcher } from "./tenant-switcher";

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
    <aside className="w-64 bg-[#0d0d13] border-r border-white/[0.06] flex flex-col justify-between h-full min-h-[750px] p-5 select-none">
      {/* Top Section: Brand & Nav */}
      <div className="space-y-7">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href={`/${currentOrg.slug}/dashboard`}
            className="flex items-center gap-3 group transition-transform active:scale-95"
          >
            {/* Helios Geometric Custom Icon */}
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-600/30 border border-fuchsia-500/30 flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,70,239,0.25)] group-hover:border-fuchsia-400 transition-all">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-white"
              >
                <path d="M4 6h4v12H4z" />
                <path d="M16 6h4v12h-4z" />
                <path d="M8 12h8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-white group-hover:text-fuchsia-200 transition-colors">
                Helios Investments
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {currentOrg.name} · {currentOrg.tier}
              </span>
            </div>
          </Link>

          <button
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            title="Switch Workspace"
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
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
        <nav className="space-y-2">
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
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition-all duration-200 group ${
                  isActive
                    ? "helios-pill-active text-white font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isActive ? "text-fuchsia-300" : "text-neutral-400 group-hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="tracking-wide text-xs">{item.name}</span>
                </div>

                {isRestricted && (
                  <span title="Admin Access Only">
                    <Lock className="h-3 w-3 text-neutral-500" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Settings & Support */}
      <div className="space-y-3 pt-6 border-t border-white/[0.05]">
        <Link
          href={`/${currentOrg.slug}/billing`}
          className="flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors group"
        >
          <Settings className="h-4 w-4 text-neutral-400 group-hover:text-white transition-colors" />
          <span>Settings</span>
        </Link>

        <a
          href="mailto:support@helios.ai"
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors group"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <LifeBuoy className="h-4 w-4 text-neutral-400 group-hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-fuchsia-500 text-black px-1 rounded-full">
                24
              </span>
            </div>
            <span>Support</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">24/7</span>
        </a>

        {/* User Mini Profile & Logout */}
        <div className="pt-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-neutral-400 truncate font-mono">{currentUser.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign Out"
            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
