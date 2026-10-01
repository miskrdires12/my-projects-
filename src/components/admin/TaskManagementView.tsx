"use client";

// ============================================================================
// STUDENT BRIDGE — TASK MANAGEMENT & SENDER EFFICIENCY VIEW
// For Super Admin & Admin: Assign school/section tasks, monitor quota & accuracy
// ============================================================================

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  Plus,
  TrendingUp,
  AlertTriangle,
  Users,
  Target,
  Loader2,
  X,
  School,
  MapPin,
} from "lucide-react";
import { createSenderTaskAction, updateSenderTaskAction } from "@/actions/tasks";

interface SenderProfile {
  id: string;
  email: string;
  fullName: string;
  stationName: string;
  isActive: boolean;
  lastActive: Date | string;
  totalEnrolled: number;
  totalMistakes: number;
  accuracyRate: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  taskProgressRate: number;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  assignedToEmail: string;
  assignedByRole: string;
  assignedByEmail: string;
  school?: string | null;
  section?: string | null;
  targetCount: number;
  completedCount: number;
  status: string;
  deadline?: Date | string | null;
  createdAt: Date | string;
}

interface TaskManagementViewProps {
  initialTasks: TaskItem[];
  analytics: {
    totalSenders: number;
    activeSenders: number;
    totalTasksAssigned: number;
    completedTasksTotal: number;
    totalMistakesRecorded: number;
    senderProfiles: SenderProfile[];
  };
  currentUserRole: string;
}

const SCHOOLS_BY_SECTION: Record<string, string[]> = {
  Adama: ["Sena Yerosen", "Debebech", "Yacine", "Odda"],
  "Addis Ababa": ["YMS", "Adika Youth", "School Of America"],
  Mojjo: ["Mojjo"],
};

export default function TaskManagementView({
  initialTasks,
  analytics,
  currentUserRole,
}: TaskManagementViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedToEmail: analytics.senderProfiles[0]?.email || "miskrdires12@gmail.com",
    section: "Adama",
    school: "Sena Yerosen",
    targetCount: 150,
    deadline: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Available schools based on selected section
  const availableSchools = SCHOOLS_BY_SECTION[formData.section] || [];

  const handleSectionChange = (section: string) => {
    const schools = SCHOOLS_BY_SECTION[section] || [];
    setFormData((prev) => ({
      ...prev,
      section,
      school: schools[0] || "",
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError("Task title is required.");
      return;
    }

    startTransition(async () => {
      const res = await createSenderTaskAction({
        title: formData.title,
        description: formData.description,
        assignedToId: formData.assignedToEmail,
        assignedToEmail: formData.assignedToEmail,
        section: formData.section,
        school: formData.school,
        targetCount: Number(formData.targetCount),
        deadline: formData.deadline || undefined,
      });

      if (res.success && res.task) {
        setTasks((prev) => [res.task as any, ...prev]);
        setIsCreateOpen(false);
        setFormData({
          title: "",
          description: "",
          assignedToEmail: analytics.senderProfiles[0]?.email || "miskrdires12@gmail.com",
          section: "Adama",
          school: "Sena Yerosen",
          targetCount: 150,
          deadline: "",
        });
      } else {
        setFormError(res.error || "Failed to create task.");
      }
    });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(async () => {
      const res = await updateSenderTaskAction(taskId, { status: newStatus });
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    });
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterSection !== "ALL" && t.section !== filterSection) return false;
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              Sender Task Management & Efficiency
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617] border border-[#8fe617]/30">
              {currentUserRole}
            </span>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Assign registration quotas by school/section, track real-time intake progress, and analyze error rates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-black text-sm hover:brightness-105 transition-all shadow-md cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Senders Monitored</span>
            <Users className="h-4 w-4 text-[#8fe617]" />
          </div>
          <div className="text-3xl font-black font-mono text-neutral-900 dark:text-neutral-100 mt-2">
            {analytics.totalSenders}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>{analytics.activeSenders} Senders Active Now</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Tasks Assigned</span>
            <Target className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black font-mono text-neutral-900 dark:text-neutral-100 mt-2">
            {analytics.totalTasksAssigned}
          </div>
          <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-1">
            {analytics.completedTasksTotal} Tasks Fully Completed
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Average Accuracy</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black font-mono text-neutral-900 dark:text-neutral-100 mt-2">
            {analytics.senderProfiles.length > 0
              ? `${Math.round(
                  analytics.senderProfiles.reduce((acc, s) => acc + s.accuracyRate, 0) /
                    analytics.senderProfiles.length
                )}%`
              : "100%"}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold mt-1">
            Audited via Receiver Mistake Analyzer
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Mistakes Reported</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {analytics.totalMistakesRecorded}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold mt-1">
            Corrections logged on student edits
          </div>
        </div>
      </div>

      {/* Senders Efficiency & Quality Leaderboard */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#8fe617]" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              Live Sender Efficiency & Accuracy Audit
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
            Real-time Status Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-[#161e19] border-y border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-4">Sender Operator</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Students Enrolled</th>
                <th className="py-3 px-4">Mistakes Corrected</th>
                <th className="py-3 px-4">Accuracy Rating</th>
                <th className="py-3 px-4">Task Quota Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono">
              {analytics.senderProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    No sender accounts currently registered.
                  </td>
                </tr>
              ) : (
                analytics.senderProfiles.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-[#161e19]/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      <div>{s.fullName}</div>
                      <div className="text-[11px] text-neutral-400 font-normal">{s.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-500">
                          IDLE
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-black text-neutral-900 dark:text-neutral-100">
                      {s.totalEnrolled.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold ${
                          s.totalMistakes > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                        }`}
                      >
                        {s.totalMistakes} errors
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.accuracyRate >= 98
                                ? "bg-[#8fe617]"
                                : s.accuracyRate >= 90
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${s.accuracyRate}%` }}
                          />
                        </div>
                        <span className="font-bold">{s.accuracyRate}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500">
                          {s.completedTasks} / {s.totalTasks} Tasks
                        </span>
                        <span className="font-bold text-[#8fe617]">({s.taskProgressRate}%)</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks Table & Section Filter */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-sky-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              Assigned Tasks & Progress Logs
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Section Filter */}
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19] px-3 text-xs text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
            >
              <option value="ALL">All Sections</option>
              <option value="Adama">Adama Section</option>
              <option value="Addis Ababa">Addis Ababa Section</option>
              <option value="Mojjo">Mojjo Section</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#161e19] px-3 text-xs text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-500 font-mono text-xs">
              No tasks found matching current filters.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const progressPct = task.targetCount > 0
                ? Math.min(100, Math.round((task.completedCount / task.targetCount) * 100))
                : 0;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-[#161e19]/60 p-4 space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 font-mono">
                        {task.title}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                        {task.description || "Enroll students according to school instructions."}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : task.status === "IN_PROGRESS"
                          ? "bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                          : task.status === "CANCELLED"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  {/* School & Section Tag */}
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-600 dark:text-neutral-300">
                    <span className="flex items-center gap-1 bg-white dark:bg-[#111613] px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <School className="h-3 w-3 text-[#8fe617]" />
                      <span>{task.school || "All Schools"}</span>
                    </span>
                    <span className="flex items-center gap-1 bg-white dark:bg-[#111613] px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <MapPin className="h-3 w-3 text-sky-400" />
                      <span>{task.section || "General"}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-neutral-500">Progress</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {task.completedCount} / {task.targetCount} ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-[#8fe617] rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer with Assigned To & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] font-mono text-neutral-500">
                    <div>
                      <span>To: </span>
                      <strong className="text-neutral-800 dark:text-neutral-200">{task.assignedToEmail}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      {task.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(task.id, "COMPLETED")}
                          className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold transition-colors cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                      {task.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                          className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 font-bold transition-colors cursor-pointer"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] p-6 shadow-2xl text-neutral-900 dark:text-neutral-100">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#8fe617]" />
                <h3 className="font-bold text-base font-mono">Assign New Sender Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 my-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4 pt-3 text-xs font-mono">
              <div>
                <label className="block font-bold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Enroll Grade 10 Students for Sena Yerosen"
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Assign To Sender *</label>
                <select
                  value={formData.assignedToEmail}
                  onChange={(e) => setFormData({ ...formData, assignedToEmail: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none cursor-pointer"
                >
                  {analytics.senderProfiles.map((s) => (
                    <option key={s.id} value={s.email}>
                      {s.fullName} ({s.email})
                    </option>
                  ))}
                  {!analytics.senderProfiles.some((s) => s.email === "miskrdires12@gmail.com") && (
                    <option value="miskrdires12@gmail.com">Sender (miskrdires12@gmail.com)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Section / Branch *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none cursor-pointer"
                  >
                    <option value="Adama">Adama Section</option>
                    <option value="Addis Ababa">Addis Ababa Section</option>
                    <option value="Mojjo">Mojjo Section</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">School *</label>
                  <select
                    value={formData.school}
                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none cursor-pointer"
                  >
                    {availableSchools.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Student Quota *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetCount}
                    onChange={(e) => setFormData({ ...formData, targetCount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Ensure clear student photo with plain background and confirm spelling of father's name."
                  className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2 focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#161e19] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-black hover:brightness-105 transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Assign Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
