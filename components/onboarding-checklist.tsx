"use client";

import { useState } from "react";
import { SquareCheck, Square, ArrowRight, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";

interface OnboardingChecklistProps {
  orgSlug: string;
  onNavigateTab?: (tab: string) => void;
}

export function OnboardingChecklist({ orgSlug, onNavigateTab }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [steps, setSteps] = useState([
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
  ]);

  if (isDismissed) return null;

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#0f0f14] border border-neutral-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
            <SquareCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <span>Workspace Setup</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/[0.08]">
                {completedCount} of {steps.length} completed
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Configuration checklist · Developed by Miskr Dires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-neutral-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-black dark:bg-white rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      {isExpanded && (
        <div className="divide-y divide-neutral-100 dark:divide-white/[0.05] pt-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className="py-2.5 flex items-center justify-between text-xs gap-3 group hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
            >
              <div
                onClick={() => toggleStep(step.id)}
                className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1 select-none"
              >
                {step.completed ? (
                  <SquareCheck className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div
                    className={`font-semibold ${
                      step.completed ? "text-neutral-900 dark:text-white line-through opacity-75" : "text-neutral-900 dark:text-white"
                    }`}
                  >
                    {step.title}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{step.desc}</p>
                </div>
              </div>

              {step.action && !step.completed && (
                <button
                  onClick={step.action}
                  className="px-3 py-1 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[11px] font-semibold transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
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
