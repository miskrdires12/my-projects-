// ============================================================================
// STUDENT BRIDGE — PHOTO UPLOAD & MULTI-TIER PRIVATE STORAGE API
// Generates Thumbnail, Preview, and Original tiers in private storage.
// Enforces signed URLs, sets photo integrity status, and links metadata.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { processAndStoreMultiTierPhoto } from "@/lib/storage-service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // 1. Enforce authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SENDER, RECEIVER, and ADMIN are authorized to upload student photos
  if (session.role !== "SENDER" && session.role !== "ADMIN" && session.role !== "RECEIVER") {
    return NextResponse.json(
      { error: "Forbidden: SENDER, RECEIVER, or ADMIN role required" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const studentId = formData.get("studentId") as string | null;
    const cropData = formData.get("cropData") as string | null;
    const filterData = formData.get("filterData") as string | null;

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No image file provided in request payload." },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const effectiveStudentId = studentId || `unassigned_${Date.now()}`;

    // Process all 3 tiers (thumbnail, preview, original) into private storage
    const multiTier = await processAndStoreMultiTierPhoto(inputBuffer, effectiveStudentId);

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
              originalPath: multiTier.originalKey,
              editedPath: multiTier.previewKey,
              previewPath: multiTier.previewKey,
              thumbnailPath: multiTier.thumbnailKey,
              storageKey: multiTier.previewKey,
              fileSizeBytes: multiTier.fileSizeBytes,
              width: multiTier.width,
              height: multiTier.height,
              cropData: cropData || null,
              filterData: filterData || null,
              status: "EDITED",
              integrityStatus: "PHOTO_VERIFIED",
            },
          });

          await prisma.student.update({
            where: { id: student.id },
            data: {
              photoPath: multiTier.previewUrl, // Serve signed preview URL for display
              storageKey: multiTier.previewKey,
              photoIntegrityStatus: "PHOTO_VERIFIED",
              storageSyncAt: new Date(),
            },
          });
        }
      } catch (dbErr) {
        console.warn("Notice: Non-fatal student photo association warning:", dbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        storageKey: multiTier.storageKey,
        previewUrl: multiTier.previewUrl,
        thumbnailUrl: multiTier.thumbnailUrl,
        originalUrl: multiTier.originalUrl,
        // Backwards compatibility with previous field names
        relativePath: multiTier.previewUrl,
        originalPath: multiTier.originalUrl,
        fileName: multiTier.previewKey.split("/").pop(),
        width: multiTier.width,
        height: multiTier.height,
        photoId: photoRecord?.id ?? null,
        photoIntegrityStatus: "PHOTO_VERIFIED",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Critical upload route failure:", err);
    const message = err instanceof Error ? err.message : "Failed to process photo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
