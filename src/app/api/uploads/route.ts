// ============================================================================
// STUDENT BRIDGE — PHOTO UPLOAD & DUAL STORAGE (ORIGINAL + EDITED) API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processAndSaveStudentPhoto } from "@/lib/image-processing";
import prisma from "@/lib/prisma";
import { publishStudentSync } from "@/lib/sync-engine";

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

          const updatedStudent = await prisma.student.update({
            where: { id: student.id },
            data: { photoPath: editedResult.relativePath },
          });

          // Broadcast updated photo to receiver in real-time
          publishStudentSync("UPSERT", {
            id: updatedStudent.id,
            studentId: updatedStudent.studentId,
            fullName: updatedStudent.fullName,
            phone: updatedStudent.phone,
            sex: updatedStudent.sex,
            grade: updatedStudent.grade,
            school: updatedStudent.school,
            department: updatedStudent.department,
            academicYear: updatedStudent.academicYear,
            photoPath: updatedStudent.photoPath,
            qrCodeData: updatedStudent.qrCodeData || `STUDENT:${updatedStudent.studentId}`,
            status: updatedStudent.status,
            createdAt: updatedStudent.createdAt.toISOString(),
            updatedAt: updatedStudent.updatedAt.toISOString(),
          }).catch(() => {});
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

/**
 * Direct Image Link Generator & Photo Resolver
 * Returns the student's portrait directly as an image binary or redirects to photo path.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const fileParam = searchParams.get("file");

  try {
    let photoPath: string | null = null;

    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          OR: [{ studentId }, { id: studentId }],
        },
        select: { photoPath: true, fullName: true, studentId: true },
      });
      photoPath = student?.photoPath || null;
    } else if (fileParam) {
      photoPath = fileParam;
    }

    if (!photoPath) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Handle base64 Data URIs directly
    if (photoPath.startsWith("data:image/")) {
      const parts = photoPath.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      const buffer = Buffer.from(parts[1], "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // Handle local file system storage
    const cleanRel = photoPath.split("?")[0].replace(/^\//, "");
    const fs = await import("fs");
    const path = await import("path");
    const fullPath = path.join(process.cwd(), "public", cleanRel);

    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    // Handle remote external URL redirect
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
      return NextResponse.redirect(photoPath);
    }

    return NextResponse.json({ photoPath, status: "READY" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to resolve photo" }, { status: 500 });
  }
}

