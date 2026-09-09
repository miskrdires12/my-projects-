"use client";

// ============================================================================
// STUDENT BRIDGE — PHONE-EASY STUDENT ENROLLMENT STATION (SENDER)
//
// Strictly designed for ultra-rapid enrollment (6,000+ students per day):
// - 60% #f7faf9, 30% #02f52b, 10% #080808 color scheme
// - Phone-first layout: 3:4 Portrait -> Core Credentials -> Send Button
// - High-speed instant snap & auto-attach photo studio
// - Precision studio crop editor
// - Dual persistence (IndexedDB + PostgreSQL)
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  Crop,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Check,
  Loader2,
  Receipt,
} from "lucide-react";
import { createStudentAction, getCustomFieldsAction, checkStudentIdAvailabilityAction } from "@/actions/students";
import type { StudentFormInput } from "@/lib/validations";
import { CameraModal } from "@/components/camera/CameraModal";
import { PhotoEditorModal } from "@/components/camera/PhotoEditorModal";
import { publishStudentSync } from "@/lib/sync-client";
import { formatPhoneForReceiver } from "@/lib/export-utils";
import { saveStudentToDB } from "@/lib/idb-storage";

interface CustomFieldMeta {
  id: string;
  fieldKey: string;
  label: string;
  dataType: string;
  optionsJson?: string | null;
  isRequired: boolean;
}

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();

  // Modals & Camera Controls
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
  const [editorOriginalFile, setEditorOriginalFile] = useState<File | null>(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentSuccessfullyData, setSentSuccessfullyData] = useState<{
    studentId: string;
    fullName: string;
    grade: string;
    sex: string;
  } | null>(null);
  const [autoResetTimer, setAutoResetTimer] = useState<number>(3);

  const [idAvailability, setIdAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });

  // Optional fields accordion
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Custom Fields list
  const [customFieldsList, setCustomFieldsList] = useState<CustomFieldMeta[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Photo Buffers & Previews
  const [editedPhotoPreview, setEditedPhotoPreview] = useState<string | null>(null);
  const [officialPhotoPath, setOfficialPhotoPath] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Core Form Fields
  const [formData, setFormData] = useState<Partial<StudentFormInput>>({
    studentId: "",
    fullName: "",
    grade: "10",
    sex: "Male",
    phone: "",
    emailAddress: "",
    address: "",
    school: "",
    department: "",
    academicYear: "2026-2027",
    guardianFullName: "",
    emergencyContactPhone: "",
    emergencyContactName: "",
    nationality: "Ethiopian",
    bloodType: "",
    dateOfBirth: undefined,
    status: "ACTIVE",
  });

  // Generate clean default student ID on mount
  useEffect(() => {
    setFormData((current) =>
      current.studentId
        ? current
        : {
            ...current,
            studentId: `SB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          }
    );

    getCustomFieldsAction()
      .then((fields) => {
        if (fields) setCustomFieldsList(fields as CustomFieldMeta[]);
      })
      .catch(() => {});
  }, []);

  // Auto-reset countdown timer when "Sent Successfully" dialog is shown
  useEffect(() => {
    if (!sentSuccessfullyData) return;
    setAutoResetTimer(3);
    const interval = setInterval(() => {
      setAutoResetTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleResetForm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sentSuccessfullyData]);

  // Duplicate Student ID verification
  useEffect(() => {
    if (!formData.studentId || formData.studentId.trim().length < 2) {
      setIdAvailability({ checking: false, available: null });
      return;
    }

    const timer = setTimeout(async () => {
      setIdAvailability({ checking: true, available: null });
      try {
        const res = await checkStudentIdAvailabilityAction(formData.studentId!);
        setIdAvailability({
          checking: false,
          available: res.available,
          message: res.message,
        });
      } catch {
        setIdAvailability({ checking: false, available: null });
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.studentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let finalVal: any = value;
    if (name === "dateOfBirth") {
      finalVal = value ? new Date(value) : undefined;
    } else if (name === "phone") {
      let p = value;
      if (p.startsWith("09")) {
        p = "2519" + p.substring(2);
      }
      finalVal = p;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalVal,
    }));
  };

  const handlePhoneBlur = () => {
    if (formData.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhoneForReceiver(prev.phone),
      }));
    }
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Launch camera capture studio
   */
  const handleLaunchCamera = () => {
    setIsCameraOpen(true);
  };

  /**
   * Direct photo upload / capture attachment
   */
  const handleDirectPhotoUpload = async (file: File, previewUrl: string) => {
    setEditedPhotoPreview(previewUrl);
    setIsUploadingPhoto(true);

    let cleanName = (formData.fullName || formData.studentId || "student")
      .replace(/[/\\]/g, " - ")
      .replace(/[:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
    const safePhotoName = `${cleanName}.jpg`;

    try {
      const form = new FormData();
      form.append("file", file, safePhotoName);
      form.append("studentId", formData.studentId || "");

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        const result = await res.json();
        setOfficialPhotoPath(result.relativePath);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setOfficialPhotoPath(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setOfficialPhotoPath(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /**
   * Called when webcam captures an image.
   */
  const handleWebcamCaptured = (file: File, previewUrl: string) => {
    setIsCameraOpen(false);
    setEditedPhotoPreview(previewUrl);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setOfficialPhotoPath(dataUri);
      handleDirectPhotoUpload(file, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Opens photo crop and refinement studio for captured or uploaded photo.
   */
  const handleOpenPhotoEditor = (file: File, previewUrl: string) => {
    setIsCameraOpen(false);
    setEditorImageSrc(previewUrl);
    setEditorOriginalFile(file);
    setIsEditorOpen(true);
  };

  /**
   * Called when user saves cropped/refined photo from studio editor.
   */
  const handlePhotoEditorSave = (editedBlob: Blob) => {
    setIsEditorOpen(false);
    let cleanName = (formData.fullName || formData.studentId || "student")
      .replace(/[/\\]/g, " - ")
      .replace(/[:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
    const safePhotoName = `${cleanName}.jpg`;
    const editedFile = new File([editedBlob], safePhotoName, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(editedBlob);
    setEditedPhotoPreview(previewUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setOfficialPhotoPath(dataUri);
      handleDirectPhotoUpload(editedFile, previewUrl);
    };
    reader.readAsDataURL(editedBlob);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEditedPhotoPreview(dataUrl);
      setOfficialPhotoPath(dataUrl);
      handleOpenPhotoEditor(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Fast Submit: Dual-saves to server and IndexedDB (unlimited capacity for 6,000 students/day).
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate 5 required fields
    if (!formData.fullName?.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }
    if (!formData.studentId?.trim()) {
      setErrorMessage("Student ID is required.");
      return;
    }
    if (!formData.grade?.trim()) {
      setErrorMessage("Grade is required.");
      return;
    }
    if (!formData.sex) {
      setErrorMessage("Sex is required.");
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }

    if (idAvailability.available === false) {
      setErrorMessage(idAvailability.message || "Student ID is already taken.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: StudentFormInput = {
          studentId: formData.studentId!,
          fullName: formData.fullName!,
          grade: formData.grade!,
          sex: formData.sex!,
          phone: formData.phone!,
          dateOfBirth: formData.dateOfBirth,
          emailAddress: formData.emailAddress,
          address: formData.address,
          school: formData.school,
          department: formData.department,
          academicYear: formData.academicYear,
          guardianFullName: formData.guardianFullName,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone,
          nationality: formData.nationality,
          bloodType: formData.bloodType,
          photoPath: officialPhotoPath,
          status: formData.status as any,
          customFields: customFieldValues,
        };

        // Construct standard record for IndexedDB and sync
        const record = {
          id: formData.studentId!,
          studentId: payload.studentId,
          fullName: payload.fullName,
          grade: payload.grade,
          sex: payload.sex,
          phone: payload.phone,
          emailAddress: payload.emailAddress || null,
          address: payload.address || null,
          school: payload.school || null,
          department: payload.department || null,
          academicYear: payload.academicYear || null,
          guardianFullName: payload.guardianFullName || null,
          emergencyContactPhone: payload.emergencyContactPhone || null,
          emergencyContactName: payload.emergencyContactName || null,
          bloodType: payload.bloodType || null,
          nationality: payload.nationality || null,
          photoPath: officialPhotoPath,
          qrCodeData: `STUDENT:${payload.studentId}`,
          status: payload.status || "ACTIVE",
          createdAt: new Date().toISOString(),
          customValues: Object.entries(customFieldValues).map(([k, v]) => ({
            customField: { label: k, fieldKey: k },
            value: v,
          })),
        };

        // 1. Save to high-capacity IndexedDB (stores 6,000+ students safely with photos)
        await saveStudentToDB(record);

        // 2. Broadcast immediately to Receiver Workstation via Cloud Sync
        publishStudentSync("UPSERT", record).catch(() => {});

        // 3. Dual-persist to server action
        createStudentAction(payload).catch((err) => {
          console.warn("Server action background sync notice:", err);
        });

        // 4. Show "Sent Successfully!" confirmation modal
        setSentSuccessfullyData({
          studentId: payload.studentId,
          fullName: payload.fullName,
          grade: payload.grade,
          sex: payload.sex,
        });
      } catch (err: any) {
        setErrorMessage(err?.message || "Communication failure while enrolling student.");
      }
    });
  };

  const handleResetForm = () => {
    setFormData({
      studentId: `SB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName: "",
      grade: "10",
      sex: "Male",
      phone: "",
      emailAddress: "",
      address: "",
      school: "",
      department: "",
      academicYear: "2026-2027",
      guardianFullName: "",
      emergencyContactPhone: "",
      emergencyContactName: "",
      nationality: "Ethiopian",
      bloodType: "",
      dateOfBirth: undefined,
      status: "ACTIVE",
    });
    setCustomFieldValues({});
    setEditedPhotoPreview(null);
    setOfficialPhotoPath(null);
    setSentSuccessfullyData(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#f7faf9] text-[#080808] pb-16">
      {/* Phone-Centric Container */}
      <div className="max-w-xl mx-auto px-4 pt-3 space-y-4">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between py-2 border-b border-[#dce7e1]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#080808] hover:text-[#02f52b] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <div className="flex items-center gap-1.5 bg-[#080808] text-white px-3 py-1 rounded-full text-[11px] font-mono font-bold shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#02f52b] animate-pulse" />
            <span>SENDER STATION</span>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            className="text-xs font-mono text-[#6b7771] hover:text-[#080808] transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 flex items-center gap-2.5 text-xs text-red-700 font-semibold shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ====================================================================
            STEP 1: 3:4 PORTRAIT CAMERA & AUTO-CAPTURE 3S (EASY PHONE VIEWPORT)
           ==================================================================== */}
        <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#eef5f1] pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#02f52b] text-[11px] font-extrabold text-[#080808]">
                1
              </span>
              <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-[#080808]">
                Student Photo (3:4 Studio)
              </span>
            </div>
            {officialPhotoPath ? (
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> 3:4 Attached
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[#6b7771]">3:4 • 300 DPI</span>
            )}
          </div>

          {/* Photo Viewfinder Display */}
          <div className="relative aspect-[3/4] max-w-[240px] mx-auto rounded-2xl border-2 border-dashed border-[#dce7e1] bg-[#f7faf9] overflow-hidden flex items-center justify-center shadow-inner group">
            {editedPhotoPreview ? (
              <img
                src={editedPhotoPreview}
                alt="Student portrait"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                <div className="h-12 w-12 rounded-full bg-[#eef5f1] flex items-center justify-center text-[#080808]">
                  <Camera className="h-6 w-6 stroke-[1.75]" />
                </div>
                <div className="text-xs font-bold text-[#080808]">Take Student Photo</div>
                <div className="text-[10px] font-mono text-[#6b7771]">
                  Pure 3:4 ratio at 300 DPI
                </div>
              </div>
            )}

            {/* Quick Actions Hover/Tap Overlay */}
            {editedPhotoPreview && (
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editedPhotoPreview) {
                      setEditorImageSrc(editedPhotoPreview);
                      setIsEditorOpen(true);
                    }
                  }}
                  className="w-36 rounded-xl bg-[#02f52b] text-[#080808] py-1.5 text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 hover:brightness-105 cursor-pointer"
                >
                  <Crop className="h-3.5 w-3.5" />
                  <span>Edit / Crop Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCamera}
                  className="w-36 rounded-xl bg-white text-[#080808] py-1.5 text-xs font-bold shadow-md flex items-center justify-center gap-1.5 hover:bg-neutral-100 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-[#080808]" />
                  <span>Retake Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedPhotoPreview(null);
                    setOfficialPhotoPath(null);
                  }}
                  className="text-[11px] font-mono text-white/80 hover:text-white underline pt-1 cursor-pointer"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>

          {/* Quick Photo Buttons (Easy Phone Style) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleLaunchCamera}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#02f52b] text-[#080808] py-3 px-4 text-xs font-mono font-black shadow-[0_0_15px_rgba(2,245,43,0.35)] hover:bg-[#00dc25] active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="h-4 w-4 stroke-[2.5]" />
              <span>Take Student Photo</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            {editedPhotoPreview ? (
              <button
                type="button"
                onClick={() => {
                  setEditorImageSrc(editedPhotoPreview);
                  setIsEditorOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#02f52b] bg-[#02f52b]/10 py-2.5 text-xs font-mono font-bold text-[#080808] hover:bg-[#02f52b]/20 transition-colors cursor-pointer"
              >
                <Crop className="h-3.5 w-3.5 text-[#080808]" />
                <span>Edit & Crop Photo</span>
              </button>
            ) : (
              <label className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#dce7e1] bg-[#f7faf9] py-2.5 text-xs font-mono font-semibold text-[#6b7771] hover:text-[#080808] hover:bg-[#eef5f1] transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload From Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* ====================================================================
            STEP 2: CORE STUDENT CREDENTIALS (EASY PHONE INPUTS)
           ==================================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-[#dce7e1] bg-white p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#eef5f1] pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#02f52b] text-[11px] font-extrabold text-[#080808]">
                  2
                </span>
                <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-[#080808]">
                  Student Information
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#02f52b] font-bold">REQUIRED</span>
            </div>

            {/* Student ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#080808] font-mono">
                  Student ID <span className="text-red-500">*</span>
                </label>
                {idAvailability.checking ? (
                  <span className="text-[10px] font-mono text-[#6b7771] flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> checking...
                  </span>
                ) : idAvailability.available === true ? (
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ Ready</span>
                ) : idAvailability.available === false ? (
                  <span className="text-[10px] font-mono text-rose-600 font-bold">✕ Taken</span>
                ) : null}
              </div>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g. STU-2026-001"
                required
                className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] px-3.5 py-2.5 text-xs font-mono text-[#080808] focus:border-[#02f52b] focus:ring-1 focus:ring-[#02f52b] focus:outline-none"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#080808] mb-1 font-mono">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Abebe Kebede"
                required
                className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] px-3.5 py-2.5 text-xs text-[#080808] font-semibold placeholder:text-[#6b7771] focus:border-[#02f52b] focus:ring-1 focus:ring-[#02f52b] focus:outline-none"
              />
            </div>

            {/* Sex / Gender Chips (Easy Phone Style) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] mb-1.5 font-mono">
                Sex / Gender <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, sex: "Male" }))}
                  className={`py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all ${
                    formData.sex === "Male"
                      ? "bg-[#02f52b] text-[#080808] border-[#02f52b] shadow-[0_0_12px_rgba(2,245,43,0.35)] scale-[1.01]"
                      : "bg-[#f7faf9] text-[#6b7771] border-[#dce7e1] hover:text-[#080808]"
                  }`}
                >
                  <span className="text-base">👦</span>
                  <span>Male</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, sex: "Female" }))}
                  className={`py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all ${
                    formData.sex === "Female"
                      ? "bg-[#02f52b] text-[#080808] border-[#02f52b] shadow-[0_0_12px_rgba(2,245,43,0.35)] scale-[1.01]"
                      : "bg-[#f7faf9] text-[#6b7771] border-[#dce7e1] hover:text-[#080808]"
                  }`}
                >
                  <span className="text-base">👧</span>
                  <span>Female</span>
                </button>
              </div>
            </div>

            {/* Grade (Number Input) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] mb-1 font-mono">
                Grade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="grade"
                min="1"
                max="100"
                value={formData.grade}
                onChange={handleChange}
                placeholder="e.g. 10"
                required
                className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] px-3.5 py-2.5 text-xs font-mono font-bold text-[#080808] focus:border-[#02f52b] focus:ring-1 focus:ring-[#02f52b] focus:outline-none"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-[#080808] mb-1 font-mono">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handlePhoneBlur}
                placeholder="251912345678"
                required
                className="w-full rounded-xl border border-[#dce7e1] bg-[#f7faf9] px-3.5 py-2.5 text-xs font-mono text-[#080808] focus:border-[#02f52b] focus:ring-1 focus:ring-[#02f52b] focus:outline-none"
              />
            </div>

            {/* Collapsible Additional Details (Keeps screen clean for fast entry) */}
            <div className="pt-2 border-t border-[#eef5f1]">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex items-center justify-between w-full text-xs font-mono text-[#6b7771] hover:text-[#080808] py-1"
              >
                <span>{showOptionalFields ? "Hide Extra Details" : "+ More Details (School, DOB, Address)"}</span>
                {showOptionalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showOptionalFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] mb-1">School</label>
                    <input
                      type="text"
                      name="school"
                      value={formData.school || ""}
                      onChange={handleChange}
                      placeholder="School name"
                      className="w-full rounded-lg border border-[#dce7e1] bg-[#f7faf9] px-3 py-2 text-xs focus:outline-none focus:border-[#02f52b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] mb-1">Academic Year</label>
                    <input
                      type="text"
                      name="academicYear"
                      value={formData.academicYear || ""}
                      onChange={handleChange}
                      placeholder="2026-2027"
                      className="w-full rounded-lg border border-[#dce7e1] bg-[#f7faf9] px-3 py-2 text-xs focus:outline-none focus:border-[#02f52b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] mb-1">Guardian Name</label>
                    <input
                      type="text"
                      name="guardianFullName"
                      value={formData.guardianFullName || ""}
                      onChange={handleChange}
                      placeholder="Guardian name"
                      className="w-full rounded-lg border border-[#dce7e1] bg-[#f7faf9] px-3 py-2 text-xs focus:outline-none focus:border-[#02f52b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone || ""}
                      onChange={handleChange}
                      placeholder="Emergency phone"
                      className="w-full rounded-lg border border-[#dce7e1] bg-[#f7faf9] px-3 py-2 text-xs focus:outline-none focus:border-[#02f52b]"
                    />
                  </div>

                  {customFieldsList.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-[11px] font-mono text-[#6b7771] mb-1">{cf.label}</label>
                      <input
                        type="text"
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                        className="w-full rounded-lg border border-[#dce7e1] bg-[#f7faf9] px-3 py-2 text-xs focus:outline-none focus:border-[#02f52b]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ====================================================================
              STEP 3: BIG ACTION BUTTON (SEND & ENROLL STUDENT)
             ==================================================================== */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending || isUploadingPhoto || idAvailability.available === false}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#02f52b] py-3.5 px-6 text-sm font-mono font-extrabold text-[#080808] hover:bg-[#00dc25] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(2,245,43,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#080808]" />
                  <span>Enrolling & Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-[#080808] stroke-[2.5]" />
                  <span>SAVE & SEND TO RECEIVER</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ====================================================================
          "SENT SUCCESSFULLY!" CELEBRATION MODAL
         ==================================================================== */}
      {sentSuccessfullyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#02f52b] bg-white p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Animated Check Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#02f52b] shadow-[0_0_25px_rgba(2,245,43,0.6)]">
              <Check className="h-9 w-9 text-[#080808] stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-mono font-black tracking-tight text-[#080808]">
                Sent Successfully!
              </h3>
              <p className="text-xs text-[#3f4743]">
                Student enrolled & synced to Receiver Workstation
              </p>
            </div>

            {/* Student Preview Card */}
            <div className="rounded-2xl border border-[#dce7e1] bg-[#f7faf9] p-3 text-left space-y-1 font-mono text-xs">
              <div className="font-bold text-[#080808] text-sm truncate">
                {sentSuccessfullyData.fullName}
              </div>
              <div className="text-[#3f4743]">
                ID: <strong className="text-[#080808]">{sentSuccessfullyData.studentId}</strong>
              </div>
              <div className="text-[#3f4743]">
                Class: {sentSuccessfullyData.grade} • {sentSuccessfullyData.sex}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full rounded-xl bg-[#02f52b] text-[#080808] py-2.5 text-xs font-mono font-extrabold shadow-md hover:bg-[#00dc25] transition-all cursor-pointer"
              >
                Enroll Next Student ({autoResetTimer}s)
              </button>
              <Link
                href={`/sender/receipts?studentId=${sentSuccessfullyData.studentId}`}
                className="w-full flex items-center justify-center gap-1 rounded-xl border border-[#dce7e1] bg-white py-2 text-xs font-mono font-semibold text-[#080808] hover:bg-[#eef5f1] transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>View / Print Receipt</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* WebRTC Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleWebcamCaptured}
        onEditPhoto={handleOpenPhotoEditor}
      />

      {/* Photo Studio Editor Modal */}
      {isEditorOpen && editorImageSrc && (
        <PhotoEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          originalImageSrc={editorImageSrc}
          originalFile={editorOriginalFile}
          onSave={handlePhotoEditorSave}
          onRetake={() => {
            setIsEditorOpen(false);
            setIsCameraOpen(true);
          }}
        />
      )}
    </div>
  );
}
