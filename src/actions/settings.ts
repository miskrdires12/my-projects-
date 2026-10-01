"use server";

// ============================================================================
// STUDENT BRIDGE — GLOBAL SYSTEM SETTINGS SERVER ACTIONS
// When Super Admin configures system settings, they apply globally to all users.
// ============================================================================

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export interface GlobalSystemSettings {
  defaultGrade: string;
  defaultAcademicYear: string;
  defaultSchool: string;
  defaultSection: string;
  enforceAutoCapitalize: boolean;
  enforceSlashRejection: boolean;
  enforcePhonePrefix2517: boolean;
  requirePhotoConfirmReminder: boolean;
  defaultPageSize: number;
}

const DEFAULT_GLOBAL_SETTINGS: GlobalSystemSettings = {
  defaultGrade: "10",
  defaultAcademicYear: "2026-2027",
  defaultSchool: "Sena Yerosen",
  defaultSection: "Adama",
  enforceAutoCapitalize: true,
  enforceSlashRejection: true,
  enforcePhonePrefix2517: true,
  requirePhotoConfirmReminder: true,
  defaultPageSize: 100,
};

/**
 * Fetches the active global system settings.
 * Available to all authenticated users.
 */
export async function getGlobalSystemSettingsAction(): Promise<GlobalSystemSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "global_platform_config" },
    });

    if (!setting || !setting.value) {
      return DEFAULT_GLOBAL_SETTINGS;
    }

    const parsed = JSON.parse(setting.value);
    return { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };
  } catch (err) {
    console.warn("[getGlobalSystemSettingsAction] Fallback to defaults:", err);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

/**
 * Saves global system settings.
 * ONLY callable by SUPER_ADMIN. Applies to all users across the platform.
 */
export async function updateGlobalSystemSettingsAction(
  updates: Partial<GlobalSystemSettings>
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Only Super Admin can modify global system settings that apply to all users.",
      };
    }

    const current = await getGlobalSystemSettingsAction();
    const merged = { ...current, ...updates };

    await prisma.systemSetting.upsert({
      where: { key: "global_platform_config" },
      update: {
        value: JSON.stringify(merged),
        updatedBy: session.email,
      },
      create: {
        id: "global",
        key: "global_platform_config",
        value: JSON.stringify(merged),
        updatedBy: session.email,
      },
    });

    return { success: true, settings: merged };
  } catch (err: any) {
    console.error("[updateGlobalSystemSettingsAction] Error:", err);
    return { success: false, error: err?.message || "Failed to update global system settings." };
  }
}
