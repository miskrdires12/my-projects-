"use server";

import { getTenantContext, assertAuthorizedRole } from "@/lib/tenant-context";
import { getScopedPrisma, prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
  const orgSlug = (formData.get("orgSlug") as string) || undefined;
  const tenant = await getTenantContext(orgSlug);

  // All roles (OWNER, ADMIN, MEMBER) can create projects
  assertAuthorizedRole(tenant.userRole, "MEMBER");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: "Project name is required" };
  }

  // Enforce tier limit on FREE tier (max 3 projects)
  if (tenant.subscriptionTier === "FREE") {
    const existingCount = await prisma.project.count({
      where: { organizationId: tenant.organizationId },
    });
    if (existingCount >= 3) {
      return {
        success: false,
        error: "Starter plan limit reached (max 3 projects). Upgrade to Professional for unlimited projects.",
      };
    }
  }

  const db = getScopedPrisma(tenant.organizationId);

  const project = await db.project.create({
    data: {
      name: name.trim(),
      description: description ? description.trim() : null,
      organizationId: tenant.organizationId,
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "PROJECT_CREATED",
      resourceType: "Project",
      resourceId: project.id,
      metadata: JSON.stringify({ name: project.name }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/projects`);
  revalidatePath(`/${tenant.organizationSlug}/dashboard`);

  return { success: true, project };
}

export async function toggleProjectStatusAction(projectId: string, currentStatus: string, orgSlug: string) {
  const tenant = await getTenantContext(orgSlug);
  assertAuthorizedRole(tenant.userRole, "MEMBER");

  const newStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
  const db = getScopedPrisma(tenant.organizationId);

  await db.project.update({
    where: { id: projectId },
    data: { status: newStatus },
  });

  await db.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: `PROJECT_${newStatus}`,
      resourceType: "Project",
      resourceId: projectId,
      metadata: JSON.stringify({ previousStatus: currentStatus, newStatus }),
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/projects`);
  return { success: true };
}

export async function deleteProjectAction(projectId: string, orgSlug: string) {
  const tenant = await getTenantContext(orgSlug);
  // Only ADMIN or OWNER can delete projects
  assertAuthorizedRole(tenant.userRole, "ADMIN");

  const db = getScopedPrisma(tenant.organizationId);

  await db.project.delete({
    where: { id: projectId },
  });

  await db.auditLog.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "PROJECT_DELETED",
      resourceType: "Project",
      resourceId: projectId,
    },
  });

  revalidatePath(`/${tenant.organizationSlug}/projects`);
  revalidatePath(`/${tenant.organizationSlug}/dashboard`);
  return { success: true };
}
