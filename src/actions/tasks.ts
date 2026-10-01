"use server";

// ============================================================================
// STUDENT BRIDGE — TASK MANAGEMENT & SENDER EFFICIENCY SERVER ACTIONS
// For Super Admin and Admin: assign tasks to senders, monitor progress & efficiency
// ============================================================================

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedToId: string;
  assignedToEmail: string;
  school?: string;
  section?: string;
  targetCount: number;
  deadline?: string;
}

/**
 * Creates a new task assigned to a sender.
 * Accessible to SUPER_ADMIN and ADMIN.
 */
export async function createSenderTaskAction(input: CreateTaskInput) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized. Super Admin or Admin access required." };
    }

    if (!input.title?.trim()) {
      return { success: false, error: "Task title is required." };
    }
    if (!input.assignedToEmail?.trim()) {
      return { success: false, error: "Sender email is required." };
    }

    const task = await prisma.senderTask.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        assignedToId: input.assignedToId || input.assignedToEmail,
        assignedToEmail: input.assignedToEmail.trim().toLowerCase(),
        assignedByRole: session.role,
        assignedByEmail: session.email,
        school: input.school?.trim() || null,
        section: input.section?.trim() || null,
        targetCount: Number(input.targetCount) || 100,
        status: "PENDING",
        deadline: input.deadline ? new Date(input.deadline) : null,
      },
    });

    revalidatePath("/admin/tasks");
    revalidatePath("/admin/telemetry");
    return { success: true, task };
  } catch (err: any) {
    console.error("[createSenderTaskAction] Error:", err);
    return { success: false, error: err?.message || "Failed to create sender task." };
  }
}

/**
 * Retrieves all tasks with optional filters.
 */
export async function getSenderTasksAction(senderEmail?: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized", tasks: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (senderEmail && senderEmail !== "ALL") {
      where.assignedToEmail = senderEmail.trim().toLowerCase();
    }

    // If caller is SENDER, restrict to their own tasks
    if (session.role === "SENDER") {
      where.assignedToEmail = session.email.trim().toLowerCase();
    }

    const tasks = await prisma.senderTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, tasks };
  } catch (err: any) {
    console.error("[getSenderTasksAction] Error:", err);
    return { success: false, error: err?.message || "Failed to fetch tasks.", tasks: [] };
  }
}

/**
 * Updates task status or completed count.
 */
export async function updateSenderTaskAction(
  taskId: string,
  updates: { status?: string; completedCount?: number }
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (updates.status) data.status = updates.status;
    if (typeof updates.completedCount === "number") data.completedCount = updates.completedCount;

    const task = await prisma.senderTask.update({
      where: { id: taskId },
      data,
    });

    revalidatePath("/admin/tasks");
    return { success: true, task };
  } catch (err: any) {
    console.error("[updateSenderTaskAction] Error:", err);
    return { success: false, error: err?.message || "Failed to update task." };
  }
}

/**
 * Aggregates overall sender efficiency, task progress, and mistake analysis.
 */
export async function getSenderEfficiencyAnalyticsAction() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
      return { success: false, error: "Unauthorized." };
    }

    // 1. Fetch all senders
    const senders = await prisma.user.findMany({
      where: { role: "SENDER" },
      select: {
        id: true,
        email: true,
        username: true,
        boundDeviceInfo: true,
        lastActiveAt: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    // 2. Fetch all tasks
    const allTasks = await prisma.senderTask.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch mistake counts per sender
    const mistakes = await prisma.senderMistake.findMany({
      select: {
        senderId: true,
        senderName: true,
      },
    });

    // Count mistakes per sender
    const mistakeMap: Record<string, number> = {};
    mistakes.forEach((m) => {
      const key = (m.senderId || m.senderName || "Unknown").toLowerCase();
      mistakeMap[key] = (mistakeMap[key] || 0) + 1;
    });

    // 4. Fetch total enrolled students per sender
    const studentCounts = await prisma.student.groupBy({
      by: ["senderId"],
      _count: { id: true },
    });

    const enrolledMap: Record<string, number> = {};
    studentCounts.forEach((sc) => {
      if (sc.senderId) {
        enrolledMap[sc.senderId.toLowerCase()] = sc._count.id;
      }
    });

    // 5. Build detailed efficiency profile per sender
    const senderProfiles = senders.map((s) => {
      const emailKey = s.email.toLowerCase();
      const idKey = s.id.toLowerCase();
      const nameKey = (s.username || "").toLowerCase();

      const userTasks = allTasks.filter(
        (t) => t.assignedToEmail.toLowerCase() === emailKey || t.assignedToId.toLowerCase() === idKey
      );

      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter((t) => t.status === "COMPLETED").length;
      const inProgressTasks = userTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING").length;

      const totalEnrolled = enrolledMap[idKey] || enrolledMap[emailKey] || enrolledMap[nameKey] || 0;
      const totalMistakes = mistakeMap[idKey] || mistakeMap[emailKey] || mistakeMap[nameKey] || 0;

      // Accuracy formula: 100% minus percentage of mistake records
      let accuracyRate = 100;
      if (totalEnrolled > 0) {
        const errorPct = (totalMistakes / totalEnrolled) * 100;
        accuracyRate = Math.max(0, Math.round((100 - errorPct) * 10) / 10);
      }

      const totalTargetStudents = userTasks.reduce((sum, t) => sum + t.targetCount, 0);
      const totalAchievedStudents = userTasks.reduce((sum, t) => sum + t.completedCount, 0);
      const taskProgressRate = totalTargetStudents > 0 
        ? Math.min(100, Math.round((totalAchievedStudents / totalTargetStudents) * 100))
        : 100;

      const isUserActive = Boolean(
        s.lastActiveAt && (new Date().getTime() - new Date(s.lastActiveAt).getTime() < 3600000 * 24)
      );

      return {
        id: s.id,
        email: s.email,
        fullName: s.username,
        stationName: s.boundDeviceInfo || `Station (${s.username})`,
        isActive: isUserActive,
        lastActive: s.lastActiveAt || s.updatedAt,
        totalEnrolled,
        totalMistakes,
        accuracyRate,
        totalTasks,
        completedTasks,
        inProgressTasks,
        taskProgressRate,
      };
    });

    const activeCount = senderProfiles.filter((s) => s.isActive).length;

    return {
      success: true,
      analytics: {
        totalSenders: senders.length,
        activeSenders: activeCount,
        totalTasksAssigned: allTasks.length,
        completedTasksTotal: allTasks.filter((t) => t.status === "COMPLETED").length,
        totalMistakesRecorded: mistakes.length,
        senderProfiles,
      },
    };
  } catch (err: any) {
    console.error("[getSenderEfficiencyAnalyticsAction] Error:", err);
    return { success: false, error: err?.message || "Failed to load efficiency analytics." };
  }
}
