import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./client";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-6">
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
            <span className="text-black">Security & Roles</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            <Shield className="h-5 w-5 text-black" />
            <span>User & RBAC Administration</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Control institutional access privileges, provision credentials, and assign operator roles
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

      <UsersClient initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
