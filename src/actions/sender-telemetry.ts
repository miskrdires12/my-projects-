"use server";

// ============================================================================
// STUDENT BRIDGE — SENDER TELEMETRY, VELOCITY & INTERVAL EFFICIENCY ENGINE
// Measures per-minute rates, daily encoding status, starting-to-ending hours,
// exact inter-record sending intervals, and cadence efficiency rates everyday.
// ============================================================================

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface HourlyHourStat {
  hour: number; // 0..23
  label: string; // e.g. "08:00 AM"
  count: number;
  speedRating: "TURBO" | "HIGH" | "NORMAL" | "SLOW" | "IDLE";
}

export interface RecentIntervalRecord {
  studentId: string;
  fullName: string;
  timestamp: string; // ISO
  intervalSeconds: number; // seconds since previous registration
  status: "FAST" | "OPTIMAL" | "MODERATE" | "PAUSE";
}

export interface SenderDailyTelemetry {
  senderId: string;
  senderName: string;
  email?: string;
  role: string;
  boundDeviceInfo?: string | null;

  // Real-Time Per-Minute State
  currentLiveStatus: "BURSTING" | "ACTIVE" | "IDLE" | "COMPLETED" | "OFFLINE";
  recordsLast1Min: number;
  recordsLast5Mins: number;
  peakRecordsPerMinute: number;
  lastActiveAt?: string | null;

  // Daily Encoding Totals
  date: string; // YYYY-MM-DD
  totalRecordsToday: number;
  studentsWithPhotos: number;
  studentsWithQR: number;

  // Daily Starting to Ending Hours & Operating Span
  firstRecordAt: string | null; // ISO
  lastRecordAt: string | null; // ISO
  startingHourFormatted: string; // e.g. "08:15 AM"
  endingHourFormatted: string; // e.g. "05:30 PM"
  totalOperatingSpanFormatted: string; // e.g. "9h 15m"
  activeEncodingDurationFormatted: string; // e.g. "7h 45m"
  activeDurationSeconds: number;

  // Sending Interval & Efficiency Metrics
  avgSendingIntervalSeconds: number; // e.g. 48s
  minIntervalSeconds: number; // fastest burst
  maxActiveIntervalSeconds: number;
  pauseGapsCount: number; // breaks (> 10 mins)
  efficiencyRatePercent: number; // e.g. 94.5%
  efficiencyGrade: "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_ATTENTION";

  // Sender Speed
  speedRecordsPerHour: number; // e.g. 42.5 records/hr
  speedRecordsPerMinute: number; // e.g. 0.71 records/min
  speedGrade: "TURBO" | "HIGH" | "STEADY" | "MEASURED" | "IDLE";

  // Visual Breakdown
  hourlyHeatmap: HourlyHourStat[];
  recentIntervals: RecentIntervalRecord[];
}

export interface DayCadenceSummary {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 27, 2026"
  totalRecords: number;
  activeSendersCount: number;
  systemAvgIntervalSeconds: number;
  systemEfficiencyRate: number;
  senderBreakdown: Array<{
    senderName: string;
    count: number;
    startingHour: string;
    endingHour: string;
    avgIntervalSeconds: number;
    efficiencyRate: number;
    speedPerHour: number;
  }>;
}

export interface FullSenderTelemetryResponse {
  success: boolean;
  selectedDate: string; // YYYY-MM-DD
  totalSystemRecordsToday: number;
  activeSendersCountToday: number;
  systemAvgIntervalSeconds: number;
  systemAvgEfficiencyRate: number;
  senders: SenderDailyTelemetry[];
  dailyHistory: DayCadenceSummary[];
  error?: string;
}

/**
 * Helper: format hour into AM/PM
 */
function formatHourLabel(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, "0")}:00 ${ampm}`;
}

/**
 * Main Server Action to fetch Sender Telemetry, Per-Minute States,
 * Starting/Ending Hours, Sending Interval Metrics, and Daily Cadence.
 */
export async function getSenderTelemetryAction(
  targetDateStr?: string
): Promise<FullSenderTelemetryResponse> {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "RECEIVER")) {
      return {
        success: false,
        selectedDate: targetDateStr || new Date().toISOString().split("T")[0],
        totalSystemRecordsToday: 0,
        activeSendersCountToday: 0,
        systemAvgIntervalSeconds: 0,
        systemAvgEfficiencyRate: 0,
        senders: [],
        dailyHistory: [],
        error: "Unauthorized clearance level",
      };
    }

    // Determine target day bounds in local UTC/Server context
    const now = new Date();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const validDateStr = targetDateStr && datePattern.test(targetDateStr)
      ? targetDateStr
      : now.toISOString().split("T")[0];

    const [year, month, day] = validDateStr.split("-").map(Number);
    const startOfTargetDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfTargetDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const isToday =
      now.getFullYear() === year &&
      now.getMonth() === month - 1 &&
      now.getDate() === day;

    // 1. Fetch all students registered on the selected day
    const [dayStudents, allUsers, recentHistoricalStudents] = await Promise.all([
      prisma.student.findMany({
        where: {
          createdAt: {
            gte: startOfTargetDay,
            lte: endOfTargetDay,
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          studentId: true,
          fullName: true,
          photoPath: true,
          qrCodeData: true,
          senderId: true,
          senderName: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { role: "SENDER" },
            { role: "ADMIN" },
            { recordsSentSingle: { gt: 0 } },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          boundDeviceInfo: true,
          lastActiveAt: true,
          recordsSentSingle: true,
        },
      }),
      // Fetch 14-day window for daily cadence analysis
      prisma.student.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          studentId: true,
          senderId: true,
          senderName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Group students of selected day by sender identity
    const senderMap = new Map<string, typeof dayStudents>();
    for (const s of dayStudents) {
      const key = s.senderId || s.senderName || "Station Operator (Direct)";
      if (!senderMap.has(key)) {
        senderMap.set(key, []);
      }
      senderMap.get(key)!.push(s);
    }

    const nowMs = Date.now();
    const sendersTelemetryList: SenderDailyTelemetry[] = [];

    // Ensure all registered senders are included
    const knownSenders = new Map<string, { id: string; name: string; email?: string; role: string; boundDeviceInfo?: string | null }>();

    for (const u of allUsers) {
      knownSenders.set(u.id, {
        id: u.id,
        name: u.username || u.email.split("@")[0],
        email: u.email,
        role: u.role,
        boundDeviceInfo: u.boundDeviceInfo,
      });
      knownSenders.set(u.username, {
        id: u.id,
        name: u.username,
        email: u.email,
        role: u.role,
        boundDeviceInfo: u.boundDeviceInfo,
      });
    }

    // Merge sender identities present in day records
    for (const key of senderMap.keys()) {
      if (!knownSenders.has(key)) {
        knownSenders.set(key, {
          id: key,
          name: key,
          role: "SENDER",
          boundDeviceInfo: null,
        });
      }
    }

    // Process each unique sender
    const processedSenderIds = new Set<string>();

    for (const [key, senderMeta] of knownSenders.entries()) {
      if (processedSenderIds.has(senderMeta.id)) continue;
      processedSenderIds.add(senderMeta.id);

      // Find all matching students for this sender
      const records = dayStudents.filter((s) => {
        return (
          s.senderId === senderMeta.id ||
          s.senderName === senderMeta.name ||
          (s.senderName && senderMeta.email && s.senderName === senderMeta.email) ||
          (!s.senderId && !s.senderName && key === "Station Operator (Direct)")
        );
      });

      const totalCount = records.length;
      let studentsWithPhotos = 0;
      let studentsWithQR = 0;
      records.forEach((r) => {
        if (r.photoPath) studentsWithPhotos++;
        if (r.qrCodeData) studentsWithQR++;
      });

      // Starting & Ending Hours
      let firstRecordAt: string | null = null;
      let lastRecordAt: string | null = null;
      let startingHourFormatted = "—";
      let endingHourFormatted = "—";
      let totalOperatingSpanFormatted = "0h 0m";
      let activeEncodingDurationFormatted = "0h 0m";
      let activeDurationSeconds = 0;

      // Intervals Analysis
      let avgSendingIntervalSeconds = 0;
      let minIntervalSeconds = 0;
      let maxActiveIntervalSeconds = 0;
      let pauseGapsCount = 0;
      let efficiencyRatePercent = 0;
      const recentIntervals: RecentIntervalRecord[] = [];

      // Speed
      let speedRecordsPerHour = 0;
      let speedRecordsPerMinute = 0;

      // Per-minute state
      let recordsLast1Min = 0;
      let recordsLast5Mins = 0;
      let peakRecordsPerMinute = 0;
      let currentLiveStatus: "BURSTING" | "ACTIVE" | "IDLE" | "COMPLETED" | "OFFLINE" = "OFFLINE";

      // Hourly Heatmap (0..23)
      const hourlyCounts: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hourlyCounts[h] = 0;

      if (totalCount > 0) {
        const firstDate = new Date(records[0].createdAt);
        const lastDate = new Date(records[records.length - 1].createdAt);
        firstRecordAt = firstDate.toISOString();
        lastRecordAt = lastDate.toISOString();

        startingHourFormatted = firstDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        endingHourFormatted = lastDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        const spanMs = Math.max(0, lastDate.getTime() - firstDate.getTime());
        const spanHours = Math.floor(spanMs / 3600000);
        const spanMins = Math.floor((spanMs % 3600000) / 60000);
        totalOperatingSpanFormatted = `${spanHours}h ${spanMins}m`;

        // Calculate intervals between consecutive records
        const activeIntervals: number[] = [];
        let totalActiveMs = 0;

        for (let i = 0; i < records.length; i++) {
          const recDate = new Date(records[i].createdAt);
          const h = recDate.getHours();
          hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;

          if (i > 0) {
            const prevDate = new Date(records[i - 1].createdAt);
            const deltaSec = Math.max(1, Math.round((recDate.getTime() - prevDate.getTime()) / 1000));

            // Any interval > 600s (10 min) is counted as an idle/break gap
            if (deltaSec > 600) {
              pauseGapsCount++;
              totalActiveMs += 120 * 1000; // credit 2 min active cap
            } else {
              activeIntervals.push(deltaSec);
              totalActiveMs += deltaSec * 1000;
            }

            // Keep track of the last 15 intervals for the visual cadence timeline
            let status: "FAST" | "OPTIMAL" | "MODERATE" | "PAUSE" = "OPTIMAL";
            if (deltaSec <= 45) status = "FAST";
            else if (deltaSec <= 90) status = "OPTIMAL";
            else if (deltaSec <= 600) status = "MODERATE";
            else status = "PAUSE";

            recentIntervals.unshift({
              studentId: records[i].studentId,
              fullName: records[i].fullName,
              timestamp: recDate.toISOString(),
              intervalSeconds: deltaSec,
              status,
            });
          }
        }

        // Active encoding duration
        if (totalCount === 1) totalActiveMs = 60 * 1000;
        activeDurationSeconds = Math.round(totalActiveMs / 1000);
        const actHours = Math.floor(activeDurationSeconds / 3600);
        const actMins = Math.floor((activeDurationSeconds % 3600) / 60);
        activeEncodingDurationFormatted = `${actHours}h ${actMins}m`;

        // Sending Interval Metrics
        if (activeIntervals.length > 0) {
          const sumSec = activeIntervals.reduce((a, b) => a + b, 0);
          avgSendingIntervalSeconds = Math.round(sumSec / activeIntervals.length);
          minIntervalSeconds = Math.min(...activeIntervals);
          maxActiveIntervalSeconds = Math.max(...activeIntervals);

          // Sending Date Efficiency Rate Calculation:
          // Based on:
          // 1. Cadence Consistency (ratio of active sends completed within 120 seconds target)
          // 2. Pace consistency (near 45-75s benchmark)
          // 3. Active uptime vs span
          const onCadenceCount = activeIntervals.filter((s) => s <= 120).length;
          const cadenceRatio = onCadenceCount / activeIntervals.length;
          const paceScore = Math.min(1, 75 / Math.max(avgSendingIntervalSeconds, 35));
          const uptimeRatio = Math.min(1, totalActiveMs / Math.max(spanMs, 60000));

          efficiencyRatePercent = Math.round(
            cadenceRatio * 50 + paceScore * 30 + uptimeRatio * 20
          );
          efficiencyRatePercent = Math.min(99.4, Math.max(35, efficiencyRatePercent));
        } else {
          // Single student case
          avgSendingIntervalSeconds = 60;
          minIntervalSeconds = 60;
          maxActiveIntervalSeconds = 60;
          efficiencyRatePercent = 95;
        }

        // Speed calculation
        const activeHoursDec = Math.max(activeDurationSeconds / 3600, 0.05);
        speedRecordsPerHour = Math.round((totalCount / activeHoursDec) * 10) / 10;
        speedRecordsPerMinute = Math.round((totalCount / Math.max(activeDurationSeconds / 60, 1)) * 100) / 100;

        // Live per-minute rates (if target date is today)
        if (isToday) {
          recordsLast1Min = records.filter(
            (r) => nowMs - new Date(r.createdAt).getTime() <= 60000
          ).length;
          recordsLast5Mins = records.filter(
            (r) => nowMs - new Date(r.createdAt).getTime() <= 300000
          ).length;

          // Compute peak records per minute in sliding window
          const minuteBins = new Map<number, number>();
          for (const r of records) {
            const m = Math.floor(new Date(r.createdAt).getTime() / 60000);
            minuteBins.set(m, (minuteBins.get(m) || 0) + 1);
          }
          peakRecordsPerMinute = Math.max(0, ...Array.from(minuteBins.values()));

          const lastAgo = nowMs - lastDate.getTime();
          if (recordsLast1Min > 0) {
            currentLiveStatus = "BURSTING";
          } else if (recordsLast5Mins > 0 || lastAgo <= 180000) {
            currentLiveStatus = "ACTIVE";
          } else if (lastAgo <= 1800000) {
            // within 30 min
            currentLiveStatus = "IDLE";
          } else {
            currentLiveStatus = "COMPLETED";
          }
        } else {
          currentLiveStatus = "COMPLETED";
        }
      }

      // Efficiency Grade
      let efficiencyGrade: "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_ATTENTION" = "GOOD";
      if (efficiencyRatePercent >= 85) efficiencyGrade = "EXCELLENT";
      else if (efficiencyRatePercent >= 70) efficiencyGrade = "GOOD";
      else if (efficiencyRatePercent >= 50) efficiencyGrade = "MODERATE";
      else efficiencyGrade = "NEEDS_ATTENTION";

      // Speed Grade
      let speedGrade: "TURBO" | "HIGH" | "STEADY" | "MEASURED" | "IDLE" = "IDLE";
      if (totalCount === 0) speedGrade = "IDLE";
      else if (speedRecordsPerHour >= 45) speedGrade = "TURBO";
      else if (speedRecordsPerHour >= 30) speedGrade = "HIGH";
      else if (speedRecordsPerHour >= 18) speedGrade = "STEADY";
      else speedGrade = "MEASURED";

      // Format hourly heatmap array
      const hourlyHeatmap: HourlyHourStat[] = [];
      for (let h = 0; h < 24; h++) {
        const count = hourlyCounts[h] || 0;
        let speedRating: HourlyHourStat["speedRating"] = "IDLE";
        if (count >= 40) speedRating = "TURBO";
        else if (count >= 25) speedRating = "HIGH";
        else if (count >= 10) speedRating = "NORMAL";
        else if (count > 0) speedRating = "SLOW";

        hourlyHeatmap.push({
          hour: h,
          label: formatHourLabel(h),
          count,
          speedRating,
        });
      }

      sendersTelemetryList.push({
        senderId: senderMeta.id,
        senderName: senderMeta.name,
        email: senderMeta.email,
        role: senderMeta.role,
        boundDeviceInfo: senderMeta.boundDeviceInfo,
        currentLiveStatus,
        recordsLast1Min,
        recordsLast5Mins,
        peakRecordsPerMinute,
        lastActiveAt: lastRecordAt,
        date: validDateStr,
        totalRecordsToday: totalCount,
        studentsWithPhotos,
        studentsWithQR,
        firstRecordAt,
        lastRecordAt,
        startingHourFormatted,
        endingHourFormatted,
        totalOperatingSpanFormatted,
        activeEncodingDurationFormatted,
        activeDurationSeconds,
        avgSendingIntervalSeconds,
        minIntervalSeconds,
        maxActiveIntervalSeconds,
        pauseGapsCount,
        efficiencyRatePercent,
        efficiencyGrade,
        speedRecordsPerHour,
        speedRecordsPerMinute,
        speedGrade,
        hourlyHeatmap,
        recentIntervals: recentIntervals.slice(0, 15),
      });
    }

    // Sort senders: Active today first, then highest record count, then alphabetical
    sendersTelemetryList.sort((a, b) => {
      if (a.totalRecordsToday > 0 && b.totalRecordsToday === 0) return -1;
      if (b.totalRecordsToday > 0 && a.totalRecordsToday === 0) return 1;
      return b.totalRecordsToday - a.totalRecordsToday || a.senderName.localeCompare(b.senderName);
    });

    // 2. Generate 14-day Historical Daily Cadence Breakdown
    const dayCadenceMap = new Map<string, typeof recentHistoricalStudents>();
    for (const r of recentHistoricalStudents) {
      const d = new Date(r.createdAt).toISOString().split("T")[0];
      if (!dayCadenceMap.has(d)) dayCadenceMap.set(d, []);
      dayCadenceMap.get(d)!.push(r);
    }

    const dailyHistory: DayCadenceSummary[] = [];
    const sortedDays = Array.from(dayCadenceMap.keys()).sort().reverse();

    for (const dayStr of sortedDays) {
      const dayRecs = dayCadenceMap.get(dayStr)!;
      const dObj = new Date(dayStr + "T00:00:00Z");
      const displayDate = dObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Group by sender for this historical day
      const daySenderMap = new Map<string, typeof dayRecs>();
      for (const dr of dayRecs) {
        const sKey = dr.senderName || dr.senderId || "Direct";
        if (!daySenderMap.has(sKey)) daySenderMap.set(sKey, []);
        daySenderMap.get(sKey)!.push(dr);
      }

      let totalDayIntervals = 0;
      let totalDayIntervalSum = 0;
      const senderBreakdown: DayCadenceSummary["senderBreakdown"] = [];

      for (const [sName, sRecs] of daySenderMap.entries()) {
        sRecs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const fTime = new Date(sRecs[0].createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const lTime = new Date(sRecs[sRecs.length - 1].createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        const sIntervals: number[] = [];
        let sActiveSec = 0;

        for (let i = 1; i < sRecs.length; i++) {
          const delta = Math.max(1, Math.round((new Date(sRecs[i].createdAt).getTime() - new Date(sRecs[i - 1].createdAt).getTime()) / 1000));
          if (delta <= 600) {
            sIntervals.push(delta);
            sActiveSec += delta;
            totalDayIntervalSum += delta;
            totalDayIntervals++;
          } else {
            sActiveSec += 120;
          }
        }

        const avgInt = sIntervals.length > 0 ? Math.round(sIntervals.reduce((a, b) => a + b, 0) / sIntervals.length) : 60;
        const speedHr = Math.round((sRecs.length / Math.max(sActiveSec / 3600, 0.1)) * 10) / 10;
        const onCad = sIntervals.filter((s) => s <= 120).length;
        const eff = Math.min(99, Math.max(40, Math.round((onCad / Math.max(sIntervals.length, 1)) * 70 + 25)));

        senderBreakdown.push({
          senderName: sName,
          count: sRecs.length,
          startingHour: fTime,
          endingHour: lTime,
          avgIntervalSeconds: avgInt,
          efficiencyRate: eff,
          speedPerHour: speedHr,
        });
      }

      const dayAvgInterval = totalDayIntervals > 0 ? Math.round(totalDayIntervalSum / totalDayIntervals) : 60;
      const dayEff = Math.round(
        senderBreakdown.reduce((acc, s) => acc + s.efficiencyRate, 0) / Math.max(senderBreakdown.length, 1)
      );

      dailyHistory.push({
        date: dayStr,
        displayDate,
        totalRecords: dayRecs.length,
        activeSendersCount: daySenderMap.size,
        systemAvgIntervalSeconds: dayAvgInterval,
        systemEfficiencyRate: dayEff,
        senderBreakdown,
      });
    }

    // System summary stats for selected date
    const totalSystemRecordsToday = dayStudents.length;
    const activeSendersCountToday = sendersTelemetryList.filter((s) => s.totalRecordsToday > 0).length;
    const activeSenders = sendersTelemetryList.filter((s) => s.totalRecordsToday > 0);

    const systemAvgIntervalSeconds =
      activeSenders.length > 0
        ? Math.round(
            activeSenders.reduce((acc, s) => acc + s.avgSendingIntervalSeconds, 0) / activeSenders.length
          )
        : 0;

    const systemAvgEfficiencyRate =
      activeSenders.length > 0
        ? Math.round(
            activeSenders.reduce((acc, s) => acc + s.efficiencyRatePercent, 0) / activeSenders.length
          )
        : 0;

    return {
      success: true,
      selectedDate: validDateStr,
      totalSystemRecordsToday,
      activeSendersCountToday,
      systemAvgIntervalSeconds,
      systemAvgEfficiencyRate,
      senders: sendersTelemetryList,
      dailyHistory,
    };
  } catch (err: any) {
    console.error("getSenderTelemetryAction fatal error:", err);
    return {
      success: false,
      selectedDate: targetDateStr || new Date().toISOString().split("T")[0],
      totalSystemRecordsToday: 0,
      activeSendersCountToday: 0,
      systemAvgIntervalSeconds: 0,
      systemAvgEfficiencyRate: 0,
      senders: [],
      dailyHistory: [],
      error: err?.message || "Failed to query sender telemetry",
    };
  }
}
