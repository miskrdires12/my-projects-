"use server";

// ============================================================================
// STUDENT BRIDGE — DAILY, WEEKLY & MONTHLY DATA REPORTS
// Aggregated analytics for Admin and Super Admin
// ============================================================================

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export type ReportTimeframe = "daily" | "weekly" | "monthly" | "all";

export async function getAggregatedReportsAction(timeframe: ReportTimeframe = "daily") {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized. Super Admin or Admin access required." };
    }

    const now = new Date();
    let startDate: Date | undefined;

    if (timeframe === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeframe === "weekly") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "monthly") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = startDate ? { createdAt: { gte: startDate } } : {};

    // 1. Total counts in this timeframe
    const [totalIntake, withPhotoCount, missingPhotoCount, mistakesCount] = await Promise.all([
      prisma.student.count({ where: whereClause }),
      prisma.student.count({ where: { ...whereClause, photoPath: { not: null } } }),
      prisma.student.count({ where: { ...whereClause, photoPath: null } }),
      prisma.senderMistake.count({ where: whereClause }),
    ]);

    // 2. Lifetime comparison numbers
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, monthCount, allTimeCount] = await Promise.all([
      prisma.student.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.student.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.student.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.student.count(),
    ]);

    // 3. Breakdown by Grade
    const gradeGroups = await prisma.student.groupBy({
      by: ["grade"],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // 4. Breakdown by Gender / Sex
    const sexGroups = await prisma.student.groupBy({
      by: ["sex"],
      where: whereClause,
      _count: { id: true },
    });

    // 5. Breakdown by School
    const schoolGroups = await prisma.student.groupBy({
      by: ["school"],
      where: { ...whereClause, school: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 12,
    });

    // 6. Breakdown by Address / Section
    const sectionGroups = await prisma.student.groupBy({
      by: ["address"],
      where: { ...whereClause, address: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // 7. Sender Intake Breakdown
    const senderGroups = await prisma.student.groupBy({
      by: ["senderName", "senderId"],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 15,
    });

    // 8. Recent Mistakes Log
    const recentMistakes = await prisma.senderMistake.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return {
      success: true,
      timeframe,
      metrics: {
        totalIntake,
        withPhotoCount,
        missingPhotoCount,
        mistakesCount,
        photoCoveragePct: totalIntake > 0 ? Math.round((withPhotoCount / totalIntake) * 100) : 100,
      },
      cadence: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        allTime: allTimeCount,
      },
      breakdowns: {
        grades: gradeGroups.map((g) => ({ name: g.grade, count: g._count.id })),
        sex: sexGroups.map((s) => ({ name: s.sex || "Unspecified", count: s._count.id })),
        schools: schoolGroups.map((sch) => ({ name: sch.school || "Unassigned", count: sch._count.id })),
        sections: sectionGroups.map((sec) => ({ name: sec.address || "General", count: sec._count.id })),
        senders: senderGroups.map((snd) => ({
          name: snd.senderName || snd.senderId || "Direct Intake",
          count: snd._count.id,
        })),
      },
      recentMistakes,
    };
  } catch (err: any) {
    console.error("[getAggregatedReportsAction] Error:", err);
    return { success: false, error: err?.message || "Failed to generate data reports." };
  }
}
