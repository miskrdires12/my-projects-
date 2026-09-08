import React from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RealtimeSenderDashboard from "@/components/dashboard/RealtimeSenderDashboard";
import RealtimeReceiverDashboard from "@/components/dashboard/RealtimeReceiverDashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { notice?: string; error?: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const role = session.role;
  const isSender = role === "SENDER";

  // ──────────────────────────────────────────────────────────────────────────
  // SENDER DASHBOARD VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (isSender) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    return (
      <RealtimeSenderDashboard
        initialData={{
          totalEnrolled,
          enrolledToday,
          photosCaptured,
          totalBatches: batches.length,
          draftBatchesCount,
          sentBatchesCount,
          recentStudents,
          recentBatches: batches,
        }}
        notice={searchParams.notice}
      />
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RECEIVER & ADMIN DASHBOARD VIEW (20,000+ CAPACITY PRODUCTION FACILITY)
  // ──────────────────────────────────────────────────────────────────────────
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

  return (
    <RealtimeReceiverDashboard
      initialData={{
        totalStudents,
        photosCount,
        qrCount,
        readyForPrintCount,
        pendingVerification,
        activeJobsCount,
        recentBatches,
        missingPhotos,
        missingQRs,
      }}
      notice={searchParams.notice}
    />
  );
}
