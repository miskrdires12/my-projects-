import React from "react";
import { Database } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStorageQuotaMetrics } from "@/lib/storage-quota-monitor";
import { DatabaseAdminClient } from "@/components/admin/DatabaseAdminClient";

export default async function AdminDatabasePage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  const [
    quota,
    lastReport,
    studentRows,
    verifiedPhotosCount,
    missingPhotosCount,
    auditLogs,
  ] = await Promise.all([
    getStorageQuotaMetrics(),
    prisma.storageReconciliationReport.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    prisma.student.count(),
    prisma.student.count({ where: { photoIntegrityStatus: "PHOTO_VERIFIED" } }),
    prisma.student.count({ where: { photoIntegrityStatus: "PHOTO_MISSING" } }),
    prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Database className="h-5 w-5 text-accent" />
          <span>System Health, Quota Telemetry &amp; Storage Lifecycle</span>
        </h1>
        <p className="text-xs text-foreground-muted mt-1">
          Real-time storage quota gauges, bidirectional reconciliation runner, and cryptographically auditable security telemetry
        </p>
      </div>

      {/* Storage Quota Telemetry, Health Gauges & Reconciliation Client */}
      <DatabaseAdminClient
        quota={quota}
        studentRows={studentRows}
        verifiedPhotosCount={verifiedPhotosCount}
        missingPhotosCount={missingPhotosCount}
        lastReport={lastReport}
      />

      {/* System Audit Log Stream */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
        <div className="border-b border-border px-6 py-4 bg-surface-secondary flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Operational Audit Log Stream</h2>
            <p className="text-xs text-foreground-muted">
              Tamper-evident logs of student creations, deletions, storage purges, and security events
            </p>
          </div>
          <span className="text-[10px] font-mono text-foreground-muted uppercase">
            Append-Only Audit Trail
          </span>
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
                    <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()} • {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-accent">{log.action}</td>
                    <td className="px-6 py-3 text-foreground">{log.entityType}</td>
                    <td className="px-6 py-3 text-foreground-muted">
                      {log.user ? `${log.user.username} (${log.user.role})` : "SYSTEM / GUEST"}
                    </td>
                    <td className="px-6 py-3 text-foreground-subtle truncate max-w-md">
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
