"use server";

// ============================================================================
// STUDENT BRIDGE — GLOBAL SYSTEM SETTINGS SERVER ACTIONS
// When Super Admin configures system settings, they apply globally to all users.
// Supports dynamic branch and school management for all regional campuses.
// ============================================================================

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  DEFAULT_BRANCH_SCHOOLS,
  mergeBranchSchools,
  normalizeBranchName,
} from "@/lib/branch-schools";
import { revalidatePath } from "next/cache";

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
  branchSchools?: Record<string, string[]>;
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
  branchSchools: DEFAULT_BRANCH_SCHOOLS,
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
    const mergedSchools = mergeBranchSchools(parsed.branchSchools);

    return {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...parsed,
      branchSchools: mergedSchools,
    };
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

    if (updates.branchSchools) {
      merged.branchSchools = mergeBranchSchools(updates.branchSchools);
    }

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

    revalidatePath("/settings");
    revalidatePath("/register");
    revalidatePath("/students");

    return { success: true, settings: merged };
  } catch (err: any) {
    console.error("[updateGlobalSystemSettingsAction] Error:", err);
    return { success: false, error: err?.message || "Failed to update global system settings." };
  }
}

/**
 * Fetches active branch schools dictionary for all campuses.
 * Accessible to all authenticated users (Sender, Receiver, Admin, Super Admin).
 */
export async function getBranchSchoolsAction(): Promise<Record<string, string[]>> {
  try {
    const settings = await getGlobalSystemSettingsAction();
    return settings.branchSchools || DEFAULT_BRANCH_SCHOOLS;
  } catch {
    return DEFAULT_BRANCH_SCHOOLS;
  }
}

/**
 * Adds a new school to a specific branch.
 * Callable ONLY by Super Admin.
 */
export async function addSchoolToBranchAction(
  branch: string,
  schoolName: string
): Promise<{ success: boolean; branchSchools?: Record<string, string[]>; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized clearance level. Only Super Admin can register schools.",
      };
    }

    const cleanBranch = normalizeBranchName(branch);
    const cleanSchool = schoolName.trim();

    if (!cleanSchool) {
      return { success: false, error: "School name cannot be blank." };
    }

    const settings = await getGlobalSystemSettingsAction();
    const branchSchools = mergeBranchSchools(settings.branchSchools);

    if (!branchSchools[cleanBranch]) {
      branchSchools[cleanBranch] = [];
    }

    // Check if school already exists (case-insensitive)
    const exists = branchSchools[cleanBranch].some(
      (s) => s.trim().toLowerCase() === cleanSchool.toLowerCase()
    );

    if (exists) {
      return {
        success: false,
        error: `School "${cleanSchool}" already exists in the ${cleanBranch} branch.`,
      };
    }

    branchSchools[cleanBranch].push(cleanSchool);

    const updateRes = await updateGlobalSystemSettingsAction({
      branchSchools,
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || "Failed to save branch schools." };
    }

    return { success: true, branchSchools };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal error adding school." };
  }
}

/**
 * Removes a school from a specific branch.
 * Callable ONLY by Super Admin.
 */
export async function removeSchoolFromBranchAction(
  branch: string,
  schoolName: string
): Promise<{ success: boolean; branchSchools?: Record<string, string[]>; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized clearance level. Only Super Admin can remove schools.",
      };
    }

    const cleanBranch = normalizeBranchName(branch);
    const cleanSchool = schoolName.trim();

    const settings = await getGlobalSystemSettingsAction();
    const branchSchools = mergeBranchSchools(settings.branchSchools);

    if (!branchSchools[cleanBranch]) {
      return { success: false, error: `Branch "${cleanBranch}" not found.` };
    }

    branchSchools[cleanBranch] = branchSchools[cleanBranch].filter(
      (s) => s.trim().toLowerCase() !== cleanSchool.toLowerCase()
    );

    const updateRes = await updateGlobalSystemSettingsAction({
      branchSchools,
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || "Failed to update branch schools." };
    }

    return { success: true, branchSchools };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal error removing school." };
  }
}

/**
 * Adds a new branch to the system.
 * Callable ONLY by Super Admin.
 */
export async function addBranchAction(
  branchName: string
): Promise<{ success: boolean; branchSchools?: Record<string, string[]>; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized clearance level. Only Super Admin can register branches.",
      };
    }

    const cleanBranch = branchName.trim();
    if (!cleanBranch) {
      return { success: false, error: "Branch name cannot be empty." };
    }

    const settings = await getGlobalSystemSettingsAction();
    const branchSchools = mergeBranchSchools(settings.branchSchools);

    if (branchSchools[cleanBranch]) {
      return { success: false, error: `Branch "${cleanBranch}" already exists.` };
    }

    branchSchools[cleanBranch] = [];

    const updateRes = await updateGlobalSystemSettingsAction({
      branchSchools,
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || "Failed to register branch." };
    }

    return { success: true, branchSchools };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal error adding branch." };
  }
}

/**
 * Deletes a branch from the system.
 * Callable ONLY by Super Admin.
 */
export async function removeBranchAction(
  branchName: string
): Promise<{ success: boolean; branchSchools?: Record<string, string[]>; error?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized clearance level. Only Super Admin can remove branches.",
      };
    }

    const cleanBranch = branchName.trim();
    const settings = await getGlobalSystemSettingsAction();
    const branchSchools = mergeBranchSchools(settings.branchSchools);

    if (!branchSchools[cleanBranch]) {
      return { success: false, error: `Branch "${cleanBranch}" does not exist.` };
    }

    delete branchSchools[cleanBranch];

    const updateRes = await updateGlobalSystemSettingsAction({
      branchSchools,
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || "Failed to remove branch." };
    }

    return { success: true, branchSchools };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal error removing branch." };
  }
}

/**
 * Resets branch schools to factory defaults (with Warka in Addis Ababa).
 * Callable ONLY by Super Admin.
 */
export async function resetBranchSchoolsAction(): Promise<{
  success: boolean;
  branchSchools?: Record<string, string[]>;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return {
        success: false,
        error: "Unauthorized clearance level. Only Super Admin can reset branch schools.",
      };
    }

    const updateRes = await updateGlobalSystemSettingsAction({
      branchSchools: DEFAULT_BRANCH_SCHOOLS,
    });

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || "Failed to reset branch schools." };
    }

    return { success: true, branchSchools: DEFAULT_BRANCH_SCHOOLS };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal error resetting branch schools." };
  }
}
