import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getStorageQuotaMetrics } from "@/lib/storage-quota-monitor";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "student-photos";

// Free tier standard constraints: 500 MB DB, 1 GB Storage, 7-Day Inactivity pause threshold
const FREE_TIER_DB_QUOTA_BYTES = 500 * 1024 * 1024; // 500 MB
const FREE_TIER_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024; // 1 GB

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    // 1. Measure Database Latency & Health
    const dbStart = performance.now();
    let dbStatus: "HEALTHY" | "DEGRADED" | "DOWN" = "HEALTHY";
    let dbLatencyMs = 0;
    let studentsCount = 0;

    try {
      studentsCount = await prisma.student.count();
      dbLatencyMs = Math.round(performance.now() - dbStart);
      if (dbLatencyMs > 250) {
        dbStatus = "DEGRADED";
      }
    } catch (dbErr) {
      dbStatus = "DOWN";
      dbLatencyMs = Math.round(performance.now() - dbStart);
    }

    // Measure DB File Size (for SQLite local dev) or estimation
    let dbSizeBytes = 0;
    try {
      const dbPath = path.resolve(process.cwd(), "dev.db");
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        dbSizeBytes = stats.size;
      } else {
        // Estimation: avg 2KB per student record
        dbSizeBytes = studentsCount * 2048 + 1048576;
      }
    } catch {
      dbSizeBytes = studentsCount * 2048;
    }

    // 2. Measure Supabase REST & Storage Connectivity
    let supabaseStatus: "CONNECTED" | "STANDBY" | "UNREACHABLE" | "NOT_CONFIGURED" = "NOT_CONFIGURED";
    let supabaseLatencyMs: number | null = null;
    let supabaseStorageStatus: "ACCESSIBLE" | "STANDBY" | "FAILED" | "NOT_CONFIGURED" = "NOT_CONFIGURED";
    let supabaseProjectRef = "local-hybrid";

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const parsed = new URL(SUPABASE_URL);
        supabaseProjectRef = parsed.hostname.split(".")[0] || "supabase-cloud";
      } catch {}

      const supaStart = performance.now();
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: "GET",
          headers: {
            apiKey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          signal: AbortSignal.timeout(4000),
        });
        supabaseLatencyMs = Math.round(performance.now() - supaStart);
        if (res.ok || res.status === 200 || res.status === 404) {
          supabaseStatus = "CONNECTED";
        } else {
          supabaseStatus = "STANDBY";
        }
      } catch {
        supabaseStatus = "UNREACHABLE";
      }

      // Check Supabase Storage
      try {
        const storageRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`, {
          method: "GET",
          headers: {
            apiKey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          signal: AbortSignal.timeout(4000),
        });
        if (storageRes.ok || storageRes.status === 200 || storageRes.status === 404) {
          supabaseStorageStatus = "ACCESSIBLE";
        } else {
          supabaseStorageStatus = "STANDBY";
        }
      } catch {
        supabaseStorageStatus = "FAILED";
      }
    } else {
      supabaseStatus = "NOT_CONFIGURED";
      supabaseStorageStatus = "NOT_CONFIGURED";
    }

    // 3. Track Inactivity & 7-Day Pause Timer
    // Check latest audit log or student update
    const [latestAudit, latestStudent] = await Promise.all([
      prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.student.findFirst({ orderBy: { updatedAt: "desc" } }),
    ]);

    const lastAuditDate = latestAudit ? new Date(latestAudit.createdAt).getTime() : 0;
    const lastStudentDate = latestStudent ? new Date(latestStudent.updatedAt).getTime() : 0;
    const lastActivityTime = Math.max(lastAuditDate, lastStudentDate, Date.now() - 1000 * 60 * 60); // default to at least recent if fresh

    const diffHours = (Date.now() - lastActivityTime) / (1000 * 60 * 60);
    const daysInactive = parseFloat((diffHours / 24).toFixed(1));
    const daysRemaining = parseFloat(Math.max(0, 7 - daysInactive).toFixed(1));

    // Threshold: if days remaining <= 3 (or inactive >= 4 days), trigger reminder
    const isApproachingPauseLimit = daysRemaining <= 3;
    const isCriticalPauseLimit = daysRemaining <= 1;

    // 4. Storage Quota Metrics
    const storageMetrics = await getStorageQuotaMetrics();
    const storageUsedBytes = storageMetrics.totalBytesUsed;
    const storagePercentUsed = parseFloat(
      ((storageUsedBytes / FREE_TIER_STORAGE_QUOTA_BYTES) * 100).toFixed(1)
    );
    const dbPercentUsed = parseFloat(
      ((dbSizeBytes / FREE_TIER_DB_QUOTA_BYTES) * 100).toFixed(1)
    );

    const isStorageApproachingLimit = storagePercentUsed >= 80;
    const isDbApproachingLimit = dbPercentUsed >= 80;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        indexedStudents: studentsCount,
        estimatedSizeBytes: dbSizeBytes,
        quotaBytes: FREE_TIER_DB_QUOTA_BYTES,
        percentUsed: dbPercentUsed,
        isApproachingLimit: isDbApproachingLimit,
      },
      supabase: {
        status: supabaseStatus,
        latencyMs: supabaseLatencyMs,
        storageStatus: supabaseStorageStatus,
        projectRef: supabaseProjectRef,
        isCloudConnected: Boolean(SUPABASE_URL && SUPABASE_KEY),
        configuredUrl: SUPABASE_URL ? `${SUPABASE_URL.slice(0, 18)}...` : null,
      },
      inactivityTimer: {
        lastActivityAt: new Date(lastActivityTime).toISOString(),
        daysInactive,
        daysRemaining,
        pauseThresholdDays: 7,
        isApproachingPauseLimit,
        isCriticalPauseLimit,
        recommendation: isApproachingPauseLimit
          ? "Supabase free tier automatically pauses after 7 days without inbound traffic. Send a Keep-Alive Ping now to preserve real-time functionality."
          : "Activity levels healthy. Free-tier pause timer is reset.",
      },
      storage: {
        totalBytesUsed: storageUsedBytes,
        quotaBytes: FREE_TIER_STORAGE_QUOTA_BYTES,
        percentUsed: storagePercentUsed,
        totalObjectsCount: storageMetrics.totalObjectsCount,
        isApproachingLimit: isStorageApproachingLimit,
      },
    });
  } catch (error: any) {
    console.error("Failed to retrieve supabase status:", error);
    return NextResponse.json(
      { error: "Failed to query telemetry", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler to execute a keep-alive touch/ping to reset the 7-day inactivity timer
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

    // 1. Touch Supabase REST if configured
    let supaPingResult = "NOT_CONFIGURED";
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const pingRes = await fetch(`${SUPABASE_URL}/rest/v1/?select=count`, {
          method: "GET",
          headers: {
            apiKey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          signal: AbortSignal.timeout(5000),
        });
        supaPingResult = pingRes.ok ? "PINGED_SUCCESS" : `PINGED_${pingRes.status}`;
      } catch (err: any) {
        supaPingResult = `FAILED: ${err.message}`;
      }
    }

    // 2. Record Keep-Alive Ping in Audit Log to advance updatedAt and activity timestamps
    const audit = await prisma.auditLog.create({
      data: {
        action: "SUPABASE_KEEP_ALIVE_PING",
        entityType: "SUPABASE_DATABASE",
        metadata: JSON.stringify({
          operator: session.username,
          operatorRole: session.role,
          supaPingResult,
          clientIp,
          triggeredAt: new Date().toISOString(),
          purpose: "Reset 7-day free tier pause countdown",
        }),
        userId: session.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Keep-alive touch successfully executed. 7-Day Inactivity timer reset!",
      timestamp: new Date().toISOString(),
      supaPingResult,
      auditId: audit.id,
    });
  } catch (error: any) {
    console.error("Keep-alive ping failed:", error);
    return NextResponse.json(
      { error: "Keep-alive ping failed", details: error.message },
      { status: 500 }
    );
  }
}
