"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Building2,
  Check,
  Power,
} from "lucide-react";

interface ApkControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function ApkControlModal({
  isOpen,
  onClose,
  userRole: _userRole,
}: ApkControlModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isApkBlocked, setIsApkBlocked] = useState(false);
  const [approvedSchools, setApprovedSchools] = useState<string[]>(["Warka", "Sena Yerosen"]);
  const [availableSchools, setAvailableSchools] = useState<string[]>(["Warka", "Sena Yerosen"]);
  const [blockReason, setBlockReason] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch current config on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/apk/control");
        const data = await res.json();
        if (data.success && data.config) {
          setIsApkBlocked(Boolean(data.config.isApkBlocked));
          setApprovedSchools(data.config.approvedSchools || ["Warka", "Sena Yerosen"]);
          setBlockReason(data.config.blockReason || "");
        }
        if (data.availableSchools && Array.isArray(data.availableSchools)) {
          setAvailableSchools(data.availableSchools);
        }
      } catch (err) {
        console.error("Failed to load APK control settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBlock = () => {
    setIsApkBlocked((prev) => !prev);
  };

  const handleToggleSchool = (schoolName: string) => {
    setApprovedSchools((prev) => {
      const lower = schoolName.toLowerCase();
      const exists = prev.some((s) => s.toLowerCase() === lower);
      if (exists) {
        return prev.filter((s) => s.toLowerCase() !== lower);
      } else {
        return [...prev, schoolName];
      }
    });
  };

  const handleApproveWarkaOnly = () => {
    setApprovedSchools(["Warka"]);
  };

  const handleApproveAll = () => {
    setApprovedSchools([...availableSchools]);
  };

  const handleRevokeAll = () => {
    setApprovedSchools([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/apk/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isApkBlocked,
          approvedSchools,
          blockReason: blockReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ message: "Security policies applied immediately across all APK terminals.", type: "success" });
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1500);
      } else {
        setFeedback({ message: data.error || "Failed to update configuration.", type: "error" });
      }
    } catch (err: any) {
      setFeedback({ message: err.message || "Network error.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d120f] border border-[#223126] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#223126] flex items-center justify-between bg-[#111713]/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${isApkBlocked ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-[#8fe617]/10 border-[#8fe617]/30 text-[#8fe617]"}`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Mobile APK Access & School Approval
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Block mobile app traffic or restrict sync to approved campus selections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-200">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RotateCw className="w-6 h-6 animate-spin text-[#8fe617]" />
              <span className="text-xs font-medium">Querying security gateway...</span>
            </div>
          ) : (
            <>
              {/* Feedback alert */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    feedback.type === "success"
                      ? "bg-[#8fe617]/10 border-[#8fe617]/30 text-[#8fe617]"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
                >
                  {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* 1. Global APK Access Toggle */}
              <div className="p-4 rounded-xl border border-[#223126] bg-[#141b16] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isApkBlocked ? "bg-red-500/20 text-red-400" : "bg-[#8fe617]/20 text-[#8fe617]"}`}>
                      <Power className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        Global Mobile APK API Access
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {isApkBlocked
                          ? "APK access is BLOCKED. All requests from mobile devices receive HTTP 403."
                          : "APK access is ACTIVE. Terminals can sync and lookup students."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBlock}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isApkBlocked ? "bg-red-600" : "bg-[#8fe617]"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isApkBlocked ? "translate-x-7" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#223126]/60 text-xs">
                  <span className="text-zinc-400">Current Status:</span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-md ${
                      isApkBlocked
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/40"
                    }`}
                  >
                    {isApkBlocked ? "● BLOCKED / FORBIDDEN" : "● ACTIVE / PERMITTED"}
                  </span>
                </div>
              </div>

              {/* 2. School Authorization Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#8fe617]" />
                      Campus & School Selection Approvals
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Terminals can ONLY sync data for schools explicitly approved below:
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleApproveWarkaOnly}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#8fe617]/40 bg-[#8fe617]/10 text-[#8fe617] hover:bg-[#8fe617]/20 transition-colors"
                    >
                      Warka Only
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveAll}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      Approve All
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-red-900/40 bg-red-950/30 text-red-400 hover:bg-red-950/60 transition-colors"
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableSchools.map((school) => {
                    const isApproved = approvedSchools.some(
                      (s) => s.toLowerCase() === school.toLowerCase()
                    );
                    const isWarka = school.toLowerCase() === "warka";

                    return (
                      <div
                        key={school}
                        onClick={() => handleToggleSchool(school)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isApproved
                            ? "bg-[#142318] border-[#8fe617]/40 hover:border-[#8fe617]"
                            : "bg-[#161816] border-[#2a2f2a] opacity-75 hover:opacity-100 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                              isApproved
                                ? "bg-[#8fe617] border-[#8fe617] text-black font-black"
                                : "border-zinc-600 bg-transparent text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">
                                {school}
                              </span>
                              {isWarka && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Default Campus
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">
                              {isApproved ? "Approved for mobile sync" : "Pending approval (Blocked)"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isApproved
                              ? "bg-[#8fe617]/20 text-[#8fe617] border border-[#8fe617]/30"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {isApproved ? "Approved" : "Blocked"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#223126] bg-[#111713]/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-bold bg-[#8fe617] text-black rounded-xl hover:bg-[#a1f22e] disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-[#8fe617]/20"
          >
            {saving ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Policies...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Apply Security Policies</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
