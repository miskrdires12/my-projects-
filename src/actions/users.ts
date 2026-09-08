"use server";

// ============================================================================
// STUDENT BRIDGE — USER & ROLE ADMINISTRATION SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth, hashPassword } from "@/lib/auth";
import { createUserSchema, type CreateUserInput } from "@/lib/validations";
import type { UserRole } from "@/types/auth";

export async function createUserAction(input: CreateUserInput) {
  const session = await requireAuth("user:create");

  const validated = createUserSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message ?? "Invalid user data",
    };
  }

  const { username, email, password, role } = validated.data;

  // Check unique username & email
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existing) {
    return {
      success: false,
      error: "A user with this username or email already exists.",
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: role as UserRole,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "USER_CREATE",
      entityType: "USER",
      entityId: user.id,
      metadata: JSON.stringify({ username: user.username, role: user.role }),
    },
  });

  revalidatePath("/admin/users");
  return { success: true, userId: user.id };
}

export async function deleteUserAction(id: string) {
  const session = await requireAuth("user:delete");

  if (session.userId === id) {
    return { success: false, error: "Cannot delete your own active administrator account." };
  }

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "USER_DELETE",
      entityType: "USER",
      entityId: id,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
