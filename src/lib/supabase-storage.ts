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
 * Permanently purges all objects inside the 'student data' bucket
 */
export async function purgeAllSupabaseStorageObjects(): Promise<{ success: boolean; count: number; error?: string }> {
  const { supabaseUrl, apiKey } = getSupabaseConfig();

  try {
    // 1. List objects
    const objects = await listSupabaseStorageFiles("");
    if (!objects || objects.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Extract prefixes (both direct items and folder items)
    const prefixes: string[] = [];
    for (const obj of objects) {
      if (obj.name) {
        prefixes.push(obj.name);
      }
    }

    if (prefixes.length > 0) {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/${ENCODED_BUCKET}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "apikey": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { success: false, count: 0, error: err };
      }
    }

    return { success: true, count: prefixes.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}
