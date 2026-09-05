"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Users2,
  Settings,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { OrganizationMembershipInfo, MembershipRole } from "@/types/tenant";
import { TenantSwitcher } from "./tenant-switcher";
import { StylishMenuButton } from "./header";
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

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navigation = [
    {
      name: "Dashboard",
      routeSlug: `/${currentOrg.slug}/dashboard`,
      href: `/${currentOrg.slug}/dashboard`,
      icon: Compass,
      desc: "Overview & metrics",
      badge: "Core",
    },
    {
      name: "Portfolio",
      routeSlug: `/${currentOrg.slug}/projects`,
      href: `/${currentOrg.slug}/projects`,
      icon: ShoppingBag,
      desc: "Managed assets & holdings",
      badge: "Assets",
    },
    {
      name: "Analysis",
      routeSlug: `/${currentOrg.slug}/billing`,
      href: `/${currentOrg.slug}/billing`,
      icon: BarChart3,
      desc: "Telebirr & subscription tiers",
      badge: "Billing",
    },
    {
      name: "Market",
      routeSlug: `/${currentOrg.slug}/market`,
      href: `/${currentOrg.slug}/market`,
      icon: TrendingUp,
      desc: "Fluctuating area index & live feed",
      badge: "Live",
    },
    {
      name: "Community",
      routeSlug: `/${currentOrg.slug}/team`,
      href: `/${currentOrg.slug}/team`,
      icon: Users2,
      desc: "Members & role governance",
      badge: "Access",
    },
    {
      name: "Settings",
      routeSlug: `/${currentOrg.slug}/settings`,
      href: `/${currentOrg.slug}/settings`,
      icon: Settings,
      desc: "System parameters & backups",
      badge: "Security",
    },
  ];

  return (
    <div className="md:hidden sticky top-0 z-40 w-full bg-white/90 dark:bg-[#07070a]/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-white/[0.06] transition-colors duration-200">
      {/* Mobile Bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StylishMenuButton
            isOpen={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          />

          <Link
            href={`/${currentOrg.slug}/dashboard`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="h-8 w-8 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-xs flex-shrink-0 font-bold text-xs">
              HI
            </div>
            <div className="truncate">
              <div className="font-bold text-xs tracking-tight text-neutral-900 dark:text-white truncate font-sans">
                {currentOrg.name}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono leading-none truncate">
                by Miskr Dires
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Structured Full Screen Mobile Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md animate-in fade-in duration-150 flex flex-col justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white dark:bg-[#0c0c10] border-t border-neutral-200 dark:border-white/10 rounded-t-[32px] p-5 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
            {/* Drag handle */}
            <div className="flex items-center justify-center pb-1">
              <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Header with Close */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                  Platform Menu
                </h3>
                <p className="text-[10px] font-mono text-neutral-400">
                  /{currentOrg.slug} · {currentOrg.tier} Tier
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                title="Close Navigation"
                className="p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Workspace Selector */}
            {userOrganizations.length > 1 && (
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
            )}

            {/* Navigation Links: The 6 destinations */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block pb-0.5">
                Destinations
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold leading-tight">{item.name}</span>
                          <span
                            className={`text-[9px] font-mono px-1 rounded ${
                              isActive
                                ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                                : "bg-neutral-200/70 dark:bg-white/[0.06] text-neutral-500 dark:text-neutral-400"
                            }`}
                          >
                            {item.routeSlug}
                          </span>
                        </div>
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
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-[#141419] border border-neutral-200/80 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
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
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate font-mono block">
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
            <div className="pt-1 text-center text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              <span>Developed & Maintained by </span>
              <strong className="text-neutral-900 dark:text-white font-semibold">Miskr Dires</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
