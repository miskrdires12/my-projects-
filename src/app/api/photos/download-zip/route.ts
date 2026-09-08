// ============================================================================
// STUDENT BRIDGE — STREAMING LOCAL PHOTO ZIP DOWNLOAD ENGINE
//
// SCALABILITY DESIGN (20,000+ students):
// - NEVER loads all students into memory at once
// - Processes in chunks of 500 via cursor-based pagination
// - Streams ZIP bytes directly to client — no temp file needed
// - Archiver pipes through PassThrough stream to Web ReadableStream
//
// FILE NAMING RULES (Requirement 9, 33):
// - Primary: Student's real legal name → "Miskr Dires.jpg"
// - Duplicate: Disambiguate with Student ID → "Miskr Dires - STU001.jpg"
// - Illegal filesystem chars sanitized (e.g. "/" → " - ")
// - Database name NEVER modified
//
// FOLDER STRUCTURES (Requirement 10):
// - flat         → "Miskr Dires.jpg"
// - by-grade     → "Grade_10/Miskr Dires.jpg"
// - by-batch     → "Batch_2026_001/Miskr Dires.jpg"
// - by-department→ "Dept_Science/Miskr Dires.jpg"
// - custom       → "{grade}/{department}/Miskr Dires.jpg"
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as archiverModule from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";
import { generateSafePhotoFilename } from "@/lib/image-processing";

// Factory for creating ZipArchive compatible with both legacy and archiver v8
function createZipArchive(options: Record<string, unknown> = { zlib: { level: 5 } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = archiverModule;
  if (typeof mod === "function") {
    return mod("zip", options);
  }
  if (typeof mod.default === "function") {
    return mod.default("zip", options);
  }
  if (mod.ZipArchive) {
    return new mod.ZipArchive(options);
  }
  if (mod.default?.ZipArchive) {
    return new mod.default.ZipArchive(options);
  }
  throw new Error("Could not find a valid archiver zip constructor");
}

const CHUNK_SIZE = 500; // Process 500 students per DB cursor page

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      studentIds,
      batchId,
      grade,
      department,
      folderStructure = "by-grade",
      customPattern,
    } = body;

    // Build base where clause — only students with photos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      photoPath: { not: null },
    };

    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      where.id = { in: studentIds };
    } else {
      if (batchId && batchId !== "ALL") where.batchId = batchId;
      if (grade && grade !== "ALL") where.grade = grade;
      if (department && department !== "ALL") where.department = department;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 1: Count total and build duplicate-name index
    // We need a full pass over names to know which names repeat.
    // Use a lightweight select (id, fullName, studentId only) in chunks.
    // ──────────────────────────────────────────────────────────────────────
    const totalCount = await prisma.student.count({ where });

    if (totalCount === 0) {
      return NextResponse.json(
        { error: "No student photographs found matching the specified scope." },
        { status: 404 }
      );
    }

    // Build name→count map in chunks to avoid loading all 20k records
    const nameOccurrences = new Map<string, number>();
    let cursor: string | undefined;

    while (true) {
      const nameChunk = await prisma.student.findMany({
        where,
        select: { id: true, fullName: true },
        take: CHUNK_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
      });

      if (nameChunk.length === 0) break;

      for (const s of nameChunk) {
        const key = s.fullName.trim().toLowerCase();
        nameOccurrences.set(key, (nameOccurrences.get(key) || 0) + 1);
      }

      if (nameChunk.length < CHUNK_SIZE) break;
      cursor = nameChunk[nameChunk.length - 1].id;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 2: Set up streaming archiver
    // ──────────────────────────────────────────────────────────────────────
    const archive = createZipArchive({
      zlib: { level: 5 }, // Level 5: good balance of speed vs. compression
    });

    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    const publicDir = path.join(process.cwd(), "public");

    const sanitizeDir = (str?: string | null) =>
      (str || "Unknown")
        .replace(/[/\\]/g, "_")
        .replace(/[:*?"<>|]/g, "")
        .trim()
        .replace(/\s+/g, "_");

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 3: Process students in chunks and add to archive
    // Uses cursor-based pagination — never loads all 20k at once
    // ──────────────────────────────────────────────────────────────────────
    (async () => {
      try {
        let photoCursor: string | undefined;

        while (true) {
          const chunk = await prisma.student.findMany({
            where,
            select: {
              id: true,
              studentId: true,
              fullName: true,
              grade: true,
              department: true,
              photoPath: true,
              batch: { select: { batchNumber: true } },
            },
            take: CHUNK_SIZE,
            ...(photoCursor ? { cursor: { id: photoCursor }, skip: 1 } : {}),
            orderBy: { id: "asc" },
          });

          if (chunk.length === 0) break;

          for (const s of chunk) {
            if (!s.photoPath) continue;

            const relativeClean = s.photoPath.replace(/^\//, "");
            const absolutePhotoPath = path.join(publicDir, relativeClean);

            if (!fs.existsSync(absolutePhotoPath)) continue;

            // Determine duplicate status from name index
            const isDup =
              (nameOccurrences.get(s.fullName.trim().toLowerCase()) || 0) > 1;

            // File extension from stored photo
            const ext =
              path.extname(absolutePhotoPath).replace(".", "").toLowerCase() ||
              "jpg";

            // Generate safe real-name filename
            const safeFilename = generateSafePhotoFilename(
              s.fullName,
              s.studentId,
              isDup,
              ext
            );

            // Determine folder prefix based on chosen structure
            let folderPrefix = "";
            switch (folderStructure) {
              case "by-grade":
                folderPrefix = `Grade_${sanitizeDir(s.grade)}/`;
                break;
              case "by-batch":
                folderPrefix = `Batch_${sanitizeDir(
                  s.batch?.batchNumber || "Unassigned"
                )}/`;
                break;
              case "by-department":
                folderPrefix = `Dept_${sanitizeDir(
                  s.department || "General"
                )}/`;
                break;
              case "custom":
                if (customPattern) {
                  folderPrefix =
                    customPattern
                      .replace("{grade}", sanitizeDir(s.grade))
                      .replace("{department}", sanitizeDir(s.department))
                      .replace("{batch}", sanitizeDir(s.batch?.batchNumber))
                      .replace(/\/+$/, "") + "/";
                }
                break;
              case "flat":
              default:
                folderPrefix = "";
                break;
            }

            archive.file(absolutePhotoPath, {
              name: `${folderPrefix}${safeFilename}`,
            });
          }

          if (chunk.length < CHUNK_SIZE) break;
          photoCursor = chunk[chunk.length - 1].id;
        }

        await archive.finalize();
      } catch {
        archive.abort();
      }
    })();

    // ──────────────────────────────────────────────────────────────────────
    // PHASE 4: Stream ZIP response to client
    // ──────────────────────────────────────────────────────────────────────
    const webStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const scopeLabel =
      grade && grade !== "ALL"
        ? `Grade_${grade.replace(/\s+/g, "_")}`
        : department && department !== "ALL"
        ? `Dept_${department.replace(/\s+/g, "_")}`
        : batchId && batchId !== "ALL"
        ? "Batch"
        : "All";

    const zipFilename = `Student_Photos_${scopeLabel}_${timestamp}.zip`;

    // Audit log the download
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "PHOTOS_DOWNLOAD_ZIP",
          entityType: "STUDENT_BATCH",
          metadata: JSON.stringify({
            totalCount,
            folderStructure,
            scope: { grade, batchId, department },
          }),
        },
      });
    } catch {
      // Non-fatal audit failure
    }

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "no-store",
        "X-Total-Photos": String(totalCount),
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate ZIP archive.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
