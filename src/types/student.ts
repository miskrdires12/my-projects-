// ============================================================================
// STUDENT BRIDGE — STUDENT STATUS & IDENTITY TYPES
// ============================================================================

export type StudentStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "SUSPENDED";

export interface StudentRecord {
  id: string;
  studentId: string;
  fullName: string;
  contactName: string;
  grade: string;
  sex: string;
  phone: string;
  cityRegion: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType: string | null;
  emailAddress: string | null;
  guardianFullName: string;
  rollNumber: string;
  nationality: string;
  nationalId: string;
  dateOfBirth: Date;
  photoPath: string | null;
  qrCodeData: string | null;
  status: StudentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentExtended {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  department?: string | null;
  section?: string | null;
  branch?: string | null;
  school?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  cityRegion?: string | null;
  academicYear?: string | null;
  guardianFullName?: string | null;
  contactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactName?: string | null;
  bloodType?: string | null;
  nationality?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string | Date | null;
  photoUrl?: string | null;
  photoBase64?: string | null;
  photoPath?: string | null;
  thumbnailPath?: string | null;
  previewPath?: string | null;
  originalPhotoPath?: string | null;
  qrCodeUrl?: string | null;
  qrCodeData?: string | null;
  status?: string;
  batch?: { batchNumber: string; title: string } | null;
  senderId?: string | null;
  senderName?: string | null;
  customValues?: {
    value: string;
    customField: {
      label: string;
    };
  }[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}
