"use client";

// ============================================================================
// STUDENT BRIDGE — RECEIVER MISTAKE ANALYZER & DATA AUDIT TOOL
// Scans student records for data quality defects (missing photos, slash marks /,
// uncapitalized names, invalid phones) and attributes corrections to senders.
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Search,
  X,
  Edit3,
  Wand2,
  Users,
  ShieldAlert,
} from "lucide-react";
import type { StudentExtended } from "@/types/student";

interface ReceiverMistakeAnalyzerProps {
  students: StudentExtended[];
  isOpen: boolean;
  onClose: () => void;
  onEditStudent: (student: StudentExtended) => void;
  onAutoFixName: (student: StudentExtended, fixedName: string) => void;
}

export interface DetectedAnomaly {
  student: StudentExtended;
  type: "SLASH_IN_NAME" | "MISSING_PHOTO" | "UNCAPITALIZED_NAME" | "INVALID_PHONE" | "MISSING_SCHOOL";
  severity: "high" | "medium" | "low";
  description: string;
  suggestedFix?: string;
}

export function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export default function ReceiverMistakeAnalyzer({
  students,
  isOpen,
  onClose,
  onEditStudent,
  onAutoFixName,
}: ReceiverMistakeAnalyzerProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchSender, setSearchSender] = useState<string>("");

  // Scan all students and identify anomalies
  const anomalies = useMemo(() => {
    const list: DetectedAnomaly[] = [];

    students.forEach((s) => {
      const name = s.fullName || "";
      const sId = s.studentId || "";
      const phone = s.phone || "";
      const hasPhoto = Boolean(s.photoPath && s.photoPath.trim().length > 0);

      // 1. Slash Mark in Name or ID (High Severity)
      if (name.includes("/") || name.includes("\\") || sId.includes("/") || sId.includes("\\")) {
        list.push({
          student: s,
          type: "SLASH_IN_NAME",
          severity: "high",
          description: `Illegal slash mark '/' detected in ${name.includes("/") ? "student name" : "student ID"}.`,
          suggestedFix: name.replace(/[/\\]/g, " ").replace(/\s+/g, " ").trim(),
        });
      }

      // 2. Missing Photo (Medium Severity)
      if (!hasPhoto) {
        list.push({
          student: s,
          type: "MISSING_PHOTO",
          severity: "medium",
          description: "Student has no portrait photo attached.",
        });
      }

      // 3. Uncapitalized Name (Low Severity)
      if (name && name !== capitalizeWords(name) && !name.includes("/")) {
        list.push({
          student: s,
          type: "UNCAPITALIZED_NAME",
          severity: "low",
          description: `Name is not properly capitalized: "${name}".`,
          suggestedFix: capitalizeWords(name),
        });
      }

      // 4. Invalid Phone Number
      if (!phone || phone.replace(/[^\d]/g, "").length < 9) {
        list.push({
          student: s,
          type: "INVALID_PHONE",
          severity: "medium",
          description: `Phone number is incomplete or invalid: "${phone || "EMPTY"}".`,
        });
      }

      // 5. Missing School or Location
      if (!s.school || !s.school.trim()) {
        list.push({
          student: s,
          type: "MISSING_SCHOOL",
          severity: "low",
          description: "School name is missing.",
        });
      }
    });

    return list;
  }, [students]);

  // Mistakes count grouped by sender
  const senderMistakeMap = useMemo(() => {
    const map: Record<string, { count: number; high: number }> = {};
    anomalies.forEach((a) => {
      const sender = a.student.senderName || "Unknown Sender";
      if (!map[sender]) map[sender] = { count: 0, high: 0 };
      map[sender].count++;
      if (a.severity === "high") map[sender].high++;
    });
    return map;
  }, [anomalies]);

  // Filtered anomalies
  const filtered = useMemo(() => {
    return anomalies.filter((a) => {
      if (filterType !== "ALL" && a.type !== filterType) return false;
      if (searchSender.trim()) {
        const q = searchSender.toLowerCase();
        const sName = (a.student.senderName || "").toLowerCase();
        const stName = (a.student.fullName || "").toLowerCase();
        const sId = (a.student.studentId || "").toLowerCase();
        return sName.includes(q) || stName.includes(q) || sId.includes(q);
      }
      return true;
    });
  }, [anomalies, filterType, searchSender]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-neutral-800 bg-[#0d120f] shadow-2xl text-white ring-1 ring-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black font-mono text-white flex items-center gap-2">
                <span>Receiver Data Quality & Mistake Analyzer</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-black">
                  {anomalies.length} Issues Found
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Live scan of student records for special character errors, uncapitalized names, missing portraits, and sender mistakes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sender Quality Summary Bar */}
        <div className="p-4 bg-neutral-900/30 border-b border-neutral-800/80">
          <div className="text-[11px] font-mono uppercase font-bold text-neutral-400 mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#8fe617]" />
            <span>Mistakes Attributed by Sender Operator:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(senderMistakeMap).length === 0 ? (
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> 100% Clean Data! Zero mistakes detected.
              </span>
            ) : (
              Object.entries(senderMistakeMap).map(([sender, info]) => (
                <div
                  key={sender}
                  className="px-3 py-1.5 rounded-xl border border-neutral-800 bg-[#141a16] text-xs font-mono flex items-center gap-2"
                >
                  <span className="font-bold text-white">{sender}</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-black text-[11px]">
                    {info.count} mistakes
                  </span>
                  {info.high > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold text-[10px]">
                      {info.high} critical (/)
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchSender}
              onChange={(e) => setSearchSender(e.target.value)}
              placeholder="Filter by Student Name, ID, or Sender Operator..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#8fe617]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterType === "ALL" ? "bg-[#8fe617] text-black" : "bg-neutral-800 text-neutral-300"
              }`}
            >
              All ({anomalies.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("SLASH_IN_NAME")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterType === "SLASH_IN_NAME"
                  ? "bg-red-500 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:text-white"
              }`}
            >
              Slash Marks / ({anomalies.filter((a) => a.type === "SLASH_IN_NAME").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("UNCAPITALIZED_NAME")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterType === "UNCAPITALIZED_NAME"
                  ? "bg-[#8fe617] text-black"
                  : "bg-neutral-800 text-neutral-300 hover:text-white"
              }`}
            >
              Uncapitalized ({anomalies.filter((a) => a.type === "UNCAPITALIZED_NAME").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("MISSING_PHOTO")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterType === "MISSING_PHOTO"
                  ? "bg-amber-500 text-black"
                  : "bg-neutral-800 text-neutral-300 hover:text-white"
              }`}
            >
              Missing Photos ({anomalies.filter((a) => a.type === "MISSING_PHOTO").length})
            </button>
          </div>
        </div>

        {/* Anomaly List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <div className="font-bold text-base text-white">No anomalies matching your filter</div>
              <p className="text-xs text-neutral-400">All scanned student records satisfy strict quality checks.</p>
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={`${item.student.id}-${item.type}-${idx}`}
                className="p-3.5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        item.severity === "high"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : item.severity === "medium"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      }`}
                    >
                      {item.type.replace(/_/g, " ")}
                    </span>
                    <strong className="text-white text-sm">{item.student.fullName}</strong>
                    <span className="text-neutral-500">({item.student.studentId})</span>
                  </div>

                  <p className="text-neutral-300 text-[11px]">{item.description}</p>

                  <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                    <span>Sender: <strong className="text-neutral-300">{item.student.senderName || "Direct"}</strong></span>
                    <span>•</span>
                    <span>Grade: <strong className="text-neutral-300">{item.student.grade}</strong></span>
                    <span>•</span>
                    <span>School: <strong className="text-neutral-300">{item.student.school || "Unassigned"}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.suggestedFix && (
                    <button
                      type="button"
                      onClick={() => onAutoFixName(item.student, item.suggestedFix!)}
                      className="px-3 py-1.5 rounded-xl bg-[#8fe617] text-black font-black text-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title={`Apply fix: "${item.suggestedFix}"`}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Auto-Fix ({item.suggestedFix})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditStudent(item.student);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-sky-400" />
                    <span>Edit Record</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
