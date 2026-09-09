// ============================================================================
// STUDENT BRIDGE — RECEIVER EXPORT & DESKTOP PATH UTILITIES
// ============================================================================

export const RECEIVER_STUDENT_PHOTO_FOLDER = "C:\\Users\\athede\\Desktop\\students project for 17000";

/**
 * Exact 5-column headers required for receiver student photo excel:
 * ["StudentID", "Name", "Grade", "Phone", "@photo"]
 */
export const RECEIVER_EXCEL_HEADERS = [
  "StudentID",
  "Name",
  "Grade",
  "Phone",
  "@photo",
] as const;

export interface StudentPhotoIdentity {
  fullName?: string | null;
  studentId?: string | null;
  photoPath?: string | null;
}

/**
 * Normalizes phone numbers to start with 2519 (not 09).
 * E.g.:
 * - "0912345678" -> "251912345678"
 * - "09 11 22 33 44" -> "251911223344"
 * - "+251912345678" -> "251912345678"
 * - "912345678" -> "251912345678"
 * - "251912345678" -> "251912345678"
 */
export function formatPhoneForReceiver(phone?: string | null): string {
  if (!phone) return "";
  let cleaned = String(phone).trim().replace(/[^\d+]/g, "");

  // Remove leading plus if present
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 09 (e.g. 0912345678), replace leading 09 with 2519
  if (cleaned.startsWith("09")) {
    return "2519" + cleaned.substring(2);
  }

  // If starts with 25109 (common typo), convert to 2519
  if (cleaned.startsWith("25109")) {
    return "2519" + cleaned.substring(5);
  }

  // If starts with 2519 already, return as is
  if (cleaned.startsWith("2519")) {
    return cleaned;
  }

  // If 9 digits starting with 9 (e.g. 912345678), prepend 251
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return "251" + cleaned;
  }

  return cleaned;
}

/**
 * Generates the local photo filename for a student preserving full name and spacing.
 * Requirement:
 * If student's name is "Yeah tarekegn", produces "Yeah tarekegn.jpg".
 * Sanitizes only illegal filesystem characters (/ \ : * ? " < > |).
 */
export function getStudentPhotoFileName(student: StudentPhotoIdentity): string {
  if (!student.photoPath) return "";

  // 1. Format based on student's full legal name: e.g. "Yeah tarekegn" -> "Yeah tarekegn.jpg"
  if (student.fullName && student.fullName.trim()) {
    // Sanitize illegal Windows filename characters: / \ : * ? " < > |
    let safeName = student.fullName
      .replace(/[/\\]/g, " - ")
      .replace(/[:*?"<>|]/g, "")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Remove leading/trailing dots or dashes
    safeName = safeName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "");

    if (safeName.length > 0) {
      return `${safeName}.jpg`;
    }
  }

  // 2. Check if photoPath is a relative or absolute path ending in a clean custom filename
  if (typeof student.photoPath === "string" && !student.photoPath.startsWith("data:")) {
    const rawName = student.photoPath.split("/").pop()?.split("\\").pop();
    if (
      rawName &&
      !rawName.startsWith("edited_") &&
      !rawName.startsWith("original_") &&
      /\.(jpg|jpeg|png|webp)$/i.test(rawName)
    ) {
      return rawName;
    }
  }

  // 3. Fallback to student ID (e.g. "SB-2026-0001" -> "SB-2026-0001.jpg")
  if (student.studentId && student.studentId.trim()) {
    const safeId = student.studentId
      .replace(/[/\\]/g, " - ")
      .replace(/[:*?"<>|]/g, "")
      .trim();
    if (safeId.length > 0) {
      return `${safeId}.jpg`;
    }
  }

  return "photo.jpg";
}

/**
 * Generates the exact Windows local file path required for the @photo column:
 * e.g. "C:\Users\athede\Desktop\students project for 17000\Yeah tarekegn.jpg"
 */
export function getStudentPhotoLocalPath(student: StudentPhotoIdentity): string {
  if (!student.photoPath) return "";
  const fileName = getStudentPhotoFileName(student);
  if (!fileName) return "";
  return `${RECEIVER_STUDENT_PHOTO_FOLDER}\\${fileName}`;
}

/**
 * Maps a student record into the exact 5 receiver columns:
 * [StudentID, Name, Grade, Phone, @photo]
 */
export function formatStudentForReceiverExcel(student: {
  studentId: string;
  fullName: string;
  grade: string;
  phone: string;
  photoPath?: string | null;
}) {
  return [
    student.studentId || "",
    student.fullName || "",
    student.grade || "",
    formatPhoneForReceiver(student.phone),
    getStudentPhotoLocalPath(student),
  ];
}
