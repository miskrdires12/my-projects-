"use client";

// ============================================================================
// STUDENT BRIDGE — ADMIN USER & WORKER LIFECYCLE MANAGEMENT CLIENT
// Tracks workers from starting to final status, shows data sent by who,
// and manages hardware device bindings and role privileges.
// ============================================================================

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Clock,
  Send,
} from "lucide-react";
import { createUserAction, deleteUserAction, resetUserDeviceAction } from "@/actions/users";
import type { UserRole } from "@/types/auth";

export interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  status?: string | null;
  currentStatus?: string | null;
  sessionStartedAt?: Date | string | null;
  sessionEndedAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
  lastActiveAt?: Date | string | null;
  workSessionCount?: number;
  totalWorkMinutes?: number;
  boundDeviceId?: string | null;
  boundDeviceInfo?: string | null;
  studentsSentCount?: number;
  createdAt: Date | string;
}

interface UsersClientProps {
  initialUsers: UserItem[];
  currentUserId: string;
}

export const UsersClient: React.FC<UsersClientProps> = ({ initialUsers, currentUserId }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("RECEIVER");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createUserAction({
        username,
        email,
        password,
        role,
      });

      if (!res.success) {
        setErrorMessage(res.error ?? "Failed to create user");
      } else {
        setSuccessMessage(`User "${username}" created successfully with role ${role}.`);
        setIsCreateOpen(false);
        setUsername("");
        setEmail("");
        setPassword("");
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteUserAction(id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Failed to delete user");
      } else {
        router.refresh();
      }
    });
  };

  const handleResetDevice = (id: string, name: string) => {
    if (!confirm(`Reset and unbind device authorization for operator "${name}"? They will be able to bind a new device on next login.`)) {
      return;
    }

    startTransition(async () => {
      const res = await resetUserDeviceAction(id);
      if (!res.success) {
        setErrorMessage("Failed to reset worker device lock.");
      } else {
        setSuccessMessage(`Device lock reset for "${name}". Worker can now authenticate on a new device.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-accent/40 bg-accent-dim p-4 text-xs text-accent">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs font-mono text-foreground-muted flex items-center gap-3">
          <span>TOTAL PROVISIONED WORKERS: <strong className="text-foreground">{initialUsers.length}</strong></span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {initialUsers.filter(u => u.currentStatus === "ACTIVE_WORKING").length} ACTIVE NOW
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm transition-all self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Provision Worker Account</span>
        </button>
      </div>

      {/* Workers Lifecycle & Telemetry Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-secondary text-foreground-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="px-5 py-3">Worker / Identity</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Shift Status</th>
                <th className="px-5 py-3">Work Shift (Start → Final)</th>
                <th className="px-5 py-3">Data Sent</th>
                <th className="px-5 py-3">Authorized Device</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initialUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const isWorking = user.currentStatus === "ACTIVE_WORKING";
                const isCompleted = user.currentStatus === "COMPLETED";

                const startTimeFormatted = user.sessionStartedAt
                  ? new Date(user.sessionStartedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—";

                const finalTimeFormatted = user.sessionEndedAt
                  ? new Date(user.sessionEndedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : user.lastActiveAt && !isWorking
                  ? new Date(user.lastActiveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : isWorking
                  ? "In Progress..."
                  : "—";

                return (
                  <tr key={user.id} className="hover:bg-surface-secondary/50 transition-colors">
                    {/* Worker / Identity */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>{user.username}</span>
                        {isSelf && (
                          <span className="rounded bg-surface-tertiary border border-border px-1.5 py-0.2 text-[9px] font-mono text-accent">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-foreground-muted font-mono">{user.email}</div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5 font-mono">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                          user.role === "ADMIN"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : user.role === "SENDER"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Shift Status */}
                    <td className="px-5 py-3.5">
                      {isWorking ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          ACTIVE WORKING
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-mono font-medium text-blue-400">
                          <CheckCircle2 className="h-3 w-3" />
                          FINALIZED SHIFT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-mono text-foreground-muted">
                          OFFLINE
                        </span>
                      )}
                    </td>

                    {/* Work Shift (Start -> Final) */}
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      <div className="text-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 text-accent shrink-0" />
                        <span>Start: <strong className="text-foreground">{startTimeFormatted}</strong></span>
                      </div>
                      <div className="text-foreground-muted text-[10px] mt-0.5 pl-4">
                        Final: <span className={isWorking ? "text-emerald-400 font-semibold" : ""}>{finalTimeFormatted}</span>
                      </div>
                    </td>

                    {/* Data Sent */}
                    <td className="px-5 py-3.5 font-mono">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <Send className="h-3 w-3 text-accent" />
                        <span>{user.studentsSentCount ?? 0}</span>
                        <span className="text-[10px] text-foreground-muted font-normal">records</span>
                      </div>
                      <div className="text-[10px] text-foreground-muted">
                        {user.workSessionCount ?? 0} sessions
                      </div>
                    </td>

                    {/* Authorized Device */}
                    <td className="px-5 py-3.5">
                      {user.boundDeviceInfo || user.boundDeviceId ? (
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-foreground font-mono truncate max-w-[150px]" title={user.boundDeviceInfo || user.boundDeviceId || ""}>
                            {user.boundDeviceInfo || "Hardware Bound"}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleResetDevice(user.id, user.username)}
                            disabled={isPending}
                            className="p-1 rounded text-foreground-muted hover:text-amber-400 hover:bg-surface-tertiary transition-colors"
                            title="Reset Hardware Lock / Unbind"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-foreground-muted italic">
                          Any Device (Unbound)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={isPending}
                          className="rounded p-1.5 text-foreground-muted hover:text-red-400 hover:bg-surface-secondary transition-colors"
                          title="Delete Worker Account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Provision Operator Account</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-foreground-muted hover:text-foreground text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground-muted mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator_one"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground-muted mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@studentbridge.internal"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground-muted mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-foreground-muted mb-1">Assign Role Privilege *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-foreground focus:border-accent focus:outline-none font-mono"
                >
                  <option value="RECEIVER">RECEIVER (Search, view, filter, edit student records)</option>
                  <option value="SENDER">SENDER (Register students, live capture, bulk import)</option>
                  <option value="ADMIN">ADMIN (Full systemic & role administration)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-border bg-surface px-4 py-2 font-medium text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 font-bold text-black hover:bg-accent-hover shadow-glow-sm"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  <span>Create Operator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
