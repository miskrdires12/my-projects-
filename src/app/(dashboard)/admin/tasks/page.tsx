import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSenderTasksAction, getSenderEfficiencyAnalyticsAction } from "@/actions/tasks";
import TaskManagementView from "@/components/admin/TaskManagementView";

export default async function AdminTasksPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Only SUPER_ADMIN and ADMIN are allowed to supervise tasks
  if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN") {
    redirect(session.role === "SENDER" ? "/register" : "/dashboard");
  }

  const [tasksRes, analyticsRes] = await Promise.all([
    getSenderTasksAction(),
    getSenderEfficiencyAnalyticsAction(),
  ]);

  const tasks = tasksRes.success ? tasksRes.tasks : [];
  const analytics = analyticsRes.success && analyticsRes.analytics ? analyticsRes.analytics : {
    totalSenders: 0,
    activeSenders: 0,
    totalTasksAssigned: 0,
    completedTasksTotal: 0,
    totalMistakesRecorded: 0,
    senderProfiles: [],
  };

  return (
    <TaskManagementView
      initialTasks={tasks as any}
      analytics={analytics}
      currentUserRole={session.role}
    />
  );
}
