// ============================================================================
// STUDENT BRIDGE — EDGE MIDDLEWARE & SECURITY BOUNDARY
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccessRoute } from "@/lib/permissions";
import type { UserRole } from "@/types/auth";

const COOKIE_NAME = "student_bridge_session";

// Public route prefixes that do not require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/uploads",
  "/images",
];

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // Fallback key only for build/edge initialization guard
    return new TextEncoder().encode("student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth endpoints
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isRoot = pathname === "/";

  // 2. Extract and verify session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let sessionUser: { userId: string; username: string; email: string; role: UserRole } | null = null;

  if (token) {
    try {
      const secret = getAuthSecret();
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      if (
        typeof payload.userId === "string" &&
        typeof payload.username === "string" &&
        typeof payload.email === "string" &&
        typeof payload.role === "string"
      ) {
        sessionUser = {
          userId: payload.userId,
          username: payload.username,
          email: payload.email,
          role: payload.role as UserRole,
        };
      }
    } catch {
      // Invalid, expired, or tampered token: treat as unauthenticated
      sessionUser = null;
    }
  }

  // 3. Handle login page redirect if already authenticated
  if (pathname === "/login") {
    if (sessionUser) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. Handle root path redirect
  if (isRoot) {
    if (sessionUser) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 5. Allow other public routes
  if (isPublic) {
    return NextResponse.next();
  }

  // 6. Enforce authentication on all protected routes
  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Clean up stale/invalid cookie if present
    if (token) {
      response.cookies.delete(COOKIE_NAME);
    }
    return response;
  }

  // 7. Enforce Role-Based Access Control (RBAC) & Operational Separation
  const role = sessionUser.role;

  // Non-API routes must strictly match allowable operational environment
  if (!pathname.startsWith("/api") && !canAccessRoute(role, pathname)) {
    const redirectUrl = new URL("/dashboard", request.url);
    if (role === "SENDER") {
      redirectUrl.searchParams.set("notice", "sender_station_only");
    } else if (role === "RECEIVER") {
      redirectUrl.searchParams.set("notice", "receiver_facility_only");
    } else {
      redirectUrl.searchParams.set("error", "forbidden");
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Inject verified authentication identity into downstream request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", sessionUser.userId);
  requestHeaders.set("x-user-role", sessionUser.role);
  requestHeaders.set("x-user-email", sessionUser.email);
  requestHeaders.set("x-user-name", sessionUser.username);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
