// ============================================================================
// STUDENT BRIDGE — RECEIVER EXPORT & DESKTOP PATH UTILITIES
// ============================================================================

export const RECEIVER_STUDENT_PHOTO_FOLDER = "C:\\Users\\athede\\Desktop\\students project for 17000";

/**
 * Returns clean 5-column headers required for receiver student photo excel:
 * ["Student ID", "Name", "Grade", "Phone", "Photo"]
 */
export const RECEIVER_EXCEL_HEADERS = [
  "Student ID",
  "Name",
  "Grade",
  "Phone",
  "Photo",
] as const;

export interface StudentPhotoIdentity {
  fullName?: string | null;
  studentId?: string | null;
  photoPath?: string | null;
}

/**
 * Generates the local photo filename for a student.
 * Requirement:
 * If student's name is "Miskr Dires", generates "miskrdires.jpg".
 * If photoPath already ends with a clean custom image name (e.g. "miskrdires.jpg"), uses that.
 * Fallback to studentId.jpg.
 */
export function getStudentPhotoFileName(student: StudentPhotoIdentity): string {
  if (!student.photoPath) return "";

  // 1. Check if photoPath is a relative or absolute path ending in a clean filename (not a random hash and not a data URI)
  if (typeof student.photoPath === "string" && !student.photoPath.startsWith("data:")) {
    const rawName = student.photoPath.split("/").pop()?.split("\\").pop();
    if (
      rawName &&
      !rawName.startsWith("edited_") &&
      !rawName.startsWith("original_") &&
      /\.(jpg|jpeg|png|webp)$/i.test(rawName)
    ) {
      return rawName.toLowerCase();
    }
  }

  // 2. Format based on student's full name (e.g. "Miskr Dires" -> "miskrdires.jpg")
  if (student.fullName && student.fullName.trim()) {
    const clean = student.fullName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.length > 0) {
      return `${clean}.jpg`;
    }
  }

  // 3. Fallback to student ID (e.g. "SB-2026-101" -> "sb2026101.jpg")
  if (student.studentId && student.studentId.trim()) {
    const cleanId = student.studentId.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanId.length > 0) {
      return `${cleanId}.jpg`;
    }
  }

  return "photo.jpg";
}

/**
 * Generates the exact Windows local file path required for the Photo column:
 * e.g. "C:\Users\athede\Desktop\students project for 17000\miskrdires.jpg"
 */
export function getStudentPhotoLocalPath(student: StudentPhotoIdentity): string {
  if (!student.photoPath) return "";
  const fileName = getStudentPhotoFileName(student);
  if (!fileName) return "";
  return `${RECEIVER_STUDENT_PHOTO_FOLDER}\\${fileName}`;
}

/**
 * Maps a student record into the exact 5 receiver columns:
 * [Student ID, Name, Grade, Phone, Photo]
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
    student.phone || "",
    getStudentPhotoLocalPath(student),
  ];
}
