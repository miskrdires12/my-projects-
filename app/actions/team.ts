"use server";

import { getTenantContext, assertAuthorizedRole } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import { MembershipRole } from "@/types/tenant";
import { revalidatePath } from "next/cache";

export async function inviteMemberAction(formData: FormData) {
  const orgSlug = (formData.get("orgSlug") as string) || undefined;
  const tenant = await getTenantContext(orgSlug);

  // Strict RBAC: Only OWNER or ADMIN can invite members
  assertAuthorizedRole(tenant.userRole, "ADMIN");

  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const role = (formData.get("role") as MembershipRole) || "MEMBER";

  if (!email || !email.includes("@")) {
    return { success: false, error: "A valid email address is required." };
  }

  // Check plan limits
  const currentMemberCount = await prisma.organizationMember.count({
    where: { organizationId: tenant.organizationId },
  });

  if (tenant.subscriptionTier === "FREE" && currentMemberCount >= 2) {
    return {
      success: false,
      error: "Starter plan is limited to 2 team members. Upgrade to Professional for up to 15 members.",
    };
  }

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  });

  if (existingUser) {
    const isMember = existingUser.memberships.some((m) => m.organizationId === tenant.organizationId);
    if (isMember) {
      return { success: false, error: "User is already an active member of this organization." };
    }

    // Direct add for known user in demo
    await prisma.organizationMember.create({
      data: {
        organizationId: tenant.organizationId,
        userId: existingUser.id,
        role,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: "MEMBER_ADDED",
        resourceType: "Member",
        resourceId: existingUser.id,
        metadata: JSON.stringify({ email, role }),
      },
    });

    revalidatePath(`/${tenant.organizationSlug}/team`);
    revalidatePath(`/${tenant.organizationSlug}/dashboard`);
    return { success: true, message: `Added ${email} directly as a team member.` };
  }

  // Otherwise create pending invitation
  const token = `inv_${Math.random().toString(36).substring(2)}${Date.now()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.invitation.create({
    data: {
      email,
      role,
      token,
      expiresAt,
      organizationId: tenant.organizationId,
      invitedById: tenant.userId,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "MEMBER_INVITED",
      resourceType: "Invitation",
      metadata: JSON.stringify({ email, role, token }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/team`);
  return { success: true, message: `Invitation sent to ${email} with role '${role}'.` };
}

export async function removeMemberAction(memberId: string, orgSlug: string) {
  const tenant = await getTenantContext(orgSlug);

  // Strict RBAC: Only OWNER or ADMIN can remove members
  assertAuthorizedRole(tenant.userRole, "ADMIN");

  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!targetMember || targetMember.organizationId !== tenant.organizationId) {
    return { success: false, error: "Member not found in this organization." };
  }

  // Prevent removing the OWNER unless another OWNER exists
  if (targetMember.role === "OWNER") {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: tenant.organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { success: false, error: "Cannot remove the sole Organization Owner." };
    }
  }

  // Admins cannot remove Owners
  if (tenant.userRole === "ADMIN" && targetMember.role === "OWNER") {
    return { success: false, error: "Admins cannot remove Organization Owners." };
  }

  await prisma.organizationMember.delete({
    where: { id: memberId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "MEMBER_REMOVED",
      resourceType: "Member",
      resourceId: targetMember.userId,
      metadata: JSON.stringify({ email: targetMember.user.email, role: targetMember.role }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/team`);
  revalidatePath(`/${tenant.organizationSlug}/dashboard`);
  return { success: true };
}

export async function updateMemberRoleAction(memberId: string, newRole: MembershipRole, orgSlug: string) {
  const tenant = await getTenantContext(orgSlug);

  // Strict RBAC: Only OWNER can promote or demote roles
  assertAuthorizedRole(tenant.userRole, "OWNER");

  const targetMember = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.organizationId !== tenant.organizationId) {
    return { success: false, error: "Member not found." };
  }

  await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "ROLE_UPDATED",
      resourceType: "Member",
      resourceId: targetMember.userId,
      metadata: JSON.stringify({ previousRole: targetMember.role, newRole }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/team`);
  return { success: true };
}
