"use server";

// ============================================================================
// STUDENT BRIDGE — AUDIT LOG MANAGEMENT SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";

export async function clearAuditLogsAction() {
  const session = await requireAuth("database:manage");

  try {
    const count = await prisma.auditLog.count();
    await prisma.auditLog.deleteMany({});

    await createSafeAuditLog({
      userId: session.userId,
      action: "AUDIT_LOGS_CLEARED",
      entityType: "AUDIT_LOG",
      metadata: { clearedRecordsCount: count, clearedBy: session.username },
    });

    revalidatePath("/admin/database");
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to clear audit logs" };
  }
}
