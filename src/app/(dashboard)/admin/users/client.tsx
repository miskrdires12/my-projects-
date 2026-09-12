"use client";

// ============================================================================
// STUDENT BRIDGE — ADMIN USER & RBAC MANAGEMENT CLIENT
// Instant 0ms optimistic provisioning, role assignment, and operator deletion
// Styled in Silicon Labs Obsidian & Neon Lemon Green design system
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  UserCheck,
  Search,
  X,
  KeyRound,
  Mail,
  User,
} from "lucide-react";
import { createUserAction, deleteUserAction } from "@/actions/users";
import type { UserRole } from "@/types/auth";

export interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: Date | string;
}

interface UsersClientProps {
  initialUsers: UserItem[];
  currentUserId: string;
}

export const UsersClient: React.FC<UsersClientProps> = ({ initialUsers, currentUserId }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for optimistic updates
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("RECEIVER");

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize when initialUsers changes from server
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Statistics calculation
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const receiverCount = users.filter((u) => u.role === "RECEIVER").length;
  const senderCount = users.filter((u) => u.role === "SENDER").length;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password) {
      setErrorMessage("Please fill in all required operator fields.");
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        role,
      });

      if (!res.success) {
        setErrorMessage(res.error ?? "Failed to provision operator account");
      } else {
        const newUser: UserItem = res.user || {
          id: (res as any).userId || `temp_${Date.now()}`,
          username: trimmedUsername,
          email: trimmedEmail,
          role,
          createdAt: new Date(),
        };

        // 0ms Optimistic Update: prepend immediately to state
        setUsers((prev) => [newUser, ...prev]);

        setSuccessMessage(`Operator "${trimmedUsername}" provisioned successfully with ${role} privileges.`);
        setIsCreateOpen(false);
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("RECEIVER");

        // Sync in background
        router.refresh();

        setTimeout(() => setSuccessMessage(null), 4000);
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete operator account "${name}"? This action is permanent.`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    // Save previous snapshot for rollback if needed
    const previousUsers = [...users];

    // 0ms Optimistic removal
    setUsers((prev) => prev.filter((u) => u.id !== id));

    startTransition(async () => {
      const res = await deleteUserAction(id);
      if (!res.success) {
        // Rollback
        setUsers(previousUsers);
        setErrorMessage(res.error ?? "Failed to delete operator account");
      } else {
        setSuccessMessage(`Operator "${name}" was deleted successfully.`);
        router.refresh();
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert Messages */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs font-mono text-red-500 shadow-sm animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-bold">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#8fe617]/50 bg-[#8fe617]/15 p-4 text-xs font-mono text-[#062404] dark:text-[#8fe617] shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#8fe617]" />
          <span className="font-bold">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-[#062404] dark:text-[#8fe617] opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Operator Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-4 shadow-xs">
          <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] uppercase font-bold">
            Total Operators
          </div>
          <div className="text-2xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] mt-1">
            {totalCount}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-amber-700 dark:text-amber-400 uppercase font-bold">
            Administrators
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {adminCount}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-bold">
            Receivers (Printing)
          </div>
          <div className="text-2xl font-black font-mono text-[#8fe617] mt-1">
            {receiverCount}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-xs">
          <div className="text-[10px] font-mono text-blue-700 dark:text-blue-400 uppercase font-bold">
            Senders (Intake)
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            {senderCount}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filter & Provision Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7771] dark:text-[#8a9e93]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] pl-10 pr-4 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] placeholder-[#6b7771] dark:placeholder-[#8a9e93] focus:border-[#8fe617] focus:outline-none transition-all shadow-xs"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-3 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none shadow-xs"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="RECEIVER">Receiver</option>
            <option value="SENDER">Sender</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8fe617] px-5 py-2.5 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-[0_0_20px_rgba(143,230,23,0.35)] transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <UserPlus className="h-4 w-4 stroke-[2.5]" />
          <span>Provision Operator</span>
        </button>
      </div>

      {/* Operators Directory Table */}
      <div className="rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#eef5f1] dark:border-[#1c261e] bg-[#f7faf9] dark:bg-[#070908] text-[#6b7771] dark:text-[#8a9e93] font-mono uppercase text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Operator Identity</th>
                <th className="px-5 py-3.5">Institutional Email</th>
                <th className="px-5 py-3.5">Role Privilege</th>
                <th className="px-5 py-3.5">Provisioned Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef5f1] dark:divide-[#1c261e]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    No operators found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const dateStr =
                    user.createdAt instanceof Date
                      ? user.createdAt.toLocaleDateString()
                      : new Date(user.createdAt).toLocaleDateString();

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#f7faf9] dark:hover:bg-[#161d19] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-xl bg-[#8fe617]/15 border border-[#8fe617]/40 flex items-center justify-center text-[#062404] dark:text-[#8fe617]">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span>{user.username}</span>
                        {isSelf && (
                          <span className="rounded-md bg-[#8fe617] px-2 py-0.5 text-[10px] font-mono font-black text-[#062404] shadow-xs">
                            CURRENT SESSION
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#6b7771] dark:text-[#8a9e93]">
                        {user.email}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            user.role === "ADMIN"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                              : user.role === "SENDER"
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40"
                              : "bg-[#8fe617]/20 text-emerald-800 dark:text-[#8fe617] border border-[#8fe617]/40"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[#6b7771] dark:text-[#8a9e93]">
                        {dateStr}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id, user.username)}
                            disabled={isPending}
                            className="rounded-xl p-2 text-red-500 hover:text-white hover:bg-red-600 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title={`Delete operator "${user.username}"`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                            Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Operator Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#1c261e] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#8fe617]/20 border border-[#8fe617] flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-[#8fe617]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#080808] dark:text-[#f2f7f4]">
                    Provision Operator Account
                  </h3>
                  <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] font-mono">
                    Instant credential generation &amp; privilege assignment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Username *</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator_one"
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Institutional Email *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@studentbridge.internal"
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Initial Password *</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#080808] dark:text-[#f2f7f4] font-bold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#8fe617]" />
                  <span>Assign Role Privilege *</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-[#f7faf9] dark:bg-[#070908] px-3.5 py-2 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:outline-none"
                >
                  <option value="RECEIVER">RECEIVER (8-Up Print Engine, Importer, Student Search)</option>
                  <option value="SENDER">SENDER (Student Intake, Studio Photo Capture, Bulk Import)</option>
                  <option value="ADMIN">ADMIN (Unrestricted Systemic Access &amp; RBAC Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#eef5f1] dark:border-[#1c261e]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#dce7e1] dark:border-[#223126] bg-white dark:bg-[#111613] px-4 py-2 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#1c261e] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8fe617] px-5 py-2 text-xs font-mono font-black text-[#062404] hover:bg-[#7ecc10] shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  <span>{isPending ? "Provisioning..." : "Provision Operator"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
