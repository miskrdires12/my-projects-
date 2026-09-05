"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";

interface UpdateSettingsInput {
  name: string;
  logoUrl?: string | null;
  contactEmail?: string | null;
  timezone?: string;
  currency?: string;
}

export async function updateOrganizationSettingsAction(
  orgSlug: string,
  data: UpdateSettingsInput
) {
  try {
    const tenant = await getTenantContext(orgSlug);

    // Enforce authorization: only OWNER or ADMIN can edit workspace settings
    if (tenant.userRole !== "OWNER" && tenant.userRole !== "ADMIN") {
      return { success: false, error: "Insufficient permissions. Only Owners and Admins can modify settings." };
    }

    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: "Organization name must be at least 2 characters." };
    }

    // Update organization record
    const updated = await prisma.organization.update({
      where: { id: tenant.organizationId },
      data: {
        name: data.name.trim(),
        logoUrl: data.logoUrl?.trim() || null,
      },
    });

    // Write audit log entry
    await prisma.auditLog.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: "ORGANIZATION_SETTINGS_UPDATED",
        resourceType: "Organization",
        resourceId: tenant.organizationId,
        metadata: JSON.stringify({
          updatedBy: tenant.userName,
          userEmail: tenant.userEmail,
          newName: data.name.trim(),
          contactEmail: data.contactEmail,
          timezone: data.timezone,
          currency: data.currency,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    revalidatePath(`/${orgSlug}/settings`);
    revalidatePath(`/${orgSlug}/dashboard`);
    revalidatePath(`/${orgSlug}/billing`);

    return {
      success: true,
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl,
      },
    };
  } catch (error: any) {
    console.error("Failed to update organization settings:", error);
    return { success: false, error: error.message || "Failed to save settings." };
  }
}

export async function updateSecurityPoliciesAction(
  orgSlug: string,
  policies: {
    enforce2FA: boolean;
    sessionTimeoutMins: number;
    restrictInvitesToAdmin: boolean;
    ipWhitelist: string[];
  }
) {
  try {
    const tenant = await getTenantContext(orgSlug);

    if (tenant.userRole !== "OWNER") {
      return { success: false, error: "Only the Workspace Owner can alter security compliance policies." };
    }

    // Write audit log with the new policies
    await prisma.auditLog.create({
      data: {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: "SECURITY_POLICIES_UPDATED",
        resourceType: "SecurityPolicy",
        resourceId: tenant.organizationId,
        metadata: JSON.stringify({
          enforce2FA: policies.enforce2FA,
          sessionTimeoutMins: policies.sessionTimeoutMins,
          restrictInvitesToAdmin: policies.restrictInvitesToAdmin,
          ipWhitelistCount: policies.ipWhitelist.length,
          updatedBy: tenant.userName,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    revalidatePath(`/${orgSlug}/settings`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Security update failed." };
  }
}

export async function exportOrganizationDataAction(orgSlug: string) {
  try {
    const tenant = await getTenantContext(orgSlug);

    if (tenant.userRole !== "OWNER" && tenant.userRole !== "ADMIN") {
      return { success: false, error: "Unauthorized export request." };
    }

    const org = await prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, createdAt: true },
            },
          },
        },
        projects: true,
        auditLogs: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    const archive = {
      manifest: {
        version: "3.0.0",
        tenantId: org.id,
        tenantSlug: org.slug,
        exportedAt: new Date().toISOString(),
        exportedBy: tenant.userEmail,
        engineeredBy: "Miskr Dires",
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        tier: org.subscriptionTier,
        status: org.subscriptionStatus,
        createdAt: org.createdAt,
      },
      members: org.members.map((m) => ({
        role: m.role,
        joinedAt: m.createdAt,
        user: m.user,
      })),
      projects: org.projects,
      recentAuditLogs: org.auditLogs,
    };

    return { success: true, archiveJson: JSON.stringify(archive, null, 2) };
  } catch (error: any) {
    return { success: false, error: error.message || "Archive export failed." };
  }
}
