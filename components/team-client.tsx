"use client";

import { useState } from "react";
import { Users2, UserPlus, Shield, ShieldAlert, Trash2, Mail, Lock, Check, AlertCircle, Search } from "lucide-react";
import { inviteMemberAction, removeMemberAction, updateMemberRoleAction } from "@/app/actions/team";
import { MembershipRole } from "@/types/tenant";
import { useToast } from "./toast-provider";

interface MemberItem {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}

interface TeamClientProps {
  initialMembers: MemberItem[];
  initialInvitations: InvitationItem[];
  orgSlug: string;
  currentUserRole: MembershipRole;
  currentUserId: string;
  currentTier: string;
}

export function TeamClient({
  initialMembers,
  initialInvitations,
  orgSlug,
  currentUserRole,
  currentUserId,
  currentTier,
}: TeamClientProps) {
  const toast = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canInvite = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const isOwner = currentUserRole === "OWNER";

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("orgSlug", orgSlug);

    const res = await inviteMemberAction(formData);

    if (!res.success) {
      setStatusMessage({ type: "error", text: res.error || "Failed to send invitation." });
      toast.error("Invitation Failed", res.error || "Could not issue invite token.");
      setIsSubmitting(false);
      return;
    }

    setStatusMessage({ type: "success", text: res.message || "Invitation sent successfully!" });
    toast.success("Invitation Sent", `Team member invited to /${orgSlug}`);
    setIsSubmitting(false);
    setIsInviteModalOpen(false);
  }

  async function handleRemoveMember(memberId: string) {
    const res = await removeMemberAction(memberId, orgSlug);
    if (res.success) {
      setMembers(members.filter((m) => m.id !== memberId));
      toast.info("Member Removed", "Organization access revoked.");
    } else {
      toast.error("Removal Failed", res.error || "Failed to remove member");
    }
  }

  async function handleRoleChange(memberId: string, newRole: MembershipRole) {
    const res = await updateMemberRoleAction(memberId, newRole, orgSlug);
    if (res.success) {
      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success("Role Updated", `Member role updated to ${newRole}`);
    } else {
      toast.error("Update Failed", res.error || "Failed to update role");
    }
  }

  const filteredMembers = members.filter(
    (m) =>
      m.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.user.name && m.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-950">Members & Access Control</h1>
          <p className="text-xs text-neutral-500">
            Role-based permissions and team management for workspace <code className="font-mono text-neutral-900">/{orgSlug}</code>.
          </p>
        </div>

        {canInvite ? (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-600">
            <Lock className="h-3.5 w-3.5 text-neutral-400" />
            <span>Read-only (Member role)</span>
          </div>
        )}
      </div>

      {/* RBAC Notice Banner if Member */}
      {!canInvite && (
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-neutral-900 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-neutral-950 font-medium">Access Restriction:</strong> Your role in
            this workspace is <span className="font-mono font-medium text-neutral-950">MEMBER</span>. You can deploy services, but only users with{" "}
            <span className="font-mono font-medium text-neutral-950">OWNER</span> or <span className="font-mono font-medium text-neutral-950">ADMIN</span> roles can manage members or modify subscription tiers.
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            statusMessage.type === "success"
              ? "bg-neutral-50 text-neutral-900 border-neutral-300"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="h-4 w-4 text-black" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Members Table Card */}
      <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-black" />
            <h2 className="text-xs font-bold text-neutral-950">
              Active Members ({members.length})
            </h2>
            <span className="text-[10px] text-neutral-400 font-mono">• {currentTier} Plan</span>
          </div>

          <div className="relative w-64">
            <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-7 pr-3 py-1 text-xs rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">Assigned Role</th>
                <th className="px-5 py-3">Joined Date</th>
                {canInvite && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredMembers.map((member) => {
                const isSelf = member.user.id === currentUserId;

                return (
                  <tr key={member.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {(member.user.name || member.user.email).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <span>{member.user.name || "Unnamed User"}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-black border border-neutral-300 font-mono">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-neutral-500 font-mono text-[11px]">{member.user.email}</td>

                    <td className="px-5 py-3.5">
                      {isOwner && !isSelf ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as MembershipRole)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-neutral-300 bg-white text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-neutral-100 text-neutral-900 border border-neutral-300">
                          {member.role}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-neutral-400 text-[11px] font-mono">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>

                    {canInvite && (
                      <td className="px-5 py-3.5 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove Member"
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <div className="rounded-2xl bg-white border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-xs font-bold text-neutral-950 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-black" />
              <span>Pending Invitations ({invitations.length})</span>
            </h2>
          </div>

          <div className="divide-y divide-neutral-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-neutral-900 font-mono text-[11px]">{inv.email}</div>
                  <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                    <span>Role: <strong className="text-black">{inv.role}</strong></span>
                    <span>•</span>
                    <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300 font-bold">
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Invite Team Member</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Issue a workspace invitation with an assigned role.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-800">Work Email</label>
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-800">Role & Access Level</label>
                <select
                  name="role"
                  defaultValue="MEMBER"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900 focus:bg-white font-medium"
                >
                  <option value="MEMBER">Member · Can view and deploy services</option>
                  <option value="ADMIN">Admin · Can invite members, manage billing, and configure settings</option>
                  {isOwner && <option value="OWNER">Owner · Full workspace administration</option>}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-neutral-950 hover:bg-neutral-800 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
