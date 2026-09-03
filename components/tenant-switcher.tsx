"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, Building2 } from "lucide-react";
import { OrganizationMembershipInfo } from "@/types/tenant";

interface TenantSwitcherProps {
  currentSlug: string;
  currentName: string;
  currentTier: string;
  organizations: OrganizationMembershipInfo[];
}

export function TenantSwitcher({
  currentSlug,
  currentName,
  currentTier,
  organizations,
}: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 transition-all duration-150 group text-left shadow-2xs"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {currentName.substring(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-sm font-semibold text-neutral-900 truncate leading-tight">
              {currentName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">
                {currentTier}
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">/{currentSlug}</span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-black" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl bg-white border border-neutral-200 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Switch Organization
          </div>

          {organizations.map((org) => {
            const isSelected = org.slug === currentSlug;
            return (
              <button
                key={org.id}
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/${org.slug}/dashboard`);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected
                    ? "bg-neutral-100 text-black font-semibold border border-neutral-300"
                    : "text-neutral-700 hover:bg-neutral-50 hover:text-black"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs truncate text-neutral-900 font-medium">{org.name}</div>
                    <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <span className="font-mono">/{org.slug}</span>
                      <span>•</span>
                      <span>{org.role}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                    {org.subscriptionTier}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-black" />}
                </div>
              </button>
            );
          })}

          <div className="pt-1 mt-1 border-t border-neutral-100">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/select-organization");
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-neutral-700 hover:text-black hover:bg-neutral-50 rounded-lg transition-colors font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create or Register New Tenant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
