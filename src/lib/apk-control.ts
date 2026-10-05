import prisma from "@/lib/prisma";

export interface ApkControlConfig {
  isApkBlocked: boolean;
  approvedSchools: string[];
  blockReason?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_CONFIG: ApkControlConfig = {
  isApkBlocked: false,
  approvedSchools: ["Warka", "Sena Yerosen"],
  blockReason: "Mobile APK API access is currently restricted by Super Admin.",
};

const SETTING_KEY = "apk_api_access_control";

/**
 * Retrieves the global APK API access control settings.
 */
export async function getApkControlConfig(): Promise<ApkControlConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_CONFIG;
    }

    const parsed = JSON.parse(setting.value);
    return {
      isApkBlocked: Boolean(parsed.isApkBlocked),
      approvedSchools: Array.isArray(parsed.approvedSchools)
        ? parsed.approvedSchools
        : DEFAULT_CONFIG.approvedSchools,
      blockReason: parsed.blockReason || DEFAULT_CONFIG.blockReason,
      updatedAt: setting.updatedAt?.toISOString(),
      updatedBy: setting.updatedBy || undefined,
    };
  } catch (err) {
    console.warn("[getApkControlConfig] Fallback to default:", err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Updates the global APK API access control settings (Super Admin only).
 */
export async function updateApkControlConfig(
  updates: Partial<ApkControlConfig>,
  userEmail?: string
): Promise<ApkControlConfig> {
  const current = await getApkControlConfig();
  const merged: ApkControlConfig = {
    isApkBlocked:
      updates.isApkBlocked !== undefined
        ? updates.isApkBlocked
        : current.isApkBlocked,
    approvedSchools:
      updates.approvedSchools !== undefined
        ? Array.from(new Set(updates.approvedSchools.map((s) => s.trim()).filter(Boolean)))
        : current.approvedSchools,
    blockReason:
      updates.blockReason !== undefined ? updates.blockReason : current.blockReason,
  };

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: {
      value: JSON.stringify(merged),
      updatedBy: userEmail || "SUPER_ADMIN",
    },
    create: {
      id: "apk_control",
      key: SETTING_KEY,
      value: JSON.stringify(merged),
      updatedBy: userEmail || "SUPER_ADMIN",
    },
  });

  return merged;
}

/**
 * Verifies whether a mobile APK request is permitted.
 * Checks global block status and per-school approval.
 */
export async function verifyApkAccess(
  request: Request,
  schoolToCheck?: string | null
): Promise<{ allowed: boolean; error?: string; status?: number }> {
  try {
    const config = await getApkControlConfig();

    // 1. Check if APK access is globally blocked
    if (config.isApkBlocked) {
      return {
        allowed: false,
        error: config.blockReason || "Mobile APK API access has been blocked by Super Admin.",
        status: 403,
      };
    }

    // 2. Determine school from param, header, or query
    let school = schoolToCheck?.trim();
    if (!school) {
      const headerSchool = request.headers.get("X-School-Selection") || request.headers.get("x-school");
      if (headerSchool) school = headerSchool.trim();
    }

    // 3. If a school is specified, verify it is approved
    if (school && school.length > 0) {
      const normalizedSchool = school.toLowerCase();
      const isApproved = config.approvedSchools.some(
        (app) => app.trim().toLowerCase() === normalizedSchool
      );

      if (!isApproved) {
        return {
          allowed: false,
          error: `School selection '${school}' is pending Super Admin approval. Please contact administrator.`,
          status: 403,
        };
      }
    }

    return { allowed: true };
  } catch (err: any) {
    console.error("[verifyApkAccess] Verification error:", err);
    // Fail-open for safety, but log error
    return { allowed: true };
  }
}
