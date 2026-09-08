"use server";

// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE STUDENT MANAGEMENT SERVER ACTIONS
// Scaled for 20,000+ records with server-side pagination, multi-filtering,
// dynamic custom fields, and real-time duplicate detection.
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  studentSchema,
  customFieldSchema,
  type StudentFormInput,
  type CustomFieldInput,
} from "@/lib/validations";

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

  // Gracefully fallback all non-essential fields to sensible defaults
  const nationalId = data.nationalId?.trim() || null;
  const rollNumber = data.rollNumber?.trim() || data.studentId;
  const contactName = data.contactName?.trim() || data.fullName;
  const cityRegion = data.cityRegion?.trim() || "General";
  const emergencyContactName = data.emergencyContactName?.trim() || data.fullName;
  const emergencyContactPhone = data.emergencyContactPhone?.trim() || data.phone;
  const guardianFullName = data.guardianFullName?.trim() || data.fullName;
  const nationality = data.nationality?.trim() || "Citizen";

  // Strict Requirement: QR codes are NEVER generated internally.
  // QR codes are imported as external image assets exclusively by the Receiver.
  const student = await prisma.student.create({
    data: {
      studentId: data.studentId,
      fullName: data.fullName,
      contactName,
      grade: data.grade,
      sex: data.sex,
      phone: data.phone,
      cityRegion,
      emergencyContactName,
      emergencyContactPhone,
      bloodType: data.bloodType || null,
      emailAddress: data.emailAddress || null,
      address: data.address || null,
      school: data.school || null,
      department: data.department || null,
      academicYear: data.academicYear || null,
      guardianFullName,
      rollNumber,
      nationality,
      nationalId,
      dateOfBirth: data.dateOfBirth || null,
      photoPath: data.photoPath || null,
      qrCodeData: null, // Populated exclusively when Receiver imports external QR images
      status: data.status,
      batchId: data.batchId || null,
    },
  });

  // Save custom field values if provided
  if (data.customFields && Object.keys(data.customFields).length > 0) {
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
  }

  // Record audit log
  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "STUDENT_CREATE",
      entityType: "STUDENT",
      entityId: student.id,
      metadata: JSON.stringify({ studentId: student.studentId, fullName: student.fullName }),
    },
  });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/sender/batches");
  return { success: true, studentId: student.id };
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

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "STUDENT_UPDATE",
      entityType: "STUDENT",
      entityId: updated.id,
      metadata: JSON.stringify({ changedFields: Object.keys(input) }),
    },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/dashboard");
  return { success: true, studentId: updated.id };
}

/**
 * Permanently deletes a student record.
 */
export async function deleteStudentAction(id: string): Promise<StudentActionResult> {
  const session = await requireAuth("student:delete");

  const student = await prisma.student.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "STUDENT_DELETE",
      entityType: "STUDENT",
      entityId: student.id,
      metadata: JSON.stringify({ studentId: student.studentId, name: student.fullName }),
    },
  });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: true };
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

  const [totalCount, students] = await Promise.all([
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

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "CUSTOM_FIELD_CREATE",
      entityType: "CUSTOM_FIELD",
      entityId: field.id,
      metadata: JSON.stringify(validated.data),
    },
  });

  revalidatePath("/register");
  revalidatePath("/students");
  revalidatePath("/settings");
  return { success: true, field };
}

export async function deleteCustomFieldAction(id: string) {
  const session = await requireAuth("settings:update");

  await prisma.customField.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "CUSTOM_FIELD_DELETE",
      entityType: "CUSTOM_FIELD",
      entityId: id,
    },
  });

  revalidatePath("/register");
  revalidatePath("/students");
  return { success: true };
}

/**
 * Purges all student data and batches so user can feed fresh data.
 */
export async function clearAllStudentsAction() {
  const session = await requireAuth();

  const count = await prisma.student.count();
  await prisma.student.deleteMany();
  await prisma.transferBatch.deleteMany();

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "PURGE_ALL_STUDENTS",
      entityType: "STUDENT",
      metadata: JSON.stringify({ deletedCount: count }),
    },
  });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/print-engine");
  return { success: true, count };
}

