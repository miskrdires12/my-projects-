// ============================================================================
// STUDENT BRIDGE — PHOTO UPLOAD & DUAL STORAGE (ORIGINAL + EDITED) API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processAndSaveStudentPhoto } from "@/lib/image-processing";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // 1. Enforce authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SENDER and ADMIN are authorized to upload student photos
  if (session.role !== "SENDER" && session.role !== "ADMIN" && session.role !== "RECEIVER") {
    return NextResponse.json(
      { error: "Forbidden: SENDER, RECEIVER, or ADMIN role required" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const originalFile = formData.get("originalFile");
    const studentId = formData.get("studentId") as string | null;
    const cropData = formData.get("cropData") as string | null;
    const filterData = formData.get("filterData") as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No edited/primary image file provided in request payload." },
        { status: 400 }
      );
    }

    const editedBuffer = Buffer.from(await file.arrayBuffer());
    const editedMime = file.type || "image/jpeg";
    const editedResult = await processAndSaveStudentPhoto(editedBuffer, editedMime, "edited");

    let originalResult = editedResult;
    if (originalFile && originalFile instanceof Blob) {
      const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
      const originalMime = originalFile.type || "image/jpeg";
      originalResult = await processAndSaveStudentPhoto(originalBuffer, originalMime, "original");
    }

    let photoRecord = null;
    if (studentId) {
      try {
        const student = await prisma.student.findUnique({
          where: { studentId },
        });

        if (student) {
          photoRecord = await prisma.studentPhoto.create({
            data: {
              studentId: student.id,
              originalPath: originalResult.relativePath,
              editedPath: editedResult.relativePath,
              width: editedResult.width,
              height: editedResult.height,
              cropData: cropData || null,
              filterData: filterData || null,
              status: "EDITED",
            },
          });

          await prisma.student.update({
            where: { id: student.id },
            data: { photoPath: editedResult.relativePath },
          });
        }
      } catch (dbErr) {
        console.warn("Notice: Non-fatal student photo association warning:", dbErr);
      }
    }

    return NextResponse.json(
      {
        relativePath: editedResult.relativePath,
        originalPath: originalResult.relativePath,
        fileName: editedResult.fileName,
        width: editedResult.width,
        height: editedResult.height,
        photoId: photoRecord?.id ?? null,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Critical upload route failure:", err);
    const message = err instanceof Error ? err.message : "Failed to process photo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
