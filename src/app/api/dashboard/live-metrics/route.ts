import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedRole = searchParams.get("role") || session.role;
    const isSender = requestedRole === "SENDER";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isSender) {
      const [
        totalEnrolled,
        enrolledToday,
        photosCaptured,
        batches,
        recentStudents,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { createdAt: { gte: today } } }),
        prisma.student.count({ where: { photoPath: { not: null } } }),
        prisma.transferBatch.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        prisma.student.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            studentId: true,
            fullName: true,
            grade: true,
            phone: true,
            photoPath: true,
            createdAt: true,
          },
        }),
      ]);

      const draftBatchesCount = batches.filter(
        (b) => b.status === "DRAFT" || b.status === "VALIDATING"
      ).length;
      const sentBatchesCount = batches.filter(
        (b) => b.status === "SENT" || b.status === "RECEIVED" || b.status === "PROCESSED"
      ).length;

      return NextResponse.json({
        role: "SENDER",
        timestamp: new Date().toISOString(),
        metrics: {
          totalEnrolled,
          enrolledToday,
          photosCaptured,
          photosPercentage: totalEnrolled > 0 ? Math.round((photosCaptured / totalEnrolled) * 100) : 0,
          totalBatches: batches.length,
          draftBatchesCount,
          sentBatchesCount,
        },
        recentStudents,
        recentBatches: batches,
      });
    } else {
      // RECEIVER / ADMIN
      const [
        totalStudents,
        photosCount,
        qrCount,
        readyForPrintCount,
        recentBatches,
        missingPhotos,
        missingQRs,
        activeJobsCount,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { photoPath: { not: null } } }),
        prisma.student.count({ where: { qrCodeData: { not: null } } }),
        prisma.student.count({
          where: {
            AND: [{ photoPath: { not: null } }, { qrCodeData: { not: null } }],
          },
        }),
        prisma.transferBatch.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
        }),
        prisma.student.findMany({
          where: { photoPath: null },
          take: 5,
          select: { id: true, studentId: true, fullName: true, grade: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.student.findMany({
          where: { qrCodeData: null },
          take: 5,
          select: { id: true, studentId: true, fullName: true, grade: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.bulkGenerationJob.count({
          where: { status: { in: ["QUEUED", "PROCESSING"] } },
        }),
      ]);

      const pendingVerification = totalStudents - readyForPrintCount;

      return NextResponse.json({
        role: "RECEIVER",
        timestamp: new Date().toISOString(),
        metrics: {
          totalStudents,
          photosCount,
          photosPercentage: totalStudents > 0 ? Math.round((photosCount / totalStudents) * 100) : 0,
          qrCount,
          qrPercentage: totalStudents > 0 ? Math.round((qrCount / totalStudents) * 100) : 0,
          readyForPrintCount,
          pendingVerification,
          activeJobsCount,
        },
        recentBatches,
        missingPhotos,
        missingQRs,
      });
    }
  } catch (error: any) {
    console.error("Failed to fetch live metrics:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch metrics" }, { status: 500 });
  }
}
