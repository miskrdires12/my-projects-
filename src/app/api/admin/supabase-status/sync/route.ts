// ============================================================================
// STUDENT BRIDGE — SUPABASE STORAGE & DATABASE SYNCHRONIZATION API
// Scans for orphaned photos in 'student data' bucket and synchronizes with PostgreSQL
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  deleteMultipleFromSupabaseBucket,
  getSupabaseStorageStats,
  invalidateSupabaseStorageCache,
} from "@/lib/supabase-storage";
import { createSafeAuditLog } from "@/lib/audit";

const BUCKET_NAME = "student data";
const ENCODED_BUCKET = encodeURIComponent(BUCKET_NAME);

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hiwhmpuhhakguckckuqv.supabase.co";
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpd2htcHVoaGFrZ3Vja2NrdXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTkyMjYsImV4cCI6MjEwNTA3NTIyNn0.1v1JUKWLxEfTPDlp6h1QBpf34MVKoW5hGYHt7quE8k0";

  return { supabaseUrl, apiKey };
}

interface StorageItem {
  path: string;
  size: number;
  updated_at?: string;
}

async function scanAllStorageFiles(prefix = ""): Promise<StorageItem[]> {
  const { supabaseUrl, apiKey } = getSupabaseConfig();

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/list/${ENCODED_BUCKET}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefix,
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
    });

    if (!res.ok) return [];
    const items = await res.json();
    let list: StorageItem[] = [];

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        const sub = await scanAllStorageFiles(fullPath);
        list = list.concat(sub);
      } else {
        list.push({
          path: fullPath,
          size: item.metadata?.size || 0,
          updated_at: item.updated_at,
        });
      }
    }

    return list;
  } catch (err) {
    console.error("[Storage Sync] scanAllStorageFiles error:", err);
    return [];
  }
}

/**
 * GET: Analyzes Supabase Storage bucket 'student data' vs active students in Prisma DB
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  try {
    const [storageFiles, students] = await Promise.all([
      scanAllStorageFiles(""),
      prisma.student.findMany({
        select: {
          id: true,
          studentId: true,
          fullName: true,
          grade: true,
          photoPath: true,
          originalPhotoPath: true,
        },
      }),
    ]);

    const activeStudentIds = new Set(students.map((s) => s.studentId.trim()));
    const activeFiles: StorageItem[] = [];
    const orphanedFiles: StorageItem[] = [];
    let orphanedBytes = 0;

    for (const file of storageFiles) {
      const filename = file.path.split("/").pop() || "";
      const match = filename.match(/^(SB-[\d-]+)_/);
      if (match && activeStudentIds.has(match[1])) {
        activeFiles.push(file);
      } else {
        orphanedFiles.push(file);
        orphanedBytes += file.size;
      }
    }

    return NextResponse.json({
      totalStorageFiles: storageFiles.length,
      activeStudentsCount: students.length,
      activeFilesCount: activeFiles.length,
      orphanedCount: orphanedFiles.length,
      orphanedBytes,
      orphanedSizeFormatted:
        orphanedBytes < 1024 * 1024
          ? `${(orphanedBytes / 1024).toFixed(1)} KB`
          : `${(orphanedBytes / (1024 * 1024)).toFixed(2)} MB`,
      orphanedFiles: orphanedFiles.slice(0, 150),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to analyze storage synchronization" },
      { status: 500 }
    );
  }
}

/**
 * POST: Purges orphaned files from Supabase Storage bucket 'student data'
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || "PURGE_ALL_ORPHANS";
    const explicitPaths: string[] | undefined = body.paths;

    let pathsToDelete: string[] = [];

    if (mode === "PURGE_SPECIFIC" && Array.isArray(explicitPaths) && explicitPaths.length > 0) {
      pathsToDelete = explicitPaths;
    } else {
      // Analyze and get all orphans
      const [storageFiles, students] = await Promise.all([
        scanAllStorageFiles(""),
        prisma.student.findMany({ select: { studentId: true } }),
      ]);

      const activeStudentIds = new Set(students.map((s) => s.studentId.trim()));
      pathsToDelete = storageFiles
        .filter((file) => {
          const filename = file.path.split("/").pop() || "";
          const match = filename.match(/^(SB-[\d-]+)_/);
          return !match || !activeStudentIds.has(match[1]);
        })
        .map((f) => f.path);
    }

    if (pathsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        purgedCount: 0,
        message: "Storage is already synchronized! No orphaned photos found.",
      });
    }

    // Batch delete in chunks of 50
    let totalPurged = 0;
    const chunkSize = 50;
    for (let i = 0; i < pathsToDelete.length; i += chunkSize) {
      const chunk = pathsToDelete.slice(i, i + chunkSize);
      const res = await deleteMultipleFromSupabaseBucket(chunk);
      if (res.success) {
        totalPurged += res.deletedCount;
      }
    }

    // Invalidate storage cache and fetch fresh stats
    invalidateSupabaseStorageCache();
    const freshStats = await getSupabaseStorageStats(true);

    await createSafeAuditLog({
      userId: session.userId,
      action: "SUPABASE_STORAGE_ORPHANS_PURGED",
      entityType: "STORAGE",
      entityId: "SUPABASE_STORAGE",
      metadata: {
        purgedCount: totalPurged,
        operator: session.username,
        newStorageFileCount: freshStats.totalFiles,
        newStorageSizeFormatted: freshStats.totalSizeFormatted,
      },
    });

    return NextResponse.json({
      success: true,
      purgedCount: totalPurged,
      message: `Successfully synchronized storage: purged ${totalPurged} orphaned photo(s).`,
      storageFileCount: freshStats.totalFiles,
      storageSizeFormatted: freshStats.totalSizeFormatted,
      storageFolders: freshStats.folders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to purge orphaned storage files" },
      { status: 500 }
    );
  }
}
