// ============================================================================
// STUDENT BRIDGE — SUPABASE STORAGE UPLOADER & CLOUD MANAGER
// Bucket: 'student data'
// Organized cleanly into folders: [Grade]/[StudentID]_[FullName].jpg
// ============================================================================

export interface SupabaseStorageUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

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

/**
 * Uploads an image buffer to Supabase Storage bucket 'student data'
 */
export async function uploadToSupabaseBucket(
  buffer: Buffer,
  folderPath: string,
  fileName: string,
  contentType = "image/jpeg"
): Promise<SupabaseStorageUploadResult> {
  const { supabaseUrl, apiKey } = getSupabaseConfig();

  if (!apiKey) {
    return {
      success: false,
      error: "Supabase API key not configured in .env",
    };
  }

  // Clean path: e.g. Grade 10/SB-2026-0001_Alexandria Vance.jpg
  const sanitizedFolder = folderPath.replace(/^[/\\]+|[/\\]+$/g, "");
  const cleanPath = `${sanitizedFolder}/${fileName}`;
  const encodedPath = encodeURI(cleanPath);

  const uploadEndpoint = `${supabaseUrl}/storage/v1/object/${ENCODED_BUCKET}/${encodedPath}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${ENCODED_BUCKET}/${encodedPath}`;

  // Retry up to 3 times on transient network glitches
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "apikey": apiKey,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (res.ok) {
        console.log(`[Supabase Storage] ✓ Uploaded: ${cleanPath}`);
        return {
          success: true,
          publicUrl,
        };
      }

      const errText = await res.text();
      lastError = `[HTTP ${res.status}] ${errText}`;
      console.warn(`[Supabase Storage] Attempt ${attempt}/3 failed: ${lastError}`);
    } catch (err: any) {
      lastError = err?.message || "Network error";
      console.warn(`[Supabase Storage] Attempt ${attempt}/3 network error: ${lastError}`);
    }

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  return {
    success: false,
    error: lastError,
  };
}

/**
 * Extracts the clean relative path within the 'student data' bucket from a full URL or path
 */
export function extractSupabaseStorageKey(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("data:") || urlOrPath.startsWith("blob:")) return null;

  try {
    let clean = decodeURIComponent(urlOrPath.split("?")[0]);
    // Match bucket marker
    const bucketMarker = "/student data/";
    const markerIdx = clean.indexOf(bucketMarker);
    if (markerIdx !== -1) {
      return clean.slice(markerIdx + bucketMarker.length).replace(/^\/+/, "");
    }
    const publicMarker = "/object/public/";
    const pubIdx = clean.indexOf(publicMarker);
    if (pubIdx !== -1) {
      const remainder = clean.slice(pubIdx + publicMarker.length).replace(/^\/+/, "");
      if (remainder.startsWith("student data/")) {
        return remainder.slice("student data/".length);
      }
      return remainder;
    }
    // If it's already a relative path inside bucket (e.g. "Grade 10/STU001.jpg")
    if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/api/")) {
      return clean.replace(/^\/+/, "");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deletes multiple file paths from Supabase Storage bucket 'student data'
 */
export async function deleteMultipleFromSupabaseBucket(
  cleanPaths: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const validPaths = Array.from(new Set(cleanPaths.filter(Boolean)));
  if (validPaths.length === 0) return { success: true, deletedCount: 0 };

  const { supabaseUrl, apiKey } = getSupabaseConfig();

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${ENCODED_BUCKET}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: validPaths }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, deletedCount: 0, error: err };
    }

    return { success: true, deletedCount: validPaths.length };
  } catch (err: any) {
    return { success: false, deletedCount: 0, error: err?.message || "Failed to batch delete" };
  }
}

/**
 * Deletes a single file path from Supabase Storage bucket 'student data'
 */
export async function deleteFromSupabaseBucket(cleanPath: string): Promise<{ success: boolean; error?: string }> {
  const { supabaseUrl, apiKey } = getSupabaseConfig();

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${ENCODED_BUCKET}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "apikey": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [cleanPath] }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete" };
  }
}

/**
 * Lists objects in a folder inside the 'student data' bucket
 */
export async function listSupabaseStorageFiles(prefix = ""): Promise<any[]> {
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
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Recursively lists all file paths inside the 'student data' bucket
 */
export async function listAllSupabaseStorageFilePaths(prefix = ""): Promise<string[]> {
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
    let filePaths: string[] = [];

    for (const item of items) {
      const fullItemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // Virtual folder - recurse into it
        const subFiles = await listAllSupabaseStorageFilePaths(fullItemPath);
        filePaths = filePaths.concat(subFiles);
      } else {
        filePaths.push(fullItemPath);
      }
    }

    return filePaths;
  } catch (err) {
    console.error("[Supabase Storage] listAllSupabaseStorageFilePaths error:", err);
    return [];
  }
}

/**
 * Permanently purges all objects inside the 'student data' bucket across all folders
 */
export async function purgeAllSupabaseStorageObjects(): Promise<{ success: boolean; count: number; error?: string }> {
  const { supabaseUrl, apiKey } = getSupabaseConfig();

  try {
    // 1. Recursively find all files in the bucket
    const allPaths = await listAllSupabaseStorageFilePaths("");
    if (!allPaths || allPaths.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Batch delete in chunks of 100
    let deletedCount = 0;
    const chunkSize = 100;
    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      const res = await fetch(`${supabaseUrl}/storage/v1/object/${ENCODED_BUCKET}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "apikey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: chunk }),
      });

      if (res.ok) {
        deletedCount += chunk.length;
      } else {
        const err = await res.text();
        console.warn("[Supabase Storage] Batch delete warning:", err);
      }
    }

    return { success: true, count: deletedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}
