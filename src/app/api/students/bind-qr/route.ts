import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publishStudentSync } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/students/bind-qr
 * Dedicated high-speed endpoint for Android APK (StudentCore) to bind or replace a student's QR code.
 * Non-destructive: preserves all existing photos, previews, and sender attributions.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, qrCodeData, school } = body;

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

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Student with ID ${studentId} not found` },
        { status: 404 }
      );
    }

    const updatePayload: any = {
      qrCodeData: qrCodeData.trim(),
    };

    if (school && typeof school === "string" && school.trim().length > 0) {
      updatePayload.school = school.trim();
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
      qrCodeBound: true,
    });
  } catch (err: any) {
    console.error("Bind QR error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to bind QR code" },
      { status: 500 }
    );
  }
}
