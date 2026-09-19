import React from "react";
import { Shield } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./client";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      currentStatus: true,
      sessionStartedAt: true,
      sessionEndedAt: true,
      lastLoginAt: true,
      lastActiveAt: true,
      workSessionCount: true,
      totalWorkMinutes: true,
      boundDeviceId: true,
      boundDeviceInfo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const users = await Promise.all(
    rawUsers.map(async (u) => {
      const sentCount = await prisma.student.count({
        where: {
          OR: [
            { senderId: u.id },
            { senderName: u.username },
          ],
        },
      });
      return {
        ...u,
        studentsSentCount: sentCount,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          <span>User & RBAC Administration</span>
        </h1>
        <p className="text-xs text-foreground-muted mt-1">
          Control institutional access privileges, provision credentials, and assign operator roles
        </p>
      </div>

      <UsersClient initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
