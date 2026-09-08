// ============================================================================
// STUDENT BRIDGE — ENTERPRISE AUTHENTICATION & SESSION MANAGEMENT
// ============================================================================

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { SessionPayload, UserRole, PermissionAction, LoginResponse } from "@/types/auth";
import { assertPermission } from "@/lib/permissions";

const COOKIE_NAME = "student_bridge_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Derives the cryptographic key for JWT signing and verification.
 * Enforces a minimum 32-character secret length.
 */
function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET environment variable is missing or less than 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

// ----------------------------------------------------------------------------
// PASSWORD HASHING
// ----------------------------------------------------------------------------

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// ----------------------------------------------------------------------------
// JWT SESSION TOKEN GENERATION & VERIFICATION (Edge compatible via jose)
// ----------------------------------------------------------------------------

export async function signSessionToken(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  const secretKey = getAuthSecret();
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getAuthSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role as UserRole,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// COOKIE ACCESS & SESSION RETRIEVAL
// ----------------------------------------------------------------------------

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Retrieves and cryptographically validates the active session from HTTP-only cookie.
 * Never trust client-side role claims.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

// ----------------------------------------------------------------------------
// LOGIN & LOGOUT SERVER ACTIONS
// ----------------------------------------------------------------------------

export async function login(credentials: {
  emailOrUsername: string;
  passwordPlain: string;
  ipAddress?: string;
}): Promise<LoginResponse> {
  const trimmed = credentials.emailOrUsername.trim().toLowerCase();

  // Find user by either email or username (case-insensitive)
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: trimmed }, { username: trimmed }],
    },
  });

  if (!user) {
    // Timing mitigation: always perform comparison even on not found
    await bcrypt.compare(
      credentials.passwordPlain,
      "$2a$12$e8Yk2uR1qI5K7fN0p0OqweB2M8LhK3g3y.5h8H8.v3yG.L2s5b5jG"
    );
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await verifyPassword(credentials.passwordPlain, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  const sessionPayload: Omit<SessionPayload, "iat" | "exp"> = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
  };

  const token = await signSessionToken(sessionPayload);
  await setSessionCookie(token);

  // Record audit event
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "AUTH_LOGIN",
        entityType: "USER",
        entityId: user.id,
        ipAddress: credentials.ipAddress,
        metadata: JSON.stringify({ role: user.role }),
      },
    });
  } catch {
    // Non-fatal audit recording failure
  }

  return {
    success: true,
    user: sessionPayload,
  };
}

export async function logout(ipAddress?: string): Promise<void> {
  const session = await getSession();
  if (session) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "AUTH_LOGOUT",
          entityType: "USER",
          entityId: session.userId,
          ipAddress,
        },
      });
    } catch {
      // Non-fatal audit log failure
    }
  }
  await clearSessionCookie();
}

/**
 * Server-side authorization guard.
 * Call at the top of protected Server Actions or Route Handlers.
 */
export async function requireAuth(requiredPermission?: PermissionAction): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Active session required");
  }

  if (requiredPermission) {
    assertPermission(session.role, requiredPermission);
  }

  return session;
}
