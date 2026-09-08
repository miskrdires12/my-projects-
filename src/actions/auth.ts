"use server";

// ============================================================================
// STUDENT BRIDGE — AUTHENTICATION SERVER ACTIONS
// ============================================================================

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, getSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import type { SessionPayload } from "@/types/auth";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult<SessionPayload>> {
  const rawData = {
    emailOrUsername: formData.get("emailOrUsername"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input parameters",
    };
  }

  const result = await login({
    emailOrUsername: parsed.data.emailOrUsername,
    passwordPlain: parsed.data.password,
  });

  if (!result.success || !result.user) {
    return {
      success: false,
      error: result.error ?? "Invalid username or password",
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: result.user,
  };
}

export async function logoutAction(): Promise<void> {
  await logout();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getSessionAction(): Promise<SessionPayload | null> {
  return getSession();
}
