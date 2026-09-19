// ============================================================================
// STUDENT BRIDGE — SUPABASE CLOUD STATUS & KEEP-ALIVE TELEMETRY API
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { listSupabaseStorageFiles } from "@/lib/supabase-storage";

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  const startMs = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;
  let storageOk = false;
  let storageFileCount = 0;
  let lastActiveAt: Date | null = null;

  // 1. Measure DB ping latency
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startMs;
    dbOk = true;
  } catch (err) {
    dbLatencyMs = Date.now() - startMs;
    dbOk = false;
  }

  // 2. Test Supabase Storage Bucket ('student data')
  try {
    const files = await listSupabaseStorageFiles("");
    storageOk = Array.isArray(files);
    storageFileCount = files?.length || 0;
  } catch {
    storageOk = false;
  }

  // 3. Compute 7-day inactivity pause safety status
  try {
    const latestStudent = await prisma.student.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    const latestUser = await prisma.user.findFirst({
      orderBy: { lastActiveAt: "desc" },
      select: { lastActiveAt: true },
    });

    const dates = [latestStudent?.updatedAt, latestUser?.lastActiveAt].filter(Boolean) as Date[];
    if (dates.length > 0) {
      lastActiveAt = new Date(Math.max(...dates.map((d) => d.getTime())));
    }
  } catch {}

  const now = Date.now();
  const lastActiveTime = lastActiveAt ? lastActiveAt.getTime() : now;
  const daysSinceActivity = Math.max(0, Math.round((now - lastActiveTime) / (1000 * 60 * 60 * 24)));
  const daysUntilPause = Math.max(0, 7 - daysSinceActivity);

  return NextResponse.json({
    databaseConnected: dbOk,
    databaseLatencyMs: dbLatencyMs,
    storageConnected: storageOk,
    storageBucket: "student data",
    storageFileCount,
    poolerHost: "aws-1-eu-west-1.pooler.supabase.com",
    region: "AWS EU-West (Ireland)",
    sslMode: "require",
    lastActivity: lastActiveAt ? lastActiveAt.toISOString() : new Date().toISOString(),
    daysSinceActivity,
    daysUntilPause,
    pauseWarningActive: daysSinceActivity >= 3,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized: Admin role required" }, { status: 403 });
  }

  const startMs = Date.now();
  try {
    // Keep-alive touch: touch database and log audit ping
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startMs;

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "SUPABASE_KEEP_ALIVE_PING",
        entityType: "SYSTEM",
        entityId: "SUPABASE_CLOUD",
        metadata: JSON.stringify({
          latencyMs: latency,
          triggeredBy: session.username,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      latencyMs: latency,
      message: `Supabase keep-alive touch registered successfully (${latency}ms). Inactivity timer reset.`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Keep-alive ping failed" },
      { status: 500 }
    );
  }
}
