import React from "react";
import Link from "next/link";
import { Users, UserPlus, Printer, Download, QrCode, ArrowLeft, FileSpreadsheet } from "lucide-react";
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
    qrStatus?: string;
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
  const qrStatus = searchParams.qrStatus ?? "ALL";

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

  if (qrStatus === "HAS_QR") {
    where.qrCodes = { some: { status: "MATCHED" } };
  } else if (qrStatus === "MISSING_QR") {
    where.qrCodes = { none: {} };
  }

  // Optimized parallel queries for high performance (20,000+ students)
  const [totalCount, students, grades, departments, batches, gradeGroups] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        batch: { select: { batchNumber: true, title: true } },
        photos: { take: 1, orderBy: { createdAt: "desc" } },
        qrCodes: { take: 1, orderBy: { createdAt: "desc" } },
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </Link>
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              RECEIVER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">DIRECTORY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Users className="h-6 w-6 text-accent" />
            <span>Student Credential Directory</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Verified student roster — High-performance credential management, editing, and batch exports
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/api/students/export-csv?format=xlsx${grade !== "ALL" ? `&grade=${encodeURIComponent(grade)}` : ""}`}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            title={grade !== "ALL" ? `Download ${grade} directory as Excel (.xlsx)` : "Download full database student directory as Excel (.xlsx)"}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>{grade !== "ALL" ? `Export ${grade} Excel` : "Export Excel"}</span>
          </a>

          <a
            href={`/api/students/export-csv?format=csv${grade !== "ALL" ? `&grade=${encodeURIComponent(grade)}` : ""}`}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
            title={grade !== "ALL" ? `Download ${grade} directory as CSV` : "Download full database student directory as CSV"}
          >
            <Download className="h-3.5 w-3.5 text-foreground-muted" />
            <span>{grade !== "ALL" ? `CSV (${grade})` : "CSV"}</span>
          </a>

          <Link
            href="/students/download-photos"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download Photos</span>
          </Link>

          <Link
            href="/students/qr-import"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
          >
            <QrCode className="h-4 w-4 text-accent" />
            <span>Import QR</span>
          </Link>

          {(session.role === "SENDER" || session.role === "ADMIN") && (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover shadow-glow transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Enroll Student</span>
            </Link>
          )}

          <Link
            href="/print-engine"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-secondary transition-colors"
          >
            <Printer className="h-4 w-4 text-accent" />
            <span>8-Up Print Engine</span>
          </Link>
        </div>
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
