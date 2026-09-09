import React from "react";
import Link from "next/link";
import { Database, Activity, HardDrive, CheckCircle2, ArrowLeft, LogOut } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { redirect } from "next/navigation";

export default async function AdminDatabasePage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  const [studentCount, userCount, templateCount, auditLogs] = await Promise.all([
    prisma.student.count(),
    prisma.user.count(),
    prisma.cardTemplate.count(),
    prisma.auditLog.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mb-1">
            <Link href="/dashboard" className="hover:text-black transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-black font-semibold">Administration</span>
            <span>/</span>
            <span className="text-black">Database & Logs</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            <Database className="h-5 w-5 text-black" />
            <span>System Health & Database Telemetry</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Monitor persistence metrics, operational throughput, and system audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-mono font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-xs"
              title="End admin session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out Admin</span>
            </button>
          </form>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Student Storage</span>
            <HardDrive className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{studentCount}</span>
            <span className="text-[11px] text-foreground-muted">Total Rows</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Identity Operators</span>
            <Activity className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{userCount}</span>
            <span className="text-[11px] text-foreground-muted">Accounts Provisioned</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono uppercase">
            <span>Vector Card Templates</span>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-foreground">{templateCount}</span>
            <span className="text-[11px] text-accent font-medium">Active CR80 Designs</span>
          </div>
        </div>
      </div>

      {/* System Audit Log Stream */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
        <div className="border-b border-border px-6 py-4 bg-surface-secondary">
          <h2 className="text-sm font-semibold text-foreground">Operational Audit Log Stream</h2>
          <p className="text-xs text-foreground-muted">Cryptographically auditable security and CRUD telemetry</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-tertiary text-foreground-muted font-mono uppercase text-[11px]">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Entity Type</th>
                <th className="px-6 py-3">Operator</th>
                <th className="px-6 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-foreground-muted font-sans">
                    No system audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-secondary/50">
                    <td className="px-6 py-3 text-foreground-muted">
                      {new Date(log.createdAt).toLocaleTimeString()} • {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-accent">{log.action}</td>
                    <td className="px-6 py-3 text-foreground">{log.entityType}</td>
                    <td className="px-6 py-3 text-foreground-muted">
                      {log.user ? `${log.user.username} (${log.user.role})` : "SYSTEM / GUEST"}
                    </td>
                    <td className="px-6 py-3 text-foreground-subtle truncate max-w-xs">
                      {log.metadata ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
