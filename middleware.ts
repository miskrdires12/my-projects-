import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets and API webhooks
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // 1. Skip public endpoints and auth routes
  if (
    path.startsWith("/api/auth") ||
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/invite") ||
    path === "/"
  ) {
    return NextResponse.next();
  }

  // 2. Extract session token (if any)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "fallback-dev-secret-key-32-characters-long",
  });

  // 3. Extract organization slug from route: /[orgSlug]/...
  const orgPathMatch = path.match(/^\/([^\/]+)(?:\/.*)?$/);
  const potentialOrgSlug = orgPathMatch ? orgPathMatch[1] : null;

  const reservedPaths = ["onboarding", "select-organization", "api", "profile", "_next"];
  if (potentialOrgSlug && reservedPaths.includes(potentialOrgSlug)) {
    return NextResponse.next();
  }

  // 4. Validate tenant membership from JWT payload - Require authentication
  if (potentialOrgSlug) {
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    const requestHeaders = new Headers(req.headers);
    const userMemberships = (token.organizations as Array<{
      id: string;
      slug: string;
      role: string;
    }>) || [];

    const matchedOrg = userMemberships.find((org) => org.slug === potentialOrgSlug);

    if (matchedOrg) {
      requestHeaders.set("x-tenant-id", matchedOrg.id);
      requestHeaders.set("x-tenant-slug", matchedOrg.slug);
      requestHeaders.set("x-tenant-role", matchedOrg.role);
      requestHeaders.set("x-user-id", token.sub || "");
    } else {
      requestHeaders.set("x-tenant-slug", potentialOrgSlug);
      requestHeaders.set("x-user-id", token.sub || "");
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}
