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
  ExternalLink,
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

  const actions: CommandCategory[] = [
    {
      category: "Navigation",
      items: [
        {
          id: "nav-dash",
          name: "Go to Dashboard Overview",
          icon: LayoutDashboard,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
        {
          id: "nav-proj",
          name: "Go to Projects Management",
          icon: FolderKanban,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/projects`);
          },
        },
        {
          id: "nav-team",
          name: "Go to Team & Access Control",
          icon: Users2,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/team`);
          },
        },
        {
          id: "nav-bill",
          name: "Go to Billing & Subscriptions",
          icon: CreditCard,
          run: () => {
            onClose();
            router.push(`/${currentOrgSlug}/billing`);
          },
        },
      ],
    },
    {
      category: "Developer & Enterprise Tools",
      items: [
        {
          id: "tool-api",
          name: "Open Developer API Playground & cURL Runner",
          icon: Terminal,
          badge: "Playground",
          run: () => {
            onClose();
            if (onSelectTab) onSelectTab("playground");
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
        {
          id: "tool-webhook",
          name: "Open Stripe Webhook Delivery Inspector",
          icon: Zap,
          badge: "Live Log",
          run: () => {
            onClose();
            if (onSelectTab) onSelectTab("webhooks");
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
        {
          id: "tool-sec",
          name: "Open Enterprise Security & Compliance Center",
          icon: ShieldCheck,
          badge: "SOC2",
          run: () => {
            onClose();
            if (onSelectTab) onSelectTab("compliance");
            router.push(`/${currentOrgSlug}/dashboard`);
          },
        },
      ],
    },
    {
      category: "Switch Workspace Tenant",
      items: [
        {
          id: "org-acme",
          name: "Acme Technologies (PRO)",
          icon: Building2,
          badge: "/acme",
          run: () => {
            onClose();
            router.push("/acme/dashboard");
          },
        },
        {
          id: "org-stark",
          name: "Stark Innovations (ENTERPRISE)",
          icon: Building2,
          badge: "/stark",
          run: () => {
            onClose();
            router.push("/stark/dashboard");
          },
        },
        {
          id: "org-studio",
          name: "Startup Studio (FREE)",
          icon: Building2,
          badge: "/studio",
          run: () => {
            onClose();
            router.push("/studio/dashboard");
          },
        },
      ],
    },
  ];

  const filtered = actions
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-neutral-200 px-4 py-3.5 flex items-center gap-3">
          <Search className="h-4 w-4 text-neutral-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search pages, or switch tenant..."
            className="w-full text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 border border-neutral-200 hover:text-black"
          >
            ESC
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No matching commands or tools found for &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {group.category}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={item.run}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-700 hover:text-black hover:bg-neutral-100 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className="h-4 w-4 text-neutral-500 group-hover:text-black flex-shrink-0" />
                      <span className="truncate font-medium">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight className="h-3 w-3 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-neutral-100 px-4 py-2 bg-neutral-50 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="font-mono bg-white px-1 rounded border border-neutral-200">↑</kbd> <kbd className="font-mono bg-white px-1 rounded border border-neutral-200">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-white px-1 rounded border border-neutral-200">Enter</kbd></span>
          </div>
          <span>OmniTenant Command Palette</span>
        </div>
      </div>
    </div>
  );
}
