"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, Sparkles, ChevronDown, ChevronUp, X } from "lucide-react";

interface OnboardingChecklistProps {
  orgSlug: string;
  onNavigateTab?: (tab: string) => void;
}

export function OnboardingChecklist({ orgSlug, onNavigateTab }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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
    <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-xs">
            ✓
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
              <span>Workspace Setup</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200">
                {completedCount} of {steps.length} completed
              </span>
            </h3>
            <p className="text-xs text-neutral-500">
              Required configuration steps to activate custom domains and edge routing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-black rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-neutral-400 hover:text-black rounded-lg transition-colors"
            title="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      {isExpanded && (
        <div className="divide-y divide-neutral-100 pt-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className="py-2.5 flex items-center justify-between text-xs gap-3 group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-black flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-neutral-300 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div
                    className={`font-semibold ${
                      step.completed ? "text-neutral-900" : "text-black"
                    }`}
                  >
                    {step.title}
                  </div>
                  <p className="text-[11px] text-neutral-500">{step.desc}</p>
                </div>
              </div>

              {step.action && !step.completed && (
                <button
                  onClick={step.action}
                  className="px-2.5 py-1 rounded-lg bg-black text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-1 flex-shrink-0 shadow-2xs"
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
