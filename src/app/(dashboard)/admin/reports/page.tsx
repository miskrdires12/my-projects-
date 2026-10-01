import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAggregatedReportsAction } from "@/actions/reports";
import ReportsView from "@/components/admin/ReportsView";

export default async function AdminReportsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Both SUPER_ADMIN and ADMIN have access to data reports
  if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN") {
    redirect(session.role === "SENDER" ? "/register" : "/dashboard");
  }

  const reportsRes = await getAggregatedReportsAction("daily");
  const initialData = reportsRes.success ? reportsRes : null;

  return <ReportsView initialData={initialData} userRole={session.role} />;
}
