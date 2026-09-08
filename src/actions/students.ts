"use server";

// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE STUDENT MANAGEMENT SERVER ACTIONS
// Scaled for 20,000+ records with server-side pagination, multi-filtering,
// dynamic custom fields, and real-time duplicate detection.
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { createSafeAuditLog } from "@/lib/audit";
import {
  studentSchema,
  customFieldSchema,
  type StudentFormInput,
  type CustomFieldInput,
} from "@/lib/validations";
import { publishStudentSync, rehydrateDatabaseFromCloud } from "@/lib/sync-engine";

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
    const bloodType = data.bloodType?.trim() || null;
    const emailAddress = data.emailAddress?.trim() || null;
    const address = data.address?.trim() || null;
    const school = data.school?.trim() || null;
    const department = data.department?.trim() || null;
    const academicYear = data.academicYear?.trim() || null;
    const dateOfBirth = data.dateOfBirth || null;

    // Strict Requirement: QR codes are NEVER generated internally.
    // QR codes are imported as external image assets exclusively by the Receiver.
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
        photoPath: data.photoPath || null,
        qrCodeData: null, // Populated exclusively when Receiver imports external QR images
        status: data.status,
        batchId: data.batchId || null,
      },
    });

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
  if (input.bloodType !== undefined) updatePayload.bloodType = input.bloodType;
  if (input.emailAddress !== undefined) updatePayload.emailAddress = input.emailAddress;
  if (input.photoPath !== undefined) updatePayload.photoPath = input.photoPath;
  if (input.dateOfBirth !== undefined) updatePayload.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
  if (input.status) updatePayload.status = input.status;
  if (input.batchId !== undefined) updatePayload.batchId = input.batchId;

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

  await createSafeAuditLog({
    userId: session.userId,
    action: "STUDENT_UPDATE",
    entityType: "STUDENT",
    entityId: updated.id,
    metadata: { changedFields: Object.keys(input) },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return { success: true, studentId: updated.id };
}

/**
 * Permanently deletes a student record safely across ephemeral containers and database engines.
 */
export async function deleteStudentAction(
  idOrStudentId: string,
  optionalStudentId?: string
): Promise<StudentActionResult> {
  try {
    const session = await requireAuth("student:delete");

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

    const targetStudentId = student?.studentId || optionalStudentId || idOrStudentId;
    const targetDbId = student?.id || idOrStudentId;

    if (student) {
      // 1. Delete dependent child records first to satisfy foreign key constraints
      await prisma.customFieldValue.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.studentPhoto.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.studentQR.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.transferRecord.deleteMany({ where: { studentId: student.id } }).catch(() => {});

      // 2. Delete student record
      await prisma.student.delete({
        where: { id: student.id },
      }).catch((e) => {
        console.warn("Prisma student delete warning:", e);
      });

      await createSafeAuditLog({
        userId: session.userId,
        action: "STUDENT_DELETE",
        entityType: "STUDENT",
        entityId: student.id,
        metadata: { studentId: student.studentId, name: student.fullName },
      });
    }

    // Always broadcast deletion to Cloud Sync Bus so all other devices and containers drop it
    if (targetStudentId) {
      await publishStudentSync("DELETE", targetStudentId).catch(() => {});
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");
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
  } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

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
    const session = await requireAuth();

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
  ids: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireAuth("student:delete");
    let count = 0;

    for (const id of ids) {
      const res = await deleteStudentAction(id);
      if (res.success) count++;
    }

    revalidatePath("/students");
    revalidatePath("/dashboard");
    return { success: true, count };
  } catch (error: any) {
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

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = students.map((s) => [
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
      escapeCSV(s.bloodType || ""),
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
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    return { success: true, csv: csvContent };
  } catch (error: any) {
    console.error("exportStudentsCSVAction error:", error);
    return { success: false, error: error?.message || "Failed to export students." };
  }
}

