// ============================================================================
// STUDENT BRIDGE — DIRECT STUDENT LOOKUP API (FOR STUDENTCORE AND CLIENTS)
// Endpoint: GET /api/students/lookup?studentId=SB-2026-53429
// Public API: No login redirect, returns JSON 200 on success or 404 when not found
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getR2PublicUrl, getR2Client } from "@/lib/r2-storage";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { verifyApkAccess } from "@/lib/apk-control";

export const dynamic = "force-dynamic";

// In-memory cache of R2 student index for ultra-fast lookup (1 hour TTL)
interface R2StudentEntry {
  studentId: string;
  fullName: string;
  grade: string;
  key: string;
}

let r2IndexCache: R2StudentEntry[] | null = null;
let r2IndexCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizeCase(str: string): string {
  return (str || "").trim().toLowerCase();
}

async function getR2StudentIndex(): Promise<R2StudentEntry[]> {
  const now = Date.now();
  if (r2IndexCache && now - r2IndexCacheTimestamp < CACHE_TTL_MS) {
    return r2IndexCache;
  }

  try {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || "siliconlabs";
    let continuationToken: string | undefined = undefined;
    const entries: R2StudentEntry[] = [];

    do {
      const command: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          const key = item.Key || "";
          if (!key || key.includes("/previews/") || !/\.(jpe?g|png)$/i.test(key)) {
            continue;
          }

          // Format: {Grade}/{StudentId}_{FullName}.jpg
          const parts = key.split("/");
          const grade = parts.length > 1 ? parts[0] : "";
          const filename = parts[parts.length - 1];
          const nameNoExt = filename.replace(/\.[^/.]+$/, "");

          // Match SB-2026-XXXXX_Name
          const match = nameNoExt.match(/^(SB-\d{4}-\d+|[A-Z0-9_-]+)_(.+)$/i);
          if (match) {
            entries.push({
              studentId: match[1].trim(),
              fullName: match[2].trim(),
              grade: grade.trim(),
              key,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    if (entries.length > 0) {
      r2IndexCache = entries;
      r2IndexCacheTimestamp = now;
    }

    return entries;
  } catch (err) {
    console.warn("[Lookup API] Error indexing Cloudflare R2 bucket:", err);
    return r2IndexCache || [];
  }
}

// CORS headers for mobile and web clients
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Role, X-School-Selection, X-Client-Type",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolParam = searchParams.get("school")?.trim();

    // 1. Verify Super Admin APK access and school approval
    const authCheck = await verifyApkAccess(request, schoolParam);
    if (!authCheck.allowed) {
      return NextResponse.json(
        { found: false, error: authCheck.error, blocked: true },
        { status: authCheck.status || 403, headers: corsHeaders }
      );
    }

    // Accept studentId, id, q, or query parameter
    let rawQuery = (
      searchParams.get("studentId") ||
      searchParams.get("id") ||
      searchParams.get("q") ||
      searchParams.get("query") ||
      ""
    ).trim();

    if (!rawQuery) {
      return NextResponse.json(
        {
          found: false,
          student: null,
          error: "Missing required parameter 'studentId'",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle JSON payload in QR token (e.g. {"id":"SB-2026-53429",...})
    if (rawQuery.startsWith("{") && rawQuery.endsWith("}")) {
      try {
        const parsed = JSON.parse(rawQuery);
        rawQuery = parsed.id || parsed.studentId || parsed.student_id || rawQuery;
      } catch (_) {}
    }

    // Strip legacy prefixes
    if (rawQuery.toUpperCase().startsWith("STUDENT:")) {
      rawQuery = rawQuery.substring(8).trim();
    } else if (rawQuery.toUpperCase().startsWith("STUDENT-")) {
      const stripped = rawQuery.substring(8).trim();
      if (stripped.length > 0) rawQuery = stripped;
    }

    const searchId = rawQuery.trim();

    // 1. Search Database (Prisma)
    let dbStudent: any = null;
    try {
      dbStudent = await prisma.student.findFirst({
        where: {
          OR: [
            { studentId: { equals: searchId, mode: "insensitive" } },
            { id: { equals: searchId } },
          ],
        },
      });
    } catch (dbErr) {
      console.warn("[Lookup API] Database query notice:", dbErr);
    }

    // 2. If student found in database, format and return
    if (dbStudent) {
      let photoUrl = "";
      if (dbStudent.photoPath) {
        photoUrl = dbStudent.photoPath.startsWith("http")
          ? dbStudent.photoPath
          : getR2PublicUrl(dbStudent.photoPath);
      } else {
        // Fallback: check R2 index for matching photo
        const r2Entries = await getR2StudentIndex();
        const searchNorm = normalizeCase(searchId);
        const searchAlphanum = searchNorm.replace(/[^a-z0-9]/g, "");

        const matchedR2 = r2Entries.find(
          (e) =>
            normalizeCase(e.studentId) === searchNorm ||
            normalizeCase(e.studentId).replace(/[^a-z0-9]/g, "") === searchAlphanum
        );
        if (matchedR2) {
          photoUrl = getR2PublicUrl(matchedR2.key);
        }
      }

      const studentSchool = dbStudent.school || (schoolParam ? schoolParam : "Warka");
      const studentAddress = dbStudent.address || "Addis Ababa";

      return NextResponse.json(
        {
          found: true,
          student: {
            id: dbStudent.studentId,
            studentId: dbStudent.studentId,
            name: dbStudent.fullName,
            fullName: dbStudent.fullName,
            roll: dbStudent.rollNumber || "",
            grade: dbStudent.grade || "",
            section: dbStudent.section || "",
            sex: dbStudent.sex || "",
            gender: dbStudent.sex || "",
            bloodType: dbStudent.bloodType || "",
            school: studentSchool,
            schoolName: studentSchool,
            address: studentAddress,
            cityRegion: studentAddress,
            location: studentAddress,
            parentPhone: dbStudent.emergencyContactPhone || dbStudent.phone || "",
            phone: dbStudent.phone || "",
            emergencyContactPhone: dbStudent.emergencyContactPhone || "",
            emergencyContactName: dbStudent.emergencyContactName || "",
            guardianName: dbStudent.guardianFullName || "",
            photoUrl: photoUrl || "",
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 3. Fallback: Search Cloudflare R2 bucket directly
    const r2Entries = await getR2StudentIndex();
    const searchClean = normalizeCase(searchId).replace(/[^a-z0-9]/g, "");
    const searchNorm = normalizeCase(searchId);

    const matchedR2 = r2Entries.find((entry) => {
      const entryIdClean = normalizeCase(entry.studentId).replace(/[^a-z0-9]/g, "");
      return (
        entryIdClean === searchClean ||
        normalizeCase(entry.studentId) === searchNorm ||
        normalizeCase(entry.key).includes(searchNorm)
      );
    });

    if (matchedR2) {
      const photoUrl = getR2PublicUrl(matchedR2.key);
      const fallbackSchool = schoolParam || "Warka";
      const fallbackAddress = "Addis Ababa";

      // Opportunistically save to database for future queries
      try {
        await prisma.student.upsert({
          where: { studentId: matchedR2.studentId },
          update: {
            fullName: matchedR2.fullName,
            grade: matchedR2.grade || "General",
            photoPath: matchedR2.key,
            school: fallbackSchool,
            address: fallbackAddress,
          },
          create: {
            studentId: matchedR2.studentId,
            fullName: matchedR2.fullName,
            grade: matchedR2.grade || "General",
            sex: "Unspecified",
            phone: "",
            photoPath: matchedR2.key,
            school: fallbackSchool,
            address: fallbackAddress,
            status: "ACTIVE",
          },
        });
      } catch (insertErr) {
        console.warn("[Lookup API] Background upsert notice:", insertErr);
      }

      return NextResponse.json(
        {
          found: true,
          student: {
            id: matchedR2.studentId,
            studentId: matchedR2.studentId,
            name: matchedR2.fullName,
            fullName: matchedR2.fullName,
            roll: "",
            grade: matchedR2.grade,
            section: "A",
            sex: "",
            gender: "",
            bloodType: "",
            school: fallbackSchool,
            schoolName: fallbackSchool,
            address: fallbackAddress,
            cityRegion: fallbackAddress,
            location: fallbackAddress,
            parentPhone: "",
            phone: "",
            emergencyContactPhone: "",
            emergencyContactName: "",
            guardianName: "",
            photoUrl: photoUrl,
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 4. Student Not Found -> Return HTTP 404 with exact requested schema
    return NextResponse.json(
      {
        found: false,
        student: null,
      },
      { status: 404, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Lookup API] Unhandled exception:", error);
    return NextResponse.json(
      {
        found: false,
        student: null,
        error: error?.message || "Internal server error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
