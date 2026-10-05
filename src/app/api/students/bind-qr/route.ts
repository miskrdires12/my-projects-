import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publishStudentSync } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/students/bind-qr
 * High-speed endpoint for Android APK (StudentCore) to bind a student's QR code or register from mobile.
 * Submits records with status: "PENDING_APPROVAL" for Super Admin permission/review.
 * Tokens are strictly protected and never leaked in public API responses.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId,
      qrCodeData,
      school,
      fullName,
      grade,
      phone,
      sex,
      address,
      isNewRegistration,
    } = body;

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required field: studentId" },
        { status: 400 }
      );
    }

    if (!qrCodeData || typeof qrCodeData !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required field: qrCodeData" },
        { status: 400 }
      );
    }

    // Find student
    const existing = await prisma.student.findUnique({
      where: { studentId: studentId.trim() },
    });

    if (existing) {
      const updatePayload: any = {
        qrCodeData: qrCodeData.trim(),
        status: "PENDING_APPROVAL",
        receiverNote: `PENDING_SUPERADMIN_APPROVAL: Mobile QR Linked (${school || existing.school || "Campus"})`,
        hasMistake: false,
      };

      if (school && typeof school === "string" && school.trim().length > 0) {
        updatePayload.school = school.trim();
      }
      if (address && typeof address === "string" && address.trim().length > 0) {
        updatePayload.address = address.trim();
      }

      const updated = await prisma.student.update({
        where: { id: existing.id },
        data: updatePayload,
      });

      // Broadcast update across all devices and web clients
      publishStudentSync("UPSERT", updated).catch(() => {});

      return NextResponse.json({
        success: true,
        studentId: updated.studentId,
        fullName: updated.fullName,
        school: updated.school,
        status: updated.status,
        requiresSuperAdminApproval: true,
        qrCodeBound: true,
      });
    }

    // If student not found but isNewRegistration requested or fullName provided, create student
    if (isNewRegistration || fullName) {
      const created = await prisma.student.create({
        data: {
          studentId: studentId.trim(),
          fullName: (fullName || "Mobile Student").trim(),
          grade: (grade || "General").trim(),
          phone: (phone || "").trim(),
          sex: (sex || "Male").trim(),
          school: school?.trim() || null,
          address: address?.trim() || null,
          qrCodeData: qrCodeData.trim(),
          status: "PENDING_APPROVAL",
          receiverNote: `PENDING_SUPERADMIN_APPROVAL: Mobile Registered Student (${school || "Campus"})`,
          hasMistake: false,
        },
      });

      publishStudentSync("UPSERT", created).catch(() => {});

      return NextResponse.json({
        success: true,
        studentId: created.studentId,
        fullName: created.fullName,
        school: created.school,
        status: created.status,
        requiresSuperAdminApproval: true,
        isNewRegistration: true,
        qrCodeBound: true,
      });
    }

    return NextResponse.json(
      { success: false, error: `Student with ID ${studentId} not found` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Bind QR error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bind QR code" },
      { status: 500 }
    );
  }
}

