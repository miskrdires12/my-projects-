// ============================================================================
// STUDENT BRIDGE — REGIONAL CAMPUS BRANCHES & SCHOOLS REPOSITORY
// Default branches and schools with dynamic Super Admin customization.
// ============================================================================

export const DEFAULT_BRANCH_SCHOOLS: Record<string, string[]> = {
  Adama: ["Sena Yerosen", "Debebech", "Yacine", "Odda"],
  "Addis Ababa": ["YMS", "Adika Youth", "School Of America", "Warka"],
  Mojjo: ["Mojjo"],
};

export const BRANCH_STORAGE_KEY = "sb_branch_schools_v1";

/**
 * Normalizes branch names for case-insensitive matching
 */
export function normalizeBranchName(branch: string): string {
  if (!branch) return "Adama";
  const b = branch.trim().toLowerCase();
  if (b.includes("adama")) return "Adama";
  if (b.includes("addis") || b.includes("adis") || b.includes("ababa")) return "Addis Ababa";
  if (b.includes("mojjo") || b.includes("mojo")) return "Mojjo";
  return branch.trim();
}

/**
 * Returns the branch that contains the specified school
 */
export function getBranchForSchool(
  schoolName: string,
  branchMap: Record<string, string[]> = DEFAULT_BRANCH_SCHOOLS
): string {
  if (!schoolName) return "Adama";
  const cleanSchool = schoolName.trim().toLowerCase();
  for (const [branch, schools] of Object.entries(branchMap)) {
    if (schools.some((s) => s.trim().toLowerCase() === cleanSchool)) {
      return branch;
    }
  }
  return "Adama";
}

/**
 * Returns merged branch schools from stored custom settings and defaults
 */
export function mergeBranchSchools(
  customBranchSchools?: Record<string, string[]> | null
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  // First copy all default branches and schools (ensuring Warka is included)
  for (const [branch, schools] of Object.entries(DEFAULT_BRANCH_SCHOOLS)) {
    result[branch] = [...schools];
  }

  if (!customBranchSchools || typeof customBranchSchools !== "object") {
    return result;
  }

  for (const [branch, schools] of Object.entries(customBranchSchools)) {
    if (Array.isArray(schools)) {
      const existing = result[branch] || [];
      const set = new Set([...existing, ...schools.map((s) => String(s).trim()).filter(Boolean)]);
      result[branch] = Array.from(set);
    }
  }

  // Guarantee Warka is always in Addis Ababa unless explicitly deleted
  if (result["Addis Ababa"] && !result["Addis Ababa"].includes("Warka") && !customBranchSchools["Addis Ababa"]) {
    result["Addis Ababa"].push("Warka");
  }

  return result;
}
