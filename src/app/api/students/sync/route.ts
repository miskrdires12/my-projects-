import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  fetchCloudStudents,
  publishStudentSync,
  rehydrateDatabaseFromCloud,
} from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

/**
 * GET: Rehydrates cold Lambda container and returns all active synchronized students.
 */
export async function GET() {
  try {
    // 1. Check local database
    let dbStudents = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. If container has 0 students, pull from Cloud Sync
    if (dbStudents.length === 0) {
      await rehydrateDatabaseFromCloud();
      dbStudents = await prisma.student.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    // 3. Merge with any fresh cloud students
    const cloudStudents = await fetchCloudStudents();
    const map = new Map<string, any>();
    cloudStudents.forEach((s) => map.set(s.studentId, s));
    dbStudents.forEach((s) => map.set(s.studentId, s));

    const finalStudents = Array.from(map.values());
    return NextResponse.json({
      success: true,
      students: finalStudents,
      totalCount: finalStudents.length,
    });
  } catch (err: any) {
    console.error("Student sync GET error:", err);
    return NextResponse.json({ error: err.message, students: [] }, { status: 500 });
  }
}

/**
 * POST: Ingests students from client, upserts to SQLite, and broadcasts to Cloud Sync.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let syncedCount = 0;

    for (const s of students) {
      if (!s.studentId || !s.fullName) continue;

      try {
        await prisma.student.upsert({
          where: { studentId: s.studentId },
          update: {
            fullName: s.fullName,
            phone: s.phone || "N/A",
            sex: s.sex || "Male",
            grade: s.grade || "General",
            school: s.school || "",
            department: s.department || "",
            academicYear: s.academicYear || "",
            photoPath: s.photoPath || null,
            qrCodeData: s.qrCodeData || `STUDENT:${s.studentId}`,
            status: s.status || "ACTIVE",
          },
          create: {
            studentId: s.studentId,
            fullName: s.fullName,
            phone: s.phone || "N/A",
            sex: s.sex || "Male",
            grade: s.grade || "General",
            school: s.school || "",
            department: s.department || "",
            academicYear: s.academicYear || "",
            photoPath: s.photoPath || null,
            qrCodeData: s.qrCodeData || `STUDENT:${s.studentId}`,
            status: s.status || "ACTIVE",
          },
        });

        // Broadcast to Global Cloud Sync Bus
        publishStudentSync("UPSERT", s).catch(() => {});
        syncedCount++;
      } catch (upsertErr) {
        console.warn(`Sync upsert failed for student ${s.studentId}:`, upsertErr);
      }
    }

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (err: any) {
    console.error("Student sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Deletes student by ID or studentId and broadcasts deletion.
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const studentId = searchParams.get("studentId");
    const clearAll = searchParams.get("clearAll") === "true";

    if (clearAll) {
      await prisma.customFieldValue.deleteMany().catch(() => {});
      await prisma.studentPhoto.deleteMany().catch(() => {});
      await prisma.studentQR.deleteMany().catch(() => {});
      await prisma.transferRecord.deleteMany().catch(() => {});
      await prisma.student.deleteMany().catch(() => {});
      await prisma.transferBatch.deleteMany().catch(() => {});
      await publishStudentSync("CLEAR").catch(() => {});
      return NextResponse.json({ success: true, cleared: true });
    }

    const target = studentId || id;
    if (!target) {
      return NextResponse.json({ error: "Missing id or studentId" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(id ? [{ id }] : []),
          ...(studentId ? [{ studentId }] : []),
        ],
      },
    });

    if (student) {
      await prisma.customFieldValue.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.studentPhoto.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.studentQR.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.transferRecord.deleteMany({ where: { studentId: student.id } }).catch(() => {});
      await prisma.student.delete({ where: { id: student.id } }).catch(() => {});
    }

    await publishStudentSync("DELETE", {
      id: student?.id || id || "",
      studentId: student?.studentId || studentId || target,
    }).catch(() => {});

    return NextResponse.json({ success: true, deleted: target });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
