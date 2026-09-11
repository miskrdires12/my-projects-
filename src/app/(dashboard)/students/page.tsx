import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentDirectoryClient } from "./client";
import { rehydrateDatabaseFromCloud } from "@/lib/sync-engine";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    grade?: string;
    status?: string;
    batchId?: string;
    department?: string;
    photoStatus?: string;
    page?: string;
    pageSize?: string;
  };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const query = searchParams.q ?? "";
  const grade = searchParams.grade ?? "ALL";
  const status = searchParams.status ?? "ALL";
  const batchId = searchParams.batchId ?? "ALL";
  const department = searchParams.department ?? "ALL";
  const photoStatus = searchParams.photoStatus ?? "ALL";

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.pageSize || "25", 10)));

  // If local database is empty on this serverless container, auto-rehydrate from Cloud Sync
  const preCount = await prisma.student.count();
  if (preCount === 0) {
    await rehydrateDatabaseFromCloud();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (query.trim() !== "") {
    const q = query.trim();
    where.OR = [
      { fullName: { contains: q } },
      { studentId: { contains: q } },
      { rollNumber: { contains: q } },
      { phone: { contains: q } },
      { department: { contains: q } },
      { school: { contains: q } },
    ];
  }

  if (grade !== "ALL") where.grade = grade;
  if (status !== "ALL") where.status = status;
  if (batchId !== "ALL") where.batchId = batchId;
  if (department !== "ALL") where.department = department;

  if (photoStatus === "HAS_PHOTO") {
    where.photoPath = { not: null };
  } else if (photoStatus === "MISSING_PHOTO") {
    where.photoPath = null;
  }

  // Optimized parallel queries for high performance (20,000+ students)
  const [totalCount, students, grades, departments, batches, gradeGroups] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        batch: { select: { batchNumber: true, title: true } },
        photos: { take: 1, orderBy: { createdAt: "desc" } },
        customValues: { include: { customField: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.findMany({
      select: { grade: true },
      distinct: ["grade"],
    }),
    prisma.student.findMany({
      select: { department: true },
      distinct: ["department"],
      where: { department: { not: null } },
    }),
    prisma.transferBatch.findMany({
      select: { id: true, batchNumber: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.groupBy({
      by: ["grade"],
      _count: { id: true },
    }),
  ]);

  const uniqueGrades = grades.map((g) => g.grade).filter(Boolean);
  const uniqueDepartments = departments.map((d) => d.department!).filter(Boolean);
  const gradeCountMap: Record<string, number> = {};
  gradeGroups.forEach((g) => {
    if (g.grade) gradeCountMap[g.grade] = g._count.id;
  });

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 pb-12">
      {/* Sleek Top Navigation Bar: Back to Dashboard */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border bg-surface text-foreground font-semibold text-sm shadow-xs hover:border-[#8fe617] hover:bg-[#8fe617]/10 hover:text-[#8fe617] transition-all group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 text-[#8fe617]" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Interactive Directory Table with True Server-Side Pagination */}
      <StudentDirectoryClient
        students={students as any}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        grades={uniqueGrades}
        departments={uniqueDepartments}
        batches={batches}
        userRole={session.role as any}
        gradeCounts={gradeCountMap}
      />
    </div>
  );
}
