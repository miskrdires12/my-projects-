import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut } from "lucide-react";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./client";

export const metadata = {
  title: "Operator Provisioning & RBAC | SILICON LABS",
  description: "Provision operator accounts and assign role privileges",
};

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
            <span className="text-[#8fe617]">Security &amp; Roles</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-[#8fe617]" />
            <span>Operator Provisioning &amp; RBAC Control</span>
          </h1>
          <p className="text-xs text-[#6b7771] dark:text-[#8a9e93] mt-1 font-mono">
            Control institutional access privileges, provision operator credentials, and manage workstation accounts
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

      <UsersClient initialUsers={users} currentUserId={session.userId} />
    </div>
  );
}
