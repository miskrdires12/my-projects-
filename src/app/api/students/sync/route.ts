import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
