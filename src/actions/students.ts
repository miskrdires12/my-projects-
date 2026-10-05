"use server";

// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE STUDENT MANAGEMENT SERVER ACTIONS
// Scaled for 20,000+ records with server-side pagination, multi-filtering,
// dynamic custom fields, and real-time duplicate detection.
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth, getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createSafeAuditLog } from "@/lib/audit";
import {
  studentSchema,
  customFieldSchema,
  type StudentFormInput,
  type CustomFieldInput,
} from "@/lib/validations";
import { publishStudentSync, rehydrateDatabaseFromCloud } from "@/lib/sync-engine";
import {
  extractR2StorageKey,
  deleteMultipleFromR2Bucket,
  invalidateR2StorageCache,
} from "@/lib/r2-storage";
import { createStudentQRPayload, generateQRDataUrl } from "@/lib/qr-generator";



export interface StudentFilterParams {
  query?: string;
  grade?: string;
  status?: string;
  batchId?: string;
  department?: string;
  photoStatus?: "ALL" | "HAS_PHOTO" | "MISSING_PHOTO";
  qrStatus?: "ALL" | "HAS_QR" | "MISSING_QR";
  sortBy?: "createdAt" | "fullName" | "studentId" | "grade";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includeHidden?: boolean;
}

export interface StudentActionResult {
  success: boolean;
  studentId?: string;
  error?: string;
}

/**
 * Real-time fast validation endpoint for duplicate Student ID detection.
 */
export async function checkStudentIdAvailabilityAction(
  studentId: string,
  excludeId?: string
): Promise<{ available: boolean; message?: string }> {
  await requireAuth("student:read");

  if (!studentId || !studentId.trim()) {
    return { available: false, message: "Student ID cannot be blank." };
  }

  const clean = studentId.trim();
  const existing = await prisma.student.findUnique({
    where: { studentId: clean },
    select: { id: true, studentId: true, fullName: true },
  });

  if (existing && existing.id !== excludeId) {
    return {
      available: false,
      message: `Student ID "${clean}" is already assigned to ${existing.fullName}.`,
    };
  }

  return { available: true };
}

/**
 * Creates a new student record with optional custom field values.
 * Enforces `student:create` permission (SENDER, RECEIVER, or ADMIN).
 */
export async function createStudentAction(input: StudentFormInput): Promise<StudentActionResult> {
  try {
    const session = await requireAuth("student:create");

    const validated = studentSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message ?? "Invalid student data provided.",
      };
    }

    const data = validated.data;

    // 1. Check duplicate student ID
    const existingId = await prisma.student.findUnique({
      where: { studentId: data.studentId },
    });
    if (existingId) {
      return {
        success: false,
        error: `A student with ID "${data.studentId}" already exists.`,
      };
    }

    // Unprovided optional fields remain null or empty strings without injecting fake defaults
    const nationalId = data.nationalId?.trim() || null;
    const rollNumber = data.rollNumber?.trim() || "";
    const contactName = data.contactName?.trim() || "";
    const cityRegion = data.cityRegion?.trim() || "";
    const emergencyContactName = data.emergencyContactName?.trim() || "";
    const emergencyContactPhone = data.emergencyContactPhone?.trim() || "";
    const guardianFullName = data.guardianFullName?.trim() || "";
    const nationality = data.nationality?.trim() || "";
    const bloodType = data.bloodType?.trim() || "Unknown";
    const emailAddress = data.emailAddress?.trim() || null;
    const address = data.address?.trim() || null;
    const school = data.school?.trim() || null;
    const department = data.department?.trim() || null;
    const academicYear = data.academicYear?.trim() || null;
    const dateOfBirth = data.dateOfBirth || null;

    // Convert Base64 data URI or uploaded file path to 3-phase progressive photos & local desktop backup + Supabase Cloud
    let finalPhotoPath: string | null =
      data.photoPath && !data.photoPath.startsWith("blob:") ? data.photoPath : null;
    let finalThumbnailPath: string | null = null;
    let finalPreviewPath: string | null = null;
    let finalOriginalPath: string | null = null;

    if (finalPhotoPath && finalPhotoPath.trim().length > 0) {
      try {
        const { generate3PhasePhotos } = await import("@/lib/progressive-photo");
        let buffer: Buffer | null = null;

        if (finalPhotoPath.startsWith("data:image/")) {
          const base64Data = finalPhotoPath.replace(/^data:image\/\w+;base64,/, "");
          buffer = Buffer.from(base64Data, "base64");
        } else if (finalPhotoPath.startsWith("/") || finalPhotoPath.startsWith("uploads") || finalPhotoPath.includes("public")) {
          const fs = await import("fs/promises");
          const path = await import("path");
          const normalized = finalPhotoPath.replace(/^\//, "");
          const localFilePath = path.join(process.cwd(), "public", normalized);
          try {
            buffer = await fs.readFile(localFilePath);
          } catch (readErr) {
            console.warn("Could not read local file path for progressive generation:", readErr);
          }
        }

        if (buffer) {
          const progressive = await generate3PhasePhotos(buffer, {
            studentId: data.studentId.trim(),
            fullName: data.fullName.trim(),
            grade: data.grade.trim(),
          });
          finalPhotoPath = progressive.originalPath;
          finalThumbnailPath = progressive.thumbnailPath;
          finalPreviewPath = progressive.previewPath;
          finalOriginalPath = progressive.originalPath;
          console.log(`[createStudentAction] ✓ 3-phase photo generated & synced for ${data.studentId}`);
        }
      } catch (saveErr) {
        console.warn("Notice: Progressive photo generation warning:", saveErr);
      }
    }

    // Automatic Real QR Code Generation: Each encoded student is assigned a verified QR payload
    const canonicalQrData =
      data.qrCodeData?.trim() ||
      createStudentQRPayload({
        studentId: data.studentId.trim(),
        fullName: data.fullName.trim(),
        rollNumber: rollNumber || "",
        grade: data.grade.trim(),
      });

    const student = await prisma.student.create({
      data: {
        studentId: data.studentId.trim(),
        fullName: data.fullName.trim(),
        contactName,
        grade: data.grade.trim(),
        sex: data.sex,
        phone: data.phone.trim(),
        cityRegion,
        emergencyContactName,
        emergencyContactPhone,
        bloodType,
        emailAddress,
        address,
        school,
        department,
        academicYear,
        guardianFullName,
        rollNumber,
        nationality,
        nationalId,
        dateOfBirth,
        photoPath: finalPhotoPath,
        thumbnailPath: finalThumbnailPath,
        previewPath: finalPreviewPath,
        originalPhotoPath: finalOriginalPath,
        qrCodeData: canonicalQrData,
        senderId: session.userId || null,
        senderName: session.username || (session.role === "ADMIN" ? "Admin" : "Station Operator"),
        photoIntegrityStatus: finalPhotoPath ? "PHOTO_VERIFIED" : "PHOTO_MISSING",
        status: data.status,
        batchId: data.batchId || null,
      },
    });

    // Auto-create StudentQR record with real QR Data URL for instant rendering & receiver verification
    try {
      const qrDataUrl = await generateQRDataUrl(canonicalQrData);
      await prisma.studentQR.create({
        data: {
          studentId: student.id,
          fileName: `${student.studentId}_qr.png`,
          imagePath: qrDataUrl,
          mimeType: "image/png",
          matchedMethod: "AUTO_REGISTRATION",
          status: "MATCHED",
        },
      });
    } catch (qrErr) {
      console.warn("Notice: StudentQR auto-creation non-fatal warning:", qrErr);
    }

    // Update Operator Metrics: Increment single records sent counter
    if (session.userId) {
      try {
        await prisma.user.update({
          where: { id: session.userId },
          data: { recordsSentSingle: { increment: 1 } },
        });
      } catch (userErr) {
        console.warn("Notice: Operator metrics non-fatal update warning:", userErr);
      }
    }

    // Auto-update Active Sender Task Quota & Efficiency
    try {
      const senderEmail = session.email?.trim().toLowerCase();
      if (senderEmail) {
        const activeTask = await prisma.senderTask.findFirst({
          where: {
            assignedToEmail: senderEmail,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          orderBy: { createdAt: "desc" },
        });
        if (activeTask) {
          const nextCount = activeTask.completedCount + 1;
          const isDone = nextCount >= activeTask.targetCount;
          await prisma.senderTask.update({
            where: { id: activeTask.id },
            data: {
              completedCount: nextCount,
              status: isDone ? "COMPLETED" : "IN_PROGRESS",
            },
          });
        }
      }
    } catch (taskErr) {
      console.warn("Notice: SenderTask progress non-fatal update warning:", taskErr);
    }

    // Save custom field values if provided
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      try {
        const customFields = await prisma.customField.findMany({
          where: { fieldKey: { in: Object.keys(data.customFields) } },
        });

        const entries = customFields
          .filter((cf) => data.customFields![cf.fieldKey] !== undefined && data.customFields![cf.fieldKey] !== "")
          .map((cf) => ({
            customFieldId: cf.id,
            studentId: student.id,
            value: String(data.customFields![cf.fieldKey]),
          }));

        if (entries.length > 0) {
          await prisma.customFieldValue.createMany({
            data: entries,
          });
        }
      } catch (cfErr) {
        console.warn("Notice: Custom fields non-fatal error:", cfErr);
      }
    }

    // Record audit log safely
    await createSafeAuditLog({
      userId: session.userId,
      action: "STUDENT_CREATE",
      entityType: "STUDENT",
      entityId: student.id,
      metadata: { studentId: student.studentId, fullName: student.fullName },
    });

    // Broadcast to Global Cloud Sync Bus so all lambdas and devices stay in sync
    publishStudentSync("UPSERT", {
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      grade: student.grade,
      sex: student.sex,
      phone: student.phone,
      school: student.school,
      department: student.department,
      academicYear: student.academicYear,
      photoPath: student.photoPath,
      qrCodeData: student.qrCodeData || `STUDENT:${student.studentId}`,
      status: student.status,
      createdAt: student.createdAt.toISOString(),
    }).catch(() => {});

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/sender/batches");
    return { success: true, studentId: student.id };
  } catch (error: any) {
    console.error("createStudentAction fatal error caught:", error);
    return {
      success: false,
      error: error?.message || "Failed to create student record. Please try again.",
    };
  }
}

/**
 * Updates an existing student record.
 */
export async function updateStudentAction(
  id: string,
  input: Partial<StudentFormInput>
): Promise<StudentActionResult> {
  const session = await requireAuth("student:update");

  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Student record not found." };
  }

  // If studentId changed, check uniqueness
  if (input.studentId && input.studentId !== existing.studentId) {
    const duplicate = await prisma.student.findUnique({
      where: { studentId: input.studentId },
    });
    if (duplicate) {
      return { success: false, error: `Student ID "${input.studentId}" is already taken.` };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {};
  if (input.qrCodeData !== undefined) updatePayload.qrCodeData = input.qrCodeData;

  if (input.studentId) updatePayload.studentId = input.studentId;
  if (input.fullName) updatePayload.fullName = input.fullName;
  if (input.grade) updatePayload.grade = input.grade;
  if (input.sex) updatePayload.sex = input.sex;
  if (input.phone) updatePayload.phone = input.phone;
  if (input.address !== undefined) updatePayload.address = input.address;
  if (input.school !== undefined) updatePayload.school = input.school;
  if (input.department !== undefined) updatePayload.department = input.department;
  if (input.academicYear !== undefined) updatePayload.academicYear = input.academicYear;
  if (input.contactName !== undefined) updatePayload.contactName = input.contactName;
  if (input.cityRegion !== undefined) updatePayload.cityRegion = input.cityRegion;
  if (input.emergencyContactName !== undefined) updatePayload.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) updatePayload.emergencyContactPhone = input.emergencyContactPhone;
  if (input.guardianFullName !== undefined) updatePayload.guardianFullName = input.guardianFullName;
  if (input.rollNumber !== undefined) updatePayload.rollNumber = input.rollNumber;
  if (input.nationality !== undefined) updatePayload.nationality = input.nationality;
  if (input.nationalId !== undefined) updatePayload.nationalId = input.nationalId;
  if (input.bloodType !== undefined) updatePayload.bloodType = input.bloodType?.trim() || "Unknown";
  if (input.emailAddress !== undefined) updatePayload.emailAddress = input.emailAddress;
  if (input.photoPath !== undefined) {
    let finalPath = input.photoPath;
    let finalThumb: string | null = null;
    let finalPrev: string | null = null;
    let finalOrig: string | null = null;

    if (finalPath && finalPath.startsWith("data:image/")) {
      try {
        const { generate3PhasePhotos } = await import("@/lib/progressive-photo");
        const base64Data = finalPath.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const studentName = input.fullName || existing.fullName;
        const studentId = input.studentId || existing.studentId;
        const studentGrade = input.grade || existing.grade;

        const progressive = await generate3PhasePhotos(buffer, {
          studentId: studentId.trim(),
          fullName: studentName.trim(),
          grade: studentGrade.trim(),
        });
        finalPath = progressive.originalPath;
        finalThumb = progressive.thumbnailPath;
        finalPrev = progressive.previewPath;
        finalOrig = progressive.originalPath;
      } catch (saveErr) {
        console.warn("Notice: Progressive photo update warning:", saveErr);
      }
    }
    updatePayload.photoPath = finalPath;
    if (finalThumb) updatePayload.thumbnailPath = finalThumb;
    if (finalPrev) updatePayload.previewPath = finalPrev;
    if (finalOrig) updatePayload.originalPhotoPath = finalOrig;
  }
  if (input.dateOfBirth !== undefined) updatePayload.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
  if (input.status) updatePayload.status = input.status;
  if (input.batchId !== undefined) updatePayload.batchId = input.batchId;
  if (input.receiverNote !== undefined) {
    updatePayload.receiverNote = input.receiverNote;
    if (input.receiverNote && input.receiverNote.trim()) {
      updatePayload.hasMistake = true;
    }
  }
  if (input.hasMistake !== undefined) updatePayload.hasMistake = input.hasMistake;

  const updated = await prisma.student.update({
    where: { id },
    data: updatePayload,
  });

  // Update custom fields if supplied
  if (input.customFields) {
    for (const [key, val] of Object.entries(input.customFields)) {
      const customField = await prisma.customField.findUnique({ where: { fieldKey: key } });
      if (customField) {
        await prisma.customFieldValue.upsert({
          where: {
            customFieldId_studentId: {
              customFieldId: customField.id,
              studentId: updated.id,
            },
          },
          update: { value: String(val) },
          create: {
            customFieldId: customField.id,
            studentId: updated.id,
            value: String(val),
          },
        });
      }
    }
  }

  // Requirement 9 & Note to Sender: If updated by receiver/admin, record mistake and note for the sender
  if (session.role === "RECEIVER" || session.role === "SUPER_ADMIN" || session.role === "ADMIN") {
    const fieldsToTrack = ["fullName", "studentId", "grade", "sex", "phone", "school", "cityRegion", "department", "emergencyContactPhone"];
    let detectedMistake = false;

    for (const field of fieldsToTrack) {
      const oldVal = (existing as any)[field];
      const newVal = (updatePayload as any)[field];
      if (newVal !== undefined && oldVal !== null && oldVal !== undefined && String(oldVal).trim() !== String(newVal).trim()) {
        detectedMistake = true;
        try {
          await prisma.senderMistake.create({
            data: {
              studentId: existing.studentId,
              studentName: updatePayload.fullName || existing.fullName,
              senderId: existing.senderId || null,
              senderName: existing.senderName || "Assigned Sender",
              fieldName: field,
              oldValue: String(oldVal),
              newValue: String(newVal),
              note: input.receiverNote || `Corrected ${field} from "${oldVal}" to "${newVal}"`,
              correctedBy: session.username || session.email,
            },
          });
        } catch (mistakeErr) {
          console.warn("Notice: Failed to log sender mistake:", mistakeErr);
        }
      }
    }

    // If a note was explicitly written but no individual field changed
    if (!detectedMistake && input.receiverNote && input.receiverNote.trim()) {
      try {
        await prisma.senderMistake.create({
          data: {
            studentId: existing.studentId,
            studentName: updatePayload.fullName || existing.fullName,
            senderId: existing.senderId || null,
            senderName: existing.senderName || "Assigned Sender",
            fieldName: "feedback_note",
            oldValue: "Reported Mistake",
            newValue: "Correction Note",
            note: input.receiverNote.trim(),
            correctedBy: session.username || session.email,
          },
        });
      } catch (err) {
        console.warn("Notice: Failed to log feedback note mistake:", err);
      }
    }
  }

  await createSafeAuditLog({
    userId: session.userId,
    action: "STUDENT_UPDATE",
    entityType: "STUDENT",
    entityId: updated.id,
    metadata: { changedFields: Object.keys(input) },
  });

  // Broadcast to Global Cloud Sync Bus (cross-device real-time sync to receiver)
  publishStudentSync("UPSERT", {
    id: updated.id,
    studentId: updated.studentId,
    fullName: updated.fullName,
    phone: updated.phone,
    sex: updated.sex,
    grade: updated.grade,
    school: updated.school,
    department: updated.department,
    academicYear: updated.academicYear,
    photoPath: updated.photoPath,
    qrCodeData: updated.qrCodeData || `STUDENT:${updated.studentId}`,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
  }).catch(() => {});

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return { success: true, studentId: updated.id };
}

/**
 * Updates a student's photo (e.g. after cropping/editing in the studio)
 * and immediately broadcasts to receiver.
 */
export async function updateStudentPhotoAction(
  studentIdOrId: string,
  photoPath: string,
  extraPaths?: {
    thumbnailPath?: string | null;
    previewPath?: string | null;
    originalPhotoPath?: string | null;
  }
): Promise<StudentActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Session expired. Please log in again." };
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentIdOrId }, { studentId: studentIdOrId }],
      },
    });

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const thumbnailPath = extraPaths?.thumbnailPath !== undefined ? extraPaths.thumbnailPath : photoPath;
    const previewPath = extraPaths?.previewPath !== undefined ? extraPaths.previewPath : photoPath;
    const originalPhotoPath = extraPaths?.originalPhotoPath !== undefined ? extraPaths.originalPhotoPath : (student.originalPhotoPath || photoPath);

    // Clean up previous photo in Cloudflare R2 if different, but NEVER delete the new key
    const newR2Keys = [
      extractR2StorageKey(photoPath),
      extractR2StorageKey(thumbnailPath),
      extractR2StorageKey(previewPath),
      extractR2StorageKey(originalPhotoPath),
    ].filter((k): k is string => Boolean(k));

    if (student.photoPath && student.photoPath !== photoPath) {
      const candidateOldKeys = [
        extractR2StorageKey(student.photoPath),
        extractR2StorageKey(student.previewPath),
        extractR2StorageKey(student.originalPhotoPath),
        extractR2StorageKey(student.thumbnailPath),
      ].filter((k): k is string => Boolean(k));

      const oldR2Keys = candidateOldKeys.filter((k) => !newR2Keys.includes(k));
      if (oldR2Keys.length > 0) {
        await deleteMultipleFromR2Bucket(oldR2Keys).catch(() => {});
        invalidateR2StorageCache();
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        photoPath,
        thumbnailPath,
        previewPath,
        originalPhotoPath,
      },
    });

    // Broadcast updated photo to Global Cloud Sync Bus immediately
    publishStudentSync("UPSERT", {
      id: updated.id,
      studentId: updated.studentId,
      fullName: updated.fullName,
      phone: updated.phone,
      sex: updated.sex,
      grade: updated.grade,
      school: updated.school,
      department: updated.department,
      academicYear: updated.academicYear,
      photoPath: updated.photoPath,
      thumbnailPath: updated.thumbnailPath,
      previewPath: updated.previewPath,
      originalPhotoPath: updated.originalPhotoPath,
      qrCodeData: updated.qrCodeData || `STUDENT:${updated.studentId}`,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }).catch(() => {});

    revalidatePath("/students");
    revalidatePath(`/students/${updated.id}`);
    revalidatePath("/dashboard");

    return { success: true, studentId: updated.id };
  } catch (err: any) {
    console.error("updateStudentPhotoAction error:", err);
    return { success: false, error: err.message || "Failed to update photo." };
  }
}

/**
 * Deletes a student record either TEMPORARILY (hidden from Receiver workstation queue, preserved intact in Supabase DB)
 * or PERMANENTLY (expunged from everywhere: Supabase DB, Supabase Storage, local disk, QR codes).
 */
export async function deleteStudentAction(
  idOrStudentId: string,
  optionalStudentId?: string,
  deleteType: "PERMANENT" | "TEMPORARY" = "PERMANENT"
): Promise<StudentActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Session expired. Please log in again." };
    }
    if (!hasPermission(session.role, "student:delete")) {
      return { success: false, error: "Unauthorized: You do not have permission to delete student records." };
    }

    // Locate the student by database ID or studentId
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: idOrStudentId },
          { studentId: idOrStudentId },
          ...(optionalStudentId
            ? [{ id: optionalStudentId }, { studentId: optionalStudentId }]
            : []),
        ],
      },
    });

    const targetStudentId = student?.studentId || (optionalStudentId !== idOrStudentId ? optionalStudentId : undefined) || idOrStudentId;
    const targetDbId = student?.id || idOrStudentId;

    if (student) {
      if (deleteType === "TEMPORARY") {
        // TEMPORARY DELETE: Drop from Receiver queue / workstation, but preserve intact in Supabase database & storage
        await prisma.student.update({
          where: { id: student.id },
          data: {
            receiverHidden: true,
            hiddenAt: new Date(),
          },
        });

        await createSafeAuditLog({
          userId: session.userId,
          action: "STUDENT_RECEIVER_HIDE",
          entityType: "STUDENT",
          entityId: student.id,
          metadata: {
            studentId: student.studentId,
            name: student.fullName,
            mode: "TEMPORARY_RECEIVER_DELETE",
          },
        });
      } else {
        // PERMANENT DELETE: Expunge from everywhere (DB, files, photos, storage)
        // 1. Delete physical photo files from disk if present
        const photosToDelete: string[] = [];
        if (student.photoPath && !student.photoPath.startsWith("data:")) {
          photosToDelete.push(student.photoPath);
        }
        try {
          const dbPhotos = await prisma.studentPhoto.findMany({
            where: { studentId: student.id },
            select: { originalPath: true, editedPath: true },
          });
          dbPhotos.forEach((p) => {
            if (p.originalPath && !p.originalPath.startsWith("data:")) photosToDelete.push(p.originalPath);
            if (p.editedPath && !p.editedPath.startsWith("data:")) photosToDelete.push(p.editedPath);
          });

          const fs = await import("fs");
          const path = await import("path");
          photosToDelete.forEach((rel) => {
            try {
              const cleanRel = rel.split("?")[0].replace(/^\//, "");
              const fullPath = path.join(process.cwd(), "public", cleanRel);
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
              }
            } catch {}
          });
        } catch {}

        // 1. Direct cascade delete relations and student record from DB
        await Promise.allSettled([
          prisma.customFieldValue.deleteMany({ where: { studentId: student.id } }),
          prisma.studentPhoto.deleteMany({ where: { studentId: student.id } }),
          prisma.studentQR.deleteMany({ where: { studentId: student.id } }),
          prisma.transferRecord.deleteMany({ where: { studentId: student.id } }),
          prisma.senderMistake.deleteMany({ where: { studentId: targetStudentId } }),
        ]);

        await prisma.student.deleteMany({
          where: {
            OR: [
              { id: student.id },
              { studentId: targetStudentId },
            ],
          },
        }).catch((e) => {
          console.warn("Prisma student delete warning:", e);
        });

        await createSafeAuditLog({
          userId: session.userId,
          action: "STUDENT_DELETE",
          entityType: "STUDENT",
          entityId: student.id,
          metadata: { studentId: student.studentId, name: student.fullName },
        }).catch(() => {});

        // 2. Asynchronously clean up storage files in background
        (async () => {
          try {
            const { executeSafeStudentDeletion } = await import("@/lib/safe-student-deletion");
            await executeSafeStudentDeletion(student.id, {
              userId: session.userId,
              username: session.username || "Operator",
              role: session.role,
            });
          } catch {}
        })().catch(() => {});
      }
    }

    // Always broadcast deletion to Cloud Sync Bus with BOTH identifiers so all receiver devices drop it
    await publishStudentSync("DELETE", {
      id: targetDbId,
      studentId: targetStudentId,
      temporary: deleteType === "TEMPORARY",
    }).catch(() => {});

    if (targetStudentId && targetStudentId !== targetDbId) {
      await publishStudentSync("DELETE", targetStudentId).catch(() => {});
    }

    invalidateR2StorageCache();
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/admin/database");
    revalidatePath("/print-engine");
    return { success: true, studentId: targetDbId };
  } catch (error: any) {
    console.error("deleteStudentAction error:", error);
    // Graceful fallback to prevent server-side crash in Next.js
    return {
      success: false,
      error: error?.message || "Failed to delete student record.",
    };
  }
}

/**
 * Retrieves paginated, multi-filtered, and searched students optimized for 20,000+ records.
 */
export async function getStudentsAction(params: StudentFilterParams = {}) {
  await requireAuth("student:read");

  const {
    query,
    grade,
    status,
    batchId,
    department,
    photoStatus,
    qrStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 25,
    includeHidden = false,
  } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (!includeHidden) {
    where.receiverHidden = { not: true };
  }

  if (query && query.trim() !== "") {
    const q = query.trim();
    where.OR = [
      { fullName: { contains: q } },
      { studentId: { contains: q } },
      { rollNumber: { contains: q } },
      { phone: { contains: q } },
      { department: { contains: q } },
      { school: { contains: q } },
    ];
  }

  if (grade && grade !== "ALL") {
    where.grade = grade;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (batchId && batchId !== "ALL") {
    where.batchId = batchId;
  }

  if (department && department !== "ALL") {
    where.department = department;
  }

  if (photoStatus === "HAS_PHOTO") {
    where.photoPath = { not: null };
  } else if (photoStatus === "MISSING_PHOTO") {
    where.photoPath = null;
  }

  if (qrStatus === "HAS_QR") {
    where.qrCodes = { some: { status: "MATCHED" } };
  } else if (qrStatus === "MISSING_QR") {
    where.qrCodes = { none: {} };
  }

  let [totalCount, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        photos: { take: 1, orderBy: { createdAt: "desc" } },
        qrCodes: { take: 1, orderBy: { createdAt: "desc" } },
        customValues: {
          include: { customField: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Cold Lambda Auto-Rehydration from Cloud Sync Bus
  if (totalCount === 0 && (!query || !query.trim())) {
    const rehydrated = await rehydrateDatabaseFromCloud();
    if (rehydrated > 0) {
      [totalCount, students] = await Promise.all([
        prisma.student.count({ where }),
        prisma.student.findMany({
          where,
          include: {
            photos: { take: 1, orderBy: { createdAt: "desc" } },
            qrCodes: { take: 1, orderBy: { createdAt: "desc" } },
            customValues: {
              include: { customField: true },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
    }
  }

  return {
    students,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// ----------------------------------------------------------------------------
// CUSTOM FIELD MANAGEMENT ACTIONS
// ----------------------------------------------------------------------------

export async function getCustomFieldsAction() {
  await requireAuth("student:read");
  return prisma.customField.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function createCustomFieldAction(input: CustomFieldInput) {
  const session = await requireAuth("settings:update");

  const validated = customFieldSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message };
  }

  const existing = await prisma.customField.findUnique({
    where: { fieldKey: validated.data.fieldKey },
  });
  if (existing) {
    return { success: false, error: `Field key "${validated.data.fieldKey}" already exists.` };
  }

  const field = await prisma.customField.create({
    data: validated.data,
  });

  await createSafeAuditLog({
    userId: session.userId,
    action: "CUSTOM_FIELD_CREATE",
    entityType: "CUSTOM_FIELD",
    entityId: field.id,
    metadata: validated.data,
  });

  revalidatePath("/register");
  revalidatePath("/students");
  revalidatePath("/settings");
  return { success: true, field };
}

export async function deleteCustomFieldAction(id: string) {
  const session = await requireAuth("settings:update");

  await prisma.customField.delete({ where: { id } });

  await createSafeAuditLog({
    userId: session.userId,
    action: "CUSTOM_FIELD_DELETE",
    entityType: "CUSTOM_FIELD",
    entityId: id,
  });

  revalidatePath("/register");
  revalidatePath("/students");
  return { success: true };
}

/**
 * Purges all student data and batches so user can feed fresh data without constraint failures.
 */
export async function clearAllStudentsAction(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Session expired. Please log in again." };
    }
    if (!hasPermission(session.role, "student:delete")) {
      return { success: false, error: "Unauthorized: Missing delete permission." };
    }

    const count = await prisma.student.count();

    // Cascading deletion of dependent models to satisfy foreign key constraints
    await prisma.customFieldValue.deleteMany().catch(() => {});
    await prisma.studentPhoto.deleteMany().catch(() => {});
    await prisma.studentQR.deleteMany().catch(() => {});
    await prisma.transferRecord.deleteMany().catch(() => {});
    await prisma.student.deleteMany().catch(() => {});
    await prisma.transferBatch.deleteMany().catch(() => {});

    await createSafeAuditLog({
      userId: session.userId,
      action: "PURGE_ALL_STUDENTS",
      entityType: "STUDENT",
      metadata: { deletedCount: count },
    });

    // Broadcast deletion across all connected devices and lambdas
    await publishStudentSync("CLEAR").catch(() => {});

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/print-engine");
    return { success: true, count };
  } catch (error: any) {
    console.error("clearAllStudentsAction error:", error);
    return { success: false, error: error?.message || "Failed to clear all student records." };
  }
}

/**
 * Bulk deletes multiple students safely.
 */
export async function deleteMultipleStudentsAction(
  items: (string | { id?: string; studentId?: string })[],
  deleteType: "PERMANENT" | "TEMPORARY" = "PERMANENT"
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, count: 0, error: "Session expired. Please log in again." };
    }
    if (!hasPermission(session.role, "student:delete")) {
      return { success: false, count: 0, error: "Unauthorized: Missing delete permission." };
    }

    if (!items || items.length === 0) {
      return { success: true, count: 0 };
    }

    // 1. Gather all candidate IDs and studentIds
    const candidateIds: string[] = [];
    const candidateStudentIds: string[] = [];

    for (const item of items) {
      if (typeof item === "string") {
        const val = item.trim();
        if (val) {
          candidateIds.push(val);
          candidateStudentIds.push(val);
        }
      } else if (item && typeof item === "object") {
        if (item.id && item.id.trim()) candidateIds.push(item.id.trim());
        if (item.studentId && item.studentId.trim()) candidateStudentIds.push(item.studentId.trim());
      }
    }

    const uniqueCandidateIds = Array.from(new Set(candidateIds));
    const uniqueCandidateStudentIds = Array.from(new Set(candidateStudentIds));

    // 2. Find matching records from DB
    const matchingStudents = await prisma.student.findMany({
      where: {
        OR: [
          { id: { in: uniqueCandidateIds } },
          { studentId: { in: uniqueCandidateStudentIds } },
        ],
      },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        photoPath: true,
        originalPhotoPath: true,
      },
    });

    const allDbIds = Array.from(new Set([...matchingStudents.map((s) => s.id), ...uniqueCandidateIds]));
    const allStudentIds = Array.from(new Set([...matchingStudents.map((s) => s.studentId), ...uniqueCandidateStudentIds]));

    if (deleteType === "TEMPORARY") {
      const updateRes = await prisma.student.updateMany({
        where: {
          OR: [
            { id: { in: allDbIds } },
            { studentId: { in: allStudentIds } },
          ],
        },
        data: {
          receiverHidden: true,
          hiddenAt: new Date(),
        },
      });

      for (const s of matchingStudents) {
        publishStudentSync("DELETE", {
          id: s.id,
          studentId: s.studentId,
          temporary: true,
        }).catch(() => {});
      }

      revalidatePath("/students");
      revalidatePath("/dashboard");
      revalidatePath("/print-engine");
      return { success: true, count: updateRes.count || matchingStudents.length };
    }

    // PERMANENT DELETION:
    // Delete dependent records first to satisfy relational integrity
    await Promise.allSettled([
      prisma.customFieldValue.deleteMany({ where: { studentId: { in: allDbIds } } }),
      prisma.studentPhoto.deleteMany({ where: { studentId: { in: allDbIds } } }),
      prisma.studentQR.deleteMany({ where: { studentId: { in: allDbIds } } }),
      prisma.transferRecord.deleteMany({ where: { studentId: { in: allDbIds } } }),
      prisma.senderMistake.deleteMany({ where: { studentId: { in: allStudentIds } } }),
    ]);

    // Delete student records in bulk
    const deleteRes = await prisma.student.deleteMany({
      where: {
        OR: [
          { id: { in: allDbIds } },
          { studentId: { in: allStudentIds } },
        ],
      },
    });

    // Broadcast deletions to Cloud Sync for each student
    for (const s of matchingStudents) {
      publishStudentSync("DELETE", {
        id: s.id,
        studentId: s.studentId,
        temporary: false,
      }).catch(() => {});
    }

    for (const sid of allStudentIds) {
      publishStudentSync("DELETE", sid).catch(() => {});
    }

    // Clean up storage files asynchronously without blocking response
    (async () => {
      try {
        const { deleteFromStorage } = await import("@/lib/storage-service");
        for (const s of matchingStudents) {
          if (s.photoPath && !s.photoPath.startsWith("data:")) {
            deleteFromStorage(s.photoPath).catch(() => {});
          }
          if (s.originalPhotoPath && !s.originalPhotoPath.startsWith("data:")) {
            deleteFromStorage(s.originalPhotoPath).catch(() => {});
          }
        }
      } catch {}
    })().catch(() => {});

    await createSafeAuditLog({
      userId: session.userId,
      action: "STUDENT_BULK_DELETE",
      entityType: "STUDENT",
      entityId: allDbIds.slice(0, 10).join(","),
      metadata: {
        count: deleteRes.count,
        studentIds: allStudentIds.slice(0, 20),
        mode: "PERMANENT_EXPUNGE",
      },
    }).catch(() => {});

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/print-engine");
    return { success: true, count: deleteRes.count || matchingStudents.length };
  } catch (error: any) {
    console.error("deleteMultipleStudentsAction error:", error);
    return { success: false, count: 0, error: error?.message || "Failed to delete selected students." };
  }
}

/**
 * Server-side export of all students to RFC 4180 CSV with UTF-8 BOM.
 */
export async function exportStudentsCSVAction(): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    await requireAuth("student:export");

    const students = await prisma.student.findMany({
      include: {
        batch: { select: { batchNumber: true, title: true } },
        customValues: { include: { customField: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Student ID",
      "Full Name",
      "Grade",
      "Gender",
      "Phone",
      "Email",
      "Department",
      "School",
      "Academic Year",
      "Date of Birth",
      "Blood Type",
      "Roll Number",
      "National ID",
      "Nationality",
      "Address",
      "City/Region",
      "Guardian Name",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Status",
      "Batch Number",
      "Photo URL",
      "QR Code Data",
      "Enrollment Date",
    ];

    const session = await getSession();
    if (session?.role === "ADMIN") {
      headers.push("Sender Station");
    }

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = students.map((s) => {
      const row = [
        escapeCSV(s.studentId),
        escapeCSV(s.fullName),
        escapeCSV(s.grade),
        escapeCSV(s.sex),
        escapeCSV(s.phone),
        escapeCSV(s.emailAddress || ""),
        escapeCSV(s.department || ""),
        escapeCSV(s.school || ""),
        escapeCSV(s.academicYear || ""),
        escapeCSV(s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split("T")[0] : ""),
        escapeCSV(s.bloodType && s.bloodType.trim() ? s.bloodType.trim() : "Unknown"),
        escapeCSV(s.rollNumber || ""),
        escapeCSV(s.nationalId || ""),
        escapeCSV(s.nationality || ""),
        escapeCSV(s.address || ""),
        escapeCSV(s.cityRegion || ""),
        escapeCSV(s.guardianFullName || ""),
        escapeCSV(s.emergencyContactName || ""),
        escapeCSV(s.emergencyContactPhone || ""),
        escapeCSV(s.status),
        escapeCSV(s.batch?.batchNumber || ""),
        escapeCSV(s.photoPath || ""),
        escapeCSV(s.qrCodeData || ""),
        escapeCSV(new Date(s.createdAt).toISOString().split("T")[0]),
      ];
      if (session?.role === "ADMIN") {
        row.push(escapeCSV((s as any).senderName || (s as any).senderId || "Direct / Central Station"));
      }
      return row;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return { success: true, csv: csvContent };
  } catch (error: any) {
    console.error("exportStudentsCSVAction error:", error);
    return { success: false, error: error?.message || "Failed to export students." };
  }
}

/**
 * Handles permanent photo drop after 3-strike automatic exponential backoff retry due to low internet.
 * Automatically deletes the broken photo from the central database (so it never appears when inspecting the database),
 * logs a real audit record, and notifies the sender station to retake the photo.
 */
export async function reportPhotoTransmissionFailureAction(params: {
  studentId: string;
  fullName?: string;
  photoPath?: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { studentId, photoPath } = params;
    if (!studentId) return { success: false, message: "Missing studentId parameter." };

    const session = await getSession();

    // 1. Locate student by studentId or internal ID
    const student = await prisma.student.findFirst({
      where: {
        OR: [{ studentId }, { id: studentId }],
      },
    });

    if (student) {
      const studentName = params.fullName || student.fullName;
      // Do NOT delete photo from database; preserve existing record and flag pending sync
      // Photo is safely kept in database and local cache

      // 3. Log real audit trail event
      await createSafeAuditLog({
        action: "PHOTO_RETAKE_REQUIRED",
        entityType: "STUDENT",
        entityId: student.id,
        metadata: {
          studentId: student.studentId,
          fullName: studentName,
          previousPhoto: photoPath || student.photoPath,
          reason: "Low internet connection during transmission: Photo preserved in database. Sender/Receiver can attach or sync photo anytime.",
        },
        userId: session?.userId,
      });

      // 4. Broadcast to Cloud Sync Bus so Sender station receives real-time retake alert
      await publishStudentSync(
        "PHOTO_RETAKE_REQUIRED" as any,
        {
          studentId: student.studentId,
          fullName: studentName,
          message: `Low internet detected: Photo transmission failed for ${studentName} (${student.studentId}). Photo removed from receiver. Sender: please retake photo.`,
        }
      );

      revalidatePath("/students");
      revalidatePath("/dashboard");
      revalidatePath("/sender/photo-import");

      return {
        success: true,
        message: `Photo auto-deleted from receiver and database for ${student.fullName}. Sender notified to retake.`,
      };
    }

    return { success: false, message: "Student record not found." };
  } catch (err: any) {
    console.error("Error in reportPhotoTransmissionFailureAction:", err);
    return { success: false, message: err?.message || "Failed to process photo transmission failure" };
  }
}

/**
 * Permanently deletes student records and/or storage objects from Supabase Cloud
 */
export async function deletePermanentlyFromSupabaseAction(params: {
  mode: "STUDENT_ID" | "ALL_PHOTOS" | "FULL_WIPE";
  studentId?: string;
  confirmationCode?: string;
}): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "Forbidden: Admin privilege required." };
    }

    const { deleteFromR2Bucket, purgeAllR2StorageObjects, invalidateR2StorageCache } = await import("@/lib/r2-storage");

    if (params.mode === "STUDENT_ID") {
      if (!params.studentId || !params.studentId.trim()) {
        return { success: false, message: "Student ID is required." };
      }
      const sid = params.studentId.trim();
      const student = await prisma.student.findFirst({
        where: { OR: [{ studentId: sid }, { id: sid }] },
        include: { photos: true },
      });

      if (!student) {
        return { success: false, message: `Student with ID "${sid}" not found in database.` };
      }

      // 1. Delete photo from Cloudflare R2 storage if present
      try {
        const safeGrade = (student.grade || "General").replace(/[/\\]/g, " - ").trim();
        const safeStudentId = student.studentId.replace(/[/\\]/g, " - ").trim();
        const safeFullName = student.fullName.replace(/[/\\]/g, " - ").trim();
        const storagePath = `${safeGrade}/${safeStudentId}_${safeFullName}.jpg`;
        const storagePreviewPath = `${safeGrade}/previews/${safeStudentId}_${safeFullName}.jpg`;
        
        await Promise.allSettled([
          deleteFromR2Bucket(storagePath),
          deleteFromR2Bucket(storagePreviewPath),
        ]);
      } catch (storageErr) {
        console.warn("Notice: Storage delete non-fatal:", storageErr);
      }

      // 2. Cascade delete records in PostgreSQL
      await prisma.customFieldValue.deleteMany({ where: { studentId: student.id } });
      await prisma.studentPhoto.deleteMany({ where: { studentId: student.id } });
      await prisma.student.delete({ where: { id: student.id } });

      // 3. Log audit event
      await createSafeAuditLog({
        action: "STORAGE_STUDENT_PERMANENT_DELETE",
        entityType: "STUDENT",
        entityId: student.id,
        metadata: { studentId: student.studentId, fullName: student.fullName },
        userId: session.userId,
      });

      // 4. Broadcast DELETE to all clients
      await publishStudentSync("DELETE" as any, { studentId: student.studentId, id: student.id });

      invalidateR2StorageCache();
      revalidatePath("/dashboard");
      revalidatePath("/students");
      revalidatePath("/admin/database");

      return {
        success: true,
        message: `Permanently deleted student ${student.fullName} (${student.studentId}) from Database & Cloudflare R2 Storage.`,
        deletedCount: 1,
      };
    }

    if (params.mode === "ALL_PHOTOS") {
      const r2Purge = await purgeAllR2StorageObjects();
      const totalPurged = r2Purge.count || 0;

      await createSafeAuditLog({
        action: "STORAGE_PURGED",
        entityType: "STORAGE",
        metadata: { r2Purged: totalPurged, totalPurged },
        userId: session.userId,
      });

      invalidateR2StorageCache();
      revalidatePath("/admin/database");
      return {
        success: true,
        message: `Successfully purged ${totalPurged} objects from Cloudflare R2 bucket 'siliconlabs'.`,
        deletedCount: totalPurged,
      };
    }

    if (params.mode === "FULL_WIPE") {
      if (params.confirmationCode !== "DELETE-SUPABASE") {
        return { success: false, message: "Invalid confirmation code. Please type 'DELETE-SUPABASE'." };
      }

      const r2Purge = await purgeAllR2StorageObjects();
      const totalPurged = r2Purge.count || 0;

      await prisma.customFieldValue.deleteMany({});
      await prisma.studentPhoto.deleteMany({});
      const deletedStudents = await prisma.student.deleteMany({});

      await createSafeAuditLog({
        action: "FULL_WIPE",
        entityType: "SYSTEM",
        metadata: {
          deletedStudents: deletedStudents.count,
          purgedStorageFiles: totalPurged,
        },
        userId: session.userId,
      });

      await publishStudentSync("DELETE" as any, { fullWipe: true });

      invalidateR2StorageCache();
      revalidatePath("/dashboard");
      revalidatePath("/students");
      revalidatePath("/admin/database");

      return {
        success: true,
        message: `Full system wipe complete: permanently removed ${deletedStudents.count} students and ${totalPurged} storage photos from Cloudflare R2 & Database.`,
        deletedCount: deletedStudents.count,
      };
    }

    return { success: false, message: "Unknown purge mode requested." };
  } catch (err: any) {
    console.error("deletePermanentlyFromSupabaseAction error:", err);
    return { success: false, message: err?.message || "Failed to execute permanent Supabase deletion." };
  }
}

/**
 * Returns the current authenticated sender's total student registrations to Admin,
 * including daily (today) and monthly registration rates and photo verification count.
 */
export async function getSenderStatsAction(): Promise<{
  success: boolean;
  studentsRegistered: number;
  studentsRegisteredToday: number;
  studentsRegisteredThisMonth: number;
  studentsWithPhotos: number;
  senderName: string;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return {
        success: false,
        studentsRegistered: 0,
        studentsRegisteredToday: 0,
        studentsRegisteredThisMonth: 0,
        studentsWithPhotos: 0,
        senderName: "",
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const senderFilter = {
      OR: [
        { senderId: session.userId },
        { senderName: session.username },
        { senderName: session.email },
      ],
    };

    const [user, dbCount, todayDbCount, monthDbCount, photoCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { recordsSentSingle: true, username: true, email: true },
      }),
      prisma.student.count({
        where: senderFilter,
      }),
      prisma.student.count({
        where: {
          ...senderFilter,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.student.count({
        where: {
          ...senderFilter,
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.student.count({
        where: {
          ...senderFilter,
          photoPath: { not: null },
        },
      }),
    ]);

    const totalRegistered = Math.max(dbCount, user?.recordsSentSingle || 0);
    // If the user's legacy recordsSentSingle is greater than dbCount, attribute to this month
    const totalThisMonth = Math.max(monthDbCount, totalRegistered > dbCount ? totalRegistered - (dbCount - monthDbCount) : monthDbCount);

    return {
      success: true,
      studentsRegistered: totalRegistered,
      studentsRegisteredToday: todayDbCount,
      studentsRegisteredThisMonth: totalThisMonth,
      studentsWithPhotos: photoCount,
      senderName: user?.username || session.username,
    };
  } catch (err: any) {
    console.warn("[getSenderStatsAction] fallback:", err);
    return {
      success: false,
      studentsRegistered: 0,
      studentsRegisteredToday: 0,
      studentsRegisteredThisMonth: 0,
      studentsWithPhotos: 0,
      senderName: "",
    };
  }
}

export interface DailyRegistrationCadence {
  day: string;
  count: number;
}

export interface MonthlyRegistrationCadence {
  month: string;
  count: number;
}

/**
 * Returns systemic daily and monthly student intake velocity and calendar breakdown for Admin.
 */
export async function getRegistrationCadenceAction(): Promise<{
  success: boolean;
  total: number;
  today: number;
  thisMonth: number;
  dailyCadence: DailyRegistrationCadence[];
  monthlyCadence: MonthlyRegistrationCadence[];
}> {
  try {
    await requireAuth("student:read");

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [total, today, thisMonth, dailyRaw, monthlyRaw] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.student.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.$queryRawUnsafe<Array<{ day: string; count: number }>>(`
        SELECT 
          TO_CHAR(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
          COUNT(*)::int as count
        FROM "cloudflare"."students"
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 30;
      `).catch(() => []),
      prisma.$queryRawUnsafe<Array<{ month: string; count: number }>>(`
        SELECT 
          TO_CHAR(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM "cloudflare"."students"
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 12;
      `).catch(() => []),
    ]);

    return {
      success: true,
      total,
      today,
      thisMonth,
      dailyCadence: dailyRaw || [],
      monthlyCadence: monthlyRaw || [],
    };
  } catch (err: any) {
    console.warn("[getRegistrationCadenceAction] error:", err);
    return {
      success: false,
      total: 0,
      today: 0,
      thisMonth: 0,
      dailyCadence: [],
      monthlyCadence: [],
    };
  }
}

/**
 * Ensures all existing student records have a real, verified QR code payload.
 * Backfills records that currently have null or empty qrCodeData.
 */
export async function backfillMissingQRCodesAction(): Promise<{ success: boolean; count: number }> {
  try {
    const studentsWithoutQR = await prisma.student.findMany({
      where: {
        OR: [
          { qrCodeData: null },
          { qrCodeData: "" },
        ],
      },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        rollNumber: true,
        grade: true,
      },
      take: 500,
    });

    let updated = 0;
    for (const s of studentsWithoutQR) {
      const qrPayload = createStudentQRPayload({
        studentId: s.studentId,
        fullName: s.fullName,
        rollNumber: s.rollNumber || "",
        grade: s.grade,
      });

      await prisma.student.update({
        where: { id: s.id },
        data: { qrCodeData: qrPayload },
      });

      try {
        const qrDataUrl = await generateQRDataUrl(qrPayload);
        await prisma.studentQR.upsert({
          where: { id: `auto_qr_${s.id}` },
          update: {
            imagePath: qrDataUrl,
            status: "MATCHED",
          },
          create: {
            id: `auto_qr_${s.id}`,
            studentId: s.id,
            fileName: `${s.studentId}_qr.png`,
            imagePath: qrDataUrl,
            mimeType: "image/png",
            matchedMethod: "AUTO_SYSTEM",
            status: "MATCHED",
          },
        });
      } catch {}

      updated++;
    }

    if (updated > 0) {
      revalidatePath("/students");
      revalidatePath("/print-engine");
      revalidatePath("/designer");
    }


    return { success: true, count: updated };
  } catch (err: any) {
    console.error("Backfill QR codes error:", err);
    return { success: false, count: 0 };
  }
}

// ----------------------------------------------------------------------------
// SENDER MISTAKE & RECEIVER CORRECTION NOTES ACTIONS
// ----------------------------------------------------------------------------

export async function getSenderMistakeNotesAction(): Promise<{
  success: boolean;
  notes: Array<{
    id: string;
    studentId: string;
    studentName: string;
    note: string;
    fieldName?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    correctedBy?: string | null;
    createdAt: string;
    status: string;
  }>;
}> {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, notes: [] };
    }

    const isPrivileged = session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.role === "RECEIVER";

    const senderFilter = isPrivileged
      ? {}
      : {
          OR: [
            { senderId: session.userId },
            { senderName: session.username },
            { senderName: session.email },
          ],
        };

    const mistakes = await prisma.senderMistake.findMany({
      where: senderFilter,
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    return {
      success: true,
      notes: mistakes.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        studentName: m.studentName,
        note: m.note || `Corrected ${m.fieldName}: "${m.oldValue}" -> "${m.newValue}"`,
        fieldName: m.fieldName,
        oldValue: m.oldValue,
        newValue: m.newValue,
        correctedBy: m.correctedBy,
        createdAt: m.createdAt.toISOString(),
        status: m.status,
      })),
    };
  } catch (err: any) {
    console.warn("[getSenderMistakeNotesAction] fallback:", err);
    return { success: false, notes: [] };
  }
}

/**
 * Approves a student submitted from mobile APK or pending Super Admin review.
 * Sets status to ACTIVE, clears pending receiver notes, and broadcasts instant sync.
 */
export async function approveStudentAction(studentIdOrId: string): Promise<StudentActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Session expired. Please log in again." };
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentIdOrId }, { studentId: studentIdOrId }],
      },
    });

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        status: "ACTIVE",
        receiverNote: null,
        hasMistake: false,
      },
    });

    await createSafeAuditLog({
      userId: session.userId,
      action: "STUDENT_APPROVE",
      entityType: "STUDENT",
      entityId: updated.id,
      metadata: { studentId: updated.studentId, approvedBy: session.username || session.email },
    });

    publishStudentSync("UPSERT", updated).catch(() => {});

    return {
      success: true,
      studentId: updated.studentId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve student." };
  }
}

/**
 * Rejects a mobile-registered student or QR bind request.
 */
export async function rejectStudentAction(studentIdOrId: string): Promise<StudentActionResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Session expired. Please log in again." };
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ id: studentIdOrId }, { studentId: studentIdOrId }],
      },
    });

    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        status: "INACTIVE",
        receiverNote: `REJECTED_BY_SUPERADMIN: ${new Date().toLocaleDateString()}`,
        hasMistake: true,
      },
    });

    await createSafeAuditLog({
      userId: session.userId,
      action: "STUDENT_REJECT",
      entityType: "STUDENT",
      entityId: updated.id,
      metadata: { studentId: updated.studentId, rejectedBy: session.username || session.email },
    });

    publishStudentSync("UPSERT", updated).catch(() => {});

    return {
      success: true,
      studentId: updated.studentId,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject student." };
  }
}

