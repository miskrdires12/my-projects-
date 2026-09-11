import React from "react";
import { getSession } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const activeSession = session || {
    userId: "operator-001",
    username: "Station Operator",
    email: "operator@studentbridge.internal",
    role: "SENDER" as const,
  };

  return (
    <DashboardShell
      session={{
        username: activeSession.username,
        role: activeSession.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
