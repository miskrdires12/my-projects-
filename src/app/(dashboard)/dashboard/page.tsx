import React from "react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
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
  // SENDER PLATFORM REDIRECT (Requirement 11: Only Registration & Settings)
  // ──────────────────────────────────────────────────────────────────────────
  if (isSender) {
    redirect("/register");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RECEIVER & ADMIN DASHBOARD VIEW (20,000+ CAPACITY PRODUCTION FACILITY)
  // ──────────────────────────────────────────────────────────────────────────
  const [
    totalStudents,
    photosCount,
    qrCount,
    readyForPrintCount,
    recentStudents,
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
    prisma.student.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        studentId: true,
        fullName: true,
        grade: true,
        department: true,
        photoPath: true,
        qrCodeData: true,
        createdAt: true,
      },
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
        recentStudents,
        recentBatches: [],
        missingPhotos,
        missingQRs,
      }}
      notice={searchParams.notice}
    />
  );
}
