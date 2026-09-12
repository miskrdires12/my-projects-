import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsClient } from "./client";

export const metadata = {
  title: "Admin System & Production Settings | SILICON LABS",
  description: "Administrative control console for CSV schemas, local photo directories, and central database maintenance",
};

export default async function SettingsPage() {
  const session = await getSession();

  // Strict server-side RBAC guard: Only administrators can access system settings
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  return <SettingsClient />;
}
