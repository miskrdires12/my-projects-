"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  CreditCard,
  Lock,
  LogOut,
  Sliders,
  Terminal,
} from "lucide-react";
import { TenantSwitcher } from "./tenant-switcher";
import { BrandLogo } from "./brand-logo";
import { OrganizationMembershipInfo, MembershipRole } from "@/types/tenant";
import { signOut } from "next-auth/react";

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

  const navigation = [
    {
      name: "Dashboard",
      href: `/${currentOrg.slug}/dashboard`,
      icon: LayoutDashboard,
      roleRequired: "MEMBER" as MembershipRole,
    },
    {
      name: "Projects",
      href: `/${currentOrg.slug}/projects`,
      icon: FolderKanban,
      roleRequired: "MEMBER" as MembershipRole,
    },
    {
      name: "Team & Access",
      href: `/${currentOrg.slug}/team`,
      icon: Users2,
      roleRequired: "ADMIN" as MembershipRole,
      badge: currentUser.role === "MEMBER" ? "View Only" : undefined,
    },
    {
      name: "Billing & Plans",
      href: `/${currentOrg.slug}/billing`,
      icon: CreditCard,
      roleRequired: "ADMIN" as MembershipRole,
      badge: currentOrg.tier === "FREE" ? "Upgrade" : undefined,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col justify-between h-screen sticky top-0">
      {/* Top Header & Tenant Switcher */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center text-white shadow-xs">
            <BrandLogo className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-neutral-950">Omni</span>
            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
              v2.4
            </span>
          </div>
        </div>

        {/* Tenant Switcher dropdown */}
        <TenantSwitcher
          currentSlug={currentOrg.slug}
          currentName={currentOrg.name}
          currentTier={currentOrg.tier}
          organizations={userOrganizations}
        />

        {/* Navigation Links */}
        <nav className="space-y-1 pt-2">
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Workspace
          </div>

          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const isRestricted = currentUser.role === "MEMBER" && (item.name === "Team & Access" || item.name === "Billing & Plans");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                  isActive
                    ? "bg-black text-white shadow-xs"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? "text-white" : "text-neutral-500 group-hover:text-black"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        item.badge === "Upgrade"
                          ? "bg-neutral-200 text-neutral-900 border border-neutral-300"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isRestricted && (
                    <span title="Read-only access for Members">
                      <Lock className="h-3 w-3 text-neutral-400" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer: User Profile */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="p-2.5 rounded-xl bg-white border border-neutral-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-neutral-500 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 text-[11px]">
            <span className="text-neutral-500">Active Role:</span>
            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-neutral-100 text-neutral-900 border border-neutral-300">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
