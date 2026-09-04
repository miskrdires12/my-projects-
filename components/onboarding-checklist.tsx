"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";

interface OnboardingChecklistProps {
  orgSlug: string;
  onNavigateTab?: (tab: string) => void;
}

export function OnboardingChecklist({ orgSlug, onNavigateTab }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDismissed) return null;

  const steps = [
    {
      id: "step-1",
      title: "Database Partition Initialized",
      desc: "Row-level tenant isolation and scoped database context active.",
      completed: true,
    },
    {
      id: "step-2",
      title: "Role-Based Access Configured",
      desc: "Owner, Admin, and Member boundaries enforced across workspace.",
      completed: true,
    },
    {
      id: "step-3",
      title: "Custom Domain & Routing",
      desc: "Configure CNAME records and automatic TLS certificate provisioning.",
      completed: false,
      action: () => (onNavigateTab ? onNavigateTab("domains") : undefined),
      actionLabel: "Configure",
    },
    {
      id: "step-4",
      title: "Edge API Verification",
      desc: "Verify Bearer token authentication against edge endpoints.",
      completed: true,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="p-5 rounded-3xl bg-[#13131b] border border-white/[0.08] shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
            ✓
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Workspace Setup</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-fuchsia-300 border border-white/[0.08]">
                {completedCount} of {steps.length} completed
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Required configuration steps to activate custom domains and edge routing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      {isExpanded && (
        <div className="divide-y divide-white/[0.05] pt-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className="py-2.5 flex items-center justify-between text-xs gap-3 group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div
                    className={`font-semibold ${
                      step.completed ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    {step.title}
                  </div>
                  <p className="text-[11px] text-neutral-400">{step.desc}</p>
                </div>
              </div>

              {step.action && !step.completed && (
                <button
                  onClick={step.action}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-900/80 to-purple-800/50 border border-purple-500/40 text-white text-[11px] font-semibold hover:border-purple-400 transition-colors flex items-center gap-1 flex-shrink-0"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
