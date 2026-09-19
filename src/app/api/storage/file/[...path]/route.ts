// ============================================================================
// STUDENT BRIDGE — SECURE PRIVATE STORAGE FILE DELIVERY API
// Validates time-limited HMAC signatures or authenticated session before serving photo binaries.
// Enforces private storage access control and includes CORS headers for canvas operations.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifySignedToken, downloadFromStorage } from "@/lib/storage-service";
import { recordBandwidthUsage } from "@/lib/storage-quota-monitor";
import { getSession } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const rawKey = params.path.join("/");
  const cleanKey = rawKey.replace(/^\/+/, "");

  const { searchParams } = new URL(request.url);
  const rawExpires = searchParams.get("expires");
  const rawToken = searchParams.get("token");

  // Sanitize query params in case cache-busting or extra params were appended
  const expires = rawExpires ? rawExpires.split(/[?&]/)[0] : null;
  const token = rawToken ? rawToken.split(/[?&]/)[0] : null;

  let isAuthorized = false;

  // 1. Authenticated session check (Admin, Receiver, Sender have direct authorized access)
  try {
    const session = await getSession();
    if (session && (session.role === "ADMIN" || session.role === "RECEIVER" || session.role === "SENDER")) {
      isAuthorized = true;
    }
  } catch {
    // Non-session request, proceed to token validation
  }

  // 2. Cryptographic HMAC signed token check
  if (!isAuthorized && expires && token) {
    const expiresAtUnix = parseInt(expires, 10);
    if (!isNaN(expiresAtUnix)) {
      if (verifySignedToken(cleanKey, expiresAtUnix, token)) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Access denied: Missing valid session or signed authorization token." },
      {
        status: 403,
        headers: CORS_HEADERS,
      }
    );
  }

  const fileBuffer = await downloadFromStorage(cleanKey);
  if (!fileBuffer) {
    return NextResponse.json(
      { error: "Storage object not found." },
      {
        status: 404,
        headers: CORS_HEADERS,
      }
    );
  }

  recordBandwidthUsage(fileBuffer.length);

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": cleanKey.endsWith(".png") ? "image/png" : "image/jpeg",
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
