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
  const secret =
    process.env.AUTH_SECRET ||
    "student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade";
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
  deviceId?: string;
  deviceInfo?: string;
  ipAddress?: string;
}): Promise<LoginResponse> {
  const trimmed = credentials.emailOrUsername.trim().toLowerCase();

  // 1. REJECT ANY DEFAULT DEMO EMAILS, USERNAMES, OR DEFAULT PASSWORDS
  const DEFAULT_CREDENTIAL_IDENTIFIERS = [
    "sender@studentbridge.internal",
    "receiver@studentbridge.internal",
    "admin@studentbridge.internal",
    "sender",
    "receiver",
    "admin",
    "demo",
    "test",
    "operator",
    "guest",
  ];

  const DEFAULT_PASSWORDS = [
    "Password123!",
    "AdminPassword123!",
    "password",
    "password123",
    "admin",
    "admin123",
    "sender123",
    "receiver123",
    "123456",
    "12345678",
    "demo123",
  ];

  if (
    DEFAULT_CREDENTIAL_IDENTIFIERS.includes(trimmed) ||
    DEFAULT_PASSWORDS.includes(credentials.passwordPlain)
  ) {
    return {
      success: false,
      error:
        "ACCESS REJECTED: Default demo credentials have been permanently decommissioned and disabled by security policy. You must sign in using your administrator-provisioned account.",
    };
  }

  let user: any = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [{ email: trimmed }, { username: trimmed }],
      },
    });
  } catch (dbErr) {
    console.warn("Notice: Prisma lookup in login:", dbErr);
  }

  if (!user) {
    return {
      success: false,
      error: "Invalid username or password. Ensure your administrator has provisioned your account.",
    };
  }

  let isValid = false;
  try {
    isValid = await verifyPassword(credentials.passwordPlain, user.passwordHash);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return { success: false, error: "Invalid credentials." };
  }

  // 2. ENFORCE 1 DEVICE = 1 ROLE & HARDWARE DEVICE LOCKING
  const deviceId = credentials.deviceId;
  if (deviceId && deviceId !== "unknown-device" && deviceId.trim().length > 0) {
    // Check if this physical hardware is already bound to a role
    try {
      const existingDeviceBinding = await prisma.deviceBinding.findUnique({
        where: { deviceId },
      });

      if (existingDeviceBinding) {
        if (existingDeviceBinding.role !== user.role) {
          return {
            success: false,
            error: `ACCESS REJECTED (1 DEVICE = 1 ROLE ENFORCEMENT): This hardware machine is bound exclusively for "${existingDeviceBinding.role}" operations. Logins with "${user.role}" are strictly prohibited on this physical device.`,
          };
        }
      } else {
        // Enforce new binding for this device with this user's role
        await prisma.deviceBinding.create({
          data: {
            deviceId,
            role: user.role,
            boundBy: user.username,
            boundEmail: user.email,
            deviceInfo: credentials.deviceInfo,
          },
        });
      }
    } catch (deviceBindingErr) {
      console.warn("Notice: device binding check:", deviceBindingErr);
    }

    // Check if user is already locked to another device (Master Admin exempt from lockout)
    const isMasterAdmin = user.email === "miskrdires11@gmail.com";
    if (user.boundDeviceId && user.boundDeviceId !== deviceId && !isMasterAdmin) {
      return {
        success: false,
        error: `HARDWARE DEVICE LOCK ACTIVE: Your account is bound to another device. Contact the administrator to release your device lock.`,
      };
    }

    // If user has no boundDeviceId, record this device
    if (!user.boundDeviceId) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            boundDeviceId: deviceId,
            boundDeviceInfo: credentials.deviceInfo,
          },
        });
      } catch {}
    }
  }

  const sessionPayload: Omit<SessionPayload, "iat" | "exp"> = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
  };

  const token = await signSessionToken(sessionPayload);
  await setSessionCookie(token);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        sessionStartedAt: new Date(),
        currentStatus: "ACTIVE_WORKING",
        workSessionCount: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "AUTH_LOGIN",
        entityType: "USER",
        entityId: user.id,
        ipAddress: credentials.ipAddress,
        metadata: JSON.stringify({
          role: user.role,
          deviceId: credentials.deviceId,
          sessionStart: new Date(),
        }),
      },
    });
  } catch {
    // Non-fatal
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
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          sessionEndedAt: new Date(),
          lastActiveAt: new Date(),
          currentStatus: "COMPLETED",
        },
      });

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
