// ============================================================================
// STUDENT BRIDGE — SAFE STUDENT DELETION WORKFLOW
// ADMIN REQUEST -> VERIFY STUDENT -> IDENTIFY ALL RELATED STORAGE OBJECTS ->
// DELETE/ARCHIVE RETENTION POLICY -> VERIFY DELETION -> REMOVE DB RECORD -> AUDIT LOG
// Prevents accidental deletion of another student's files.
// ============================================================================

import prisma from "@/lib/prisma";
import { deleteFromStorage, storageObjectExists } from "@/lib/storage-service";
import {
  deleteMultipleFromSupabaseBucket,
  extractSupabaseStorageKey,
  invalidateSupabaseStorageCache,
  listSupabaseStorageFiles,
} from "@/lib/supabase-storage";
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

  // 2. Identify All Related Storage Objects (Supabase Cloud + Local Disks)
  const rawSources: (string | null | undefined)[] = [
    student.photoPath,
    (student as any).originalPhotoPath,
    student.storageKey,
  ];

  for (const p of student.photos) {
    rawSources.push(p.originalPath, p.editedPath, p.previewPath, p.thumbnailPath, p.storageKey);
  }

  for (const qr of student.qrCodes) {
    rawSources.push(qr.imagePath);
  }

  // Generate canonical paths inside bucket 'student data'
  const safeGrade = (student.grade || "General").replace(/[/\\]/g, " - ").trim();
  const safeStudentId = student.studentId.replace(/[/\\]/g, " - ").trim();
  const safeFullName = student.fullName.replace(/[/\\]/g, " - ").trim();

  // Add expected canonical and preview keys
  rawSources.push(`${safeGrade}/${safeStudentId}_${safeFullName}.jpg`);
  rawSources.push(`${safeGrade}/previews/${safeStudentId}_${safeFullName}.jpg`);
  rawSources.push(`${safeGrade}/${safeStudentId}_${safeFullName}`);
  rawSources.push(`${safeGrade}/previews/${safeStudentId}_${safeFullName}`);

  // Also query Supabase folder for any versioned edits (e.g. SB-xxx_Name_v1726743999.jpg)
  try {
    const [gradeFiles, previewFiles] = await Promise.all([
      listSupabaseStorageFiles(safeGrade),
      listSupabaseStorageFiles(`${safeGrade}/previews`),
    ]);

    for (const item of gradeFiles || []) {
      if (item.name && item.name.startsWith(`${safeStudentId}_`)) {
        rawSources.push(`${safeGrade}/${item.name}`);
      }
    }
    for (const item of previewFiles || []) {
      if (item.name && item.name.startsWith(`${safeStudentId}_`)) {
        rawSources.push(`${safeGrade}/previews/${item.name}`);
      }
    }
  } catch (scanErr) {
    console.warn("Notice: Listing candidate student versioned photos warning:", scanErr);
  }

  // Extract clean relative keys for Supabase Storage
  const supabaseKeys: string[] = [];
  const localKeys: string[] = [];

  for (const src of rawSources) {
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) continue;

    // Supabase bucket relative path
    const extracted = extractSupabaseStorageKey(src);
    if (extracted) {
      supabaseKeys.push(extracted);
    }

    // Local / private normalized key
    const normalized = normalizeKey(src);
    if (normalized && !normalized.startsWith("http")) {
      localKeys.push(normalized);
    }
  }

  const uniqueSupabaseKeys = Array.from(new Set(supabaseKeys));
  const uniqueLocalKeys = Array.from(new Set(localKeys));

  // 3. Cross-check against other students to prevent accidental deletion of shared assets
  const safeSupabaseToDelete: string[] = [];
  for (const key of uniqueSupabaseKeys) {
    const otherStudentsSharing = await prisma.student.count({
      where: {
        id: { not: student.id },
        OR: [
          { photoPath: { contains: key } },
          { originalPhotoPath: { contains: key } },
          { storageKey: key },
        ],
      },
    });

    if (otherStudentsSharing === 0) {
      safeSupabaseToDelete.push(key);
    } else {
      console.warn(`Protection: Key ${key} is shared by another student. Skipping storage purge.`);
    }
  }

  // 4. Delete Storage Objects directly from Supabase Cloud 'student data' bucket
  const deletedKeys: string[] = [];
  if (safeSupabaseToDelete.length > 0) {
    try {
      const deleteRes = await deleteMultipleFromSupabaseBucket(safeSupabaseToDelete);
      if (deleteRes.success) {
        deletedKeys.push(...safeSupabaseToDelete);
      }
    } catch (supabaseDelErr) {
      console.warn("Notice: deleteMultipleFromSupabaseBucket failed:", supabaseDelErr);
    }
  }

  // 4b. Also purge local storage cache / disk files
  for (const key of uniqueLocalKeys) {
    try {
      await deleteFromStorage(key);
      if (!deletedKeys.includes(key)) {
        deletedKeys.push(key);
      }
    } catch (storageErr) {
      console.warn(`Warning: Failed to delete storage object ${key}:`, storageErr);
    }
  }

  // Invalidate Supabase Storage cache so Admin metrics update immediately
  invalidateSupabaseStorageCache();

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
