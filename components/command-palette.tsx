"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Users2,
  CreditCard,
  Building2,
  Key,
  Download,
  Terminal,
  ShieldCheck,
  Zap,
  LogOut,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface CommandPaletteProps {
  currentOrgSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: string) => void;
}

interface CommandItem {
  id: string;
  name: string;
  icon: any;
  badge?: string;
  run: () => void;
}

interface CommandCategory {
  category: string;
  items: CommandItem[];
}

export function CommandPalette({ currentOrgSlug, isOpen, onClose, onSelectTab }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: CommandCategory[] = [
    {
      category: "Helios AI Intelligence",
      items: [
        {
          id: "ai-insights",
          name: "Ask Helios: Generate Portfolio Risk Analysis",
          icon: Sparkles,
          badge: "AI Alpha",
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
        {
          id: "ai-market",
          name: "Ask Helios: Analyze Tech & Semiconductor Breakouts",
          icon: Sparkles,
          badge: "Insights",
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
      ],
    },
    {
      category: "Navigation",
      items: [
        {
          id: "nav-dash",
          name: "Investment Overview (Wallet)",
          icon: LayoutDashboard,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
        {
          id: "nav-proj",
          name: "Portfolio Services & Assets",
          icon: FolderKanban,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/projects`);
          },
        },
        {
          id: "nav-team",
          name: "Community & Team Access",
          icon: Users2,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/team`);
          },
        },
        {
          id: "nav-bill",
          name: "Billing & Tier Plans",
          icon: CreditCard,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/billing`);
          },
        },
      ],
    },
    {
      category: "Developer Tools",
      items: [
        {
          id: "tool-api",
          name: "Open Developer Tools",
          icon: Terminal,
          badge: "API",
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard?tab=tools`);
          },
        },
        {
          id: "tool-webhook",
          name: "Inspect Edge Telemetry & Ingress",
          icon: Zap,
          badge: "Telemetry",
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard?tab=market`);
          },
        },
      ],
    },
  ];

  const filtered = categories
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#13131b] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-white/[0.06] px-4 py-4 flex items-center gap-3">
          <Search className="h-4 w-4 text-fuchsia-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Helios AI, search stocks, or jump to page..."
            className="w-full text-xs text-white placeholder-neutral-500 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.08] hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No matching commands found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 font-mono">
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.run}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.05] transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className="h-4 w-4 text-neutral-400 group-hover:text-fuchsia-400 flex-shrink-0 transition-colors" />
                      <span className="truncate font-medium">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/30">
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight className="h-3 w-3 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-white/[0.05] px-4 py-2.5 bg-[#0f0f15] flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="font-mono bg-white/[0.06] px-1.5 py-0.2 rounded border border-white/10 text-neutral-400">↑</kbd> <kbd className="font-mono bg-white/[0.06] px-1.5 py-0.2 rounded border border-white/10 text-neutral-400">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-white/[0.06] px-1.5 py-0.2 rounded border border-white/10 text-neutral-400">Enter</kbd></span>
          </div>
          <span>Helios Intelligence Engine</span>
        </div>
      </div>
    </div>
  );
}
