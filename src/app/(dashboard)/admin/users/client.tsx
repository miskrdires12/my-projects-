"use client";

// ============================================================================
// STUDENT BRIDGE — ADMIN USER MANAGEMENT CLIENT
// ============================================================================

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createUserAction, deleteUserAction } from "@/actions/users";
import type { UserRole } from "@/types/auth";

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date;
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

      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-foreground-muted">
          TOTAL REGISTERED OPERATORS: <strong className="text-foreground">{initialUsers.length}</strong>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-black hover:bg-accent-hover shadow-glow-sm transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Provision Operator</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-surface-secondary text-foreground-muted font-mono uppercase text-[11px]">
            <tr>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Institutional Email</th>
              <th className="px-5 py-3">Role Privilege</th>
              <th className="px-5 py-3">Created Date</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initialUsers.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-surface-secondary/50">
                  <td className="px-5 py-3.5 font-semibold text-foreground flex items-center gap-2">
                    <span>{user.username}</span>
                    {isSelf && (
                      <span className="rounded bg-surface-tertiary border border-border px-1.5 py-0.5 text-[10px] font-mono text-accent">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-foreground-muted">{user.email}</td>
                  <td className="px-5 py-3.5 font-mono">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        user.role === "ADMIN"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : user.role === "SENDER"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : "bg-surface-tertiary text-foreground-muted"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-foreground-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={isPending}
                        className="rounded p-1.5 text-foreground-muted hover:text-red-400 hover:bg-surface-secondary transition-colors"
                        title="Delete User"
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
