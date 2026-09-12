import React from "react";
import Link from "next/link";
import { Database, ArrowLeft, LogOut } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { redirect } from "next/navigation";
import { DatabaseClient } from "./client";

export const metadata = {
  title: "Database Telemetry & Log Management | SILICON LABS",
  description: "Monitor database metrics, visual demographics pie charts, and operational audit logs",
};

export default async function AdminDatabasePage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  // Aggregate database statistics in parallel
  const [
    studentCount,
    verifiedPhotoCount,
    userCount,
    templateCount,
    gradeGroups,
    roleGroups,
    auditLogs,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({
      where: {
        photoPath: { not: null },
      },
    }),
    prisma.user.count(),
    prisma.cardTemplate.count(),
    prisma.student.groupBy({
      by: ["grade"],
      _count: { id: true },
      orderBy: { grade: "asc" },
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
      orderBy: { role: "asc" },
    }),
    prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, role: true } } },
    }),
  ]);

  const missingPhotoCount = Math.max(0, studentCount - verifiedPhotoCount);

  const gradeCohorts = gradeGroups.map((g) => ({
    grade: g.grade || "Unassigned",
    count: g._count.id,
  }));

  const userRoles = roleGroups.map((r) => ({
    role: r.role,
    count: r._count.id,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-[#080808] dark:text-[#f2f7f4]">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7e1] dark:border-[#223126] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">
            <Link href="/dashboard" className="hover:text-[#8fe617] transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-[#080808] dark:text-[#f2f7f4] font-semibold">Administration</span>
            <span>/</span>
            <span className="text-[#8fe617]">Database &amp; Logs</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Database className="h-6 w-6 text-[#8fe617]" />
            <span>Database Telemetry &amp; Log Management</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-1 font-mono">
            Monitor persistence storage, inspect visual demographic distributions, and manage operational audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 px-3.5 py-2 text-xs font-mono font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-xs cursor-pointer"
              title="End admin session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out Admin</span>
            </button>
          </form>
        </div>
      </div>

      <DatabaseClient
        metrics={{
          studentCount,
          userCount,
          templateCount,
          verifiedPhotoCount,
          missingPhotoCount,
        }}
        gradeCohorts={gradeCohorts}
        userRoles={userRoles}
        initialAuditLogs={auditLogs}
      />
    </div>
  );
}
