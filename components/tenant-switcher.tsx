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
        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#14141d] hover:bg-[#181824] border border-white/[0.08] transition-all duration-150 group text-left shadow-sm cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {currentName.substring(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {currentName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-white/[0.06] text-fuchsia-300 border border-white/[0.08]">
                {currentTier}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">/{currentSlug}</span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#181824] border border-white/10 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[9px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
            Switch Workspace
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "helios-pill-active text-white"
                    : "text-neutral-300 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-6 w-6 rounded-lg bg-white/[0.08] flex items-center justify-center text-white font-bold text-[10px]">
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{org.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono">/{org.slug}</p>
                  </div>
                </div>

                {isSelected && <Check className="h-3.5 w-3.5 text-fuchsia-300" />}
              </button>
            );
          })}

          <div className="border-t border-white/[0.06] pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/select-organization");
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create / Join Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
