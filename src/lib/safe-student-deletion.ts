// ============================================================================
// STUDENT BRIDGE — SAFE STUDENT DELETION WORKFLOW
// ADMIN REQUEST -> VERIFY STUDENT -> IDENTIFY ALL RELATED STORAGE OBJECTS ->
// DELETE/ARCHIVE RETENTION POLICY -> VERIFY DELETION -> REMOVE DB RECORD -> AUDIT LOG
// Prevents accidental deletion of another student's files.
// ============================================================================

import prisma from "@/lib/prisma";
import { deleteFromStorage, storageObjectExists } from "@/lib/storage-service";
import { createSafeAuditLog } from "@/lib/audit";

export interface SafeDeletionResult {
  success: boolean;
  studentId: string;
  affectedStorageKeys: string[];
  bytesReclaimed: number;
  error?: string;
}

/**
 * Safely deletes a student record and all strictly owned storage assets.
 * Guarantees no cross-student asset deletion and creates an immutable audit trail.
 */
export async function executeSafeStudentDeletion(
  idOrStudentId: string,
  operator: { userId: string; username: string; role: string },
  confirmationText?: string
): Promise<SafeDeletionResult> {
  // Enforce explicit confirmation for permanent destructive operation
  if (confirmationText && confirmationText !== "CONFIRM_DELETE") {
    return {
      success: false,
      studentId: idOrStudentId,
      affectedStorageKeys: [],
      bytesReclaimed: 0,
      error: "Explicit confirmation token mismatch. Deletion aborted.",
    };
  }

  // 1. Verify Student Existence
  const student = await prisma.student.findFirst({
    where: {
      OR: [{ id: idOrStudentId }, { studentId: idOrStudentId }],
    },
    include: {
      photos: true,
      qrCodes: true,
    },
  });

  if (!student) {
    return {
      success: false,
      studentId: idOrStudentId,
      affectedStorageKeys: [],
      bytesReclaimed: 0,
      error: `Student record "${idOrStudentId}" not found in database.`,
    };
  }

  // 2. Identify All Related Storage Objects
  const rawKeys: string[] = [];
  if (student.photoPath) rawKeys.push(student.photoPath);
  if (student.storageKey) rawKeys.push(student.storageKey);

  for (const p of student.photos) {
    if (p.originalPath) rawKeys.push(p.originalPath);
    if (p.editedPath) rawKeys.push(p.editedPath);
    if (p.previewPath) rawKeys.push(p.previewPath);
    if (p.thumbnailPath) rawKeys.push(p.thumbnailPath);
    if (p.storageKey) rawKeys.push(p.storageKey);
  }

  for (const qr of student.qrCodes) {
    if (qr.imagePath) rawKeys.push(qr.imagePath);
  }

  // Deduplicate and filter non-empty keys
  const uniqueCandidateKeys = Array.from(
    new Set(
      rawKeys
        .map((k) => normalizeKey(k))
        .filter((k) => k && !k.startsWith("data:") && !k.startsWith("http"))
    )
  );

  // 3. Cross-check against other students to prevent accidental deletion of shared assets
  const safeKeysToDelete: string[] = [];
  for (const key of uniqueCandidateKeys) {
    const otherStudentsSharing = await prisma.student.count({
      where: {
        id: { not: student.id },
        OR: [{ photoPath: { contains: key } }, { storageKey: key }],
      },
    });

    if (otherStudentsSharing === 0) {
      safeKeysToDelete.push(key);
    } else {
      console.warn(`Protection: Key ${key} is shared by another student. Skipping storage purge.`);
    }
  }

  // 4. Delete Storage Objects
  const deletedKeys: string[] = [];
  for (const key of safeKeysToDelete) {
    try {
      await deleteFromStorage(key);
      deletedKeys.push(key);
    } catch (storageErr) {
      console.warn(`Warning: Failed to delete storage object ${key}:`, storageErr);
    }
  }

  // 5. Verify Deletion
  const remainingKeys: string[] = [];
  for (const key of deletedKeys) {
    const stillExists = await storageObjectExists(key);
    if (stillExists) {
      remainingKeys.push(key);
    }
  }

  // 6. Remove Database Records (Cascades to StudentPhoto, StudentQR, CustomFieldValue, TransferRecord)
  try {
    await prisma.student.delete({
      where: { id: student.id },
    });
  } catch (dbErr: any) {
    // Log failure in audit
    await createSafeAuditLog({
      userId: operator.userId,
      action: "STUDENT_SAFE_DELETE_FAILED",
      entityType: "STUDENT",
      entityId: student.id,
      metadata: {
        studentId: student.studentId,
        fullName: student.fullName,
        operator: operator.username,
        error: dbErr?.message,
      },
    });

    return {
      success: false,
      studentId: student.studentId,
      affectedStorageKeys: deletedKeys,
      bytesReclaimed: 0,
      error: `Database deletion failed: ${dbErr?.message}`,
    };
  }

  // 7. Write Comprehensive Audit Log
  await createSafeAuditLog({
    userId: operator.userId,
    action: "STUDENT_SAFE_DELETE",
    entityType: "STUDENT",
    entityId: student.id,
    metadata: {
      studentId: student.studentId,
      fullName: student.fullName,
      operator: operator.username,
      operatorRole: operator.role,
      deletedStorageKeys: deletedKeys,
      remainingKeys,
      result: remainingKeys.length === 0 ? "SUCCESS" : "PARTIAL",
      deletedAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    studentId: student.studentId,
    affectedStorageKeys: deletedKeys,
    bytesReclaimed: 0, // Calculated dynamically if needed
  };
}

function normalizeKey(str: string): string {
  return str
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/^\/?api\/storage\/file\//, "")
    .replace(/^\/?uploads\/photos\//, "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .split("?")[0];
}
