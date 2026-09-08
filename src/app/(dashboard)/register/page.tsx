"use client";

// ============================================================================
// STUDENT BRIDGE — ADVANCED STUDENT REGISTRATION & PHOTO STUDIO SYSTEM
// Manual entry + WebRTC camera + interactive Canvas Photo Editor +
// real-time duplicate check + dynamic custom fields + draft saving
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  UserPlus,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  FileCheck,
  Tag,
  Receipt,
  ArrowLeft,
} from "lucide-react";
import { CameraModal } from "@/components/camera/CameraModal";
import {
  createStudentAction,
  checkStudentIdAvailabilityAction,
  getCustomFieldsAction,
} from "@/actions/students";
import type { StudentFormInput } from "@/lib/validations";

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

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [idAvailability, setIdAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });

  // Custom Fields list
  const [customFieldsList, setCustomFieldsList] = useState<CustomFieldMeta[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Photo Buffers & Previews
  const [editedPhotoPreview, setEditedPhotoPreview] = useState<string | null>(null);
  const [officialPhotoPath, setOfficialPhotoPath] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<Partial<StudentFormInput>>({
    studentId: `SB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    fullName: "",
    grade: "Grade 10-A",
    sex: "Male",
    phone: "",
    emailAddress: "",
    address: "",
    school: "Central High School",
    department: "General Studies",
    academicYear: "2026-2027",
    guardianFullName: "",
    emergencyContactPhone: "",
    emergencyContactName: "",
    nationality: "United States",
    bloodType: "O+",
    dateOfBirth: new Date("2008-01-01"),
    status: "ACTIVE",
  });

  // Load registered Custom Fields on mount
  useEffect(() => {
    getCustomFieldsAction()
      .then((fields) => {
        if (fields) setCustomFieldsList(fields as CustomFieldMeta[]);
      })
      .catch(() => {});
  }, []);

  // Duplicate Student ID debounced verification
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
    setFormData((prev) => ({
      ...prev,
      [name]: name === "dateOfBirth" ? new Date(value) : value,
    }));
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Draft Preservation in LocalStorage
  const handleSaveDraft = () => {
    try {
      localStorage.setItem("sb_student_draft", JSON.stringify({ formData, customFieldValues }));
      alert("Registration draft saved successfully!");
    } catch {
      alert("Unable to save draft locally.");
    }
  };

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem("sb_student_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.customFieldValues) setCustomFieldValues(parsed.customFieldValues);
      } else {
        alert("No saved draft found.");
      }
    } catch {
      alert("Failed to parse saved draft.");
    }
  };

  /**
   * Directly uploads portrait without requiring intermediate editor form.
   */
  const handleDirectPhotoUpload = async (file: File, previewUrl: string) => {
    setEditedPhotoPreview(previewUrl);
    setIsUploadingPhoto(true);

    try {
      const form = new FormData();
      form.append("file", file, `${formData.studentId || "student"}_portrait.jpg`);
      form.append("studentId", formData.studentId || "");

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        const result = await res.json();
        setOfficialPhotoPath(result.relativePath);
      } else {
        // Fallback: convert file to Base64 data URL on client so portrait is always attached
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
   * Called when webcam captures an image. Directly attaches photo.
   */
  const handleWebcamCaptured = (file: File, previewUrl: string) => {
    setIsCameraOpen(false);
    handleDirectPhotoUpload(file, previewUrl);
  };

  /**
   * Called when an image is selected via file input. Directly attaches photo.
   */
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    handleDirectPhotoUpload(file, previewUrl);
  };

  /**
   * Submits student registration.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessId(null);

    // Validate 5 required fields
    if (!formData.fullName?.trim()) {
      setErrorMessage("Name is required.");
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
      setErrorMessage("Gender/Sex is required.");
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

        const result = await createStudentAction(payload);
        if (result.success && result.studentId) {
          setSuccessId(result.studentId);
          try {
            localStorage.removeItem("sb_student_draft");
          } catch {}
        } else {
          setErrorMessage(result.error || "Failed to register student.");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Communication failure while registering student.");
      }
    });
  };

  const handleResetForm = () => {
    setFormData({
      studentId: `SB-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName: "",
      grade: "Grade 10-A",
      sex: "Male",
      phone: "",
      emailAddress: "",
      address: "",
      school: "Central High School",
      department: "General Studies",
      academicYear: "2026-2027",
      guardianFullName: "",
      emergencyContactPhone: "",
      emergencyContactName: "",
      nationality: "United States",
      bloodType: "O+",
      dateOfBirth: new Date("2008-01-01"),
      status: "ACTIVE",
    });
    setCustomFieldValues({});
    setEditedPhotoPreview(null);
    setOfficialPhotoPath(null);
    setSuccessId(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </Link>
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              SENDER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">REGISTRATION</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <UserPlus className="h-6 w-6 text-accent" />
            <span>Student Registration Studio</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Optimized fast entry, integrated live photo studio, and schema-free dynamic fields
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestoreDraft}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground hover:bg-surface-secondary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Restore Draft</span>
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground hover:bg-surface-secondary transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successId && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-300">
                Student Registered Successfully!
              </div>
              <div className="text-xs text-emerald-400/80">
                Record #{formData.studentId} has been securely added to the active directory.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            >
              Register Another
            </button>
            <Link
              href={`/sender/receipts?studentId=${formData.studentId}`}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-black hover:bg-accent-hover transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Print Receipt</span>
            </Link>
            <Link
              href="/sender/batches"
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-secondary transition-colors"
            >
              Sender Batches
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="text-xs text-rose-300 font-medium">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Fields (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Required Identity Credentials */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">
                  1
                </span>
                <h2 className="text-sm font-semibold text-foreground">
                  Core Required Credentials <span className="text-accent">*</span>
                </h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted">
                Mandatory Fields
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Miskr Dires"
                  required
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
                />
              </div>

              {/* Student ID */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-foreground">
                    Student ID <span className="text-accent">*</span>
                  </label>
                  {idAvailability.checking ? (
                    <span className="text-[10px] text-foreground-muted flex items-center gap-1 font-mono">
                      <Loader2 className="h-3 w-3 animate-spin" /> checking...
                    </span>
                  ) : idAvailability.available === true ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-medium">✓ Available</span>
                  ) : idAvailability.available === false ? (
                    <span className="text-[10px] text-rose-400 font-mono font-medium">✕ Duplicate ID</span>
                  ) : null}
                </div>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="e.g. STU-2026-001"
                  required
                  className={`w-full rounded-lg border bg-surface-secondary px-3.5 py-2.5 text-xs font-mono text-foreground placeholder:text-foreground-subtle focus:outline-none ${
                    idAvailability.available === false
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-border focus:border-accent"
                  }`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Telephone Phone <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  required
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
                />
              </div>

              {/* Gender / Sex */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Sex / Gender <span className="text-accent">*</span>
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Grade / Class Batch */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Grade / Class Batch <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g. Grade 10-A"
                  required
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Optional Academic & Demographic Information */}
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-secondary text-[11px] font-bold text-foreground-muted">
                  2
                </span>
                <h2 className="text-sm font-semibold text-foreground">
                  Optional Academic & Contact Details
                </h2>
              </div>
              <span className="text-[10px] font-mono text-foreground-muted">
                Gracefully Handled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  School / Institution
                </label>
                <input
                  type="text"
                  name="school"
                  value={formData.school || ""}
                  onChange={handleChange}
                  placeholder="e.g. Lincoln High School"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Department / Track
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department || ""}
                  onChange={handleChange}
                  placeholder="e.g. Natural Sciences"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  name="academicYear"
                  value={formData.academicYear || ""}
                  onChange={handleChange}
                  placeholder="e.g. 2026-2027"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={
                    formData.dateOfBirth
                      ? new Date(formData.dateOfBirth).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="emailAddress"
                  value={formData.emailAddress || ""}
                  onChange={handleChange}
                  placeholder="student@school.edu"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Blood Group
                </label>
                <select
                  name="bloodType"
                  value={formData.bloodType || "O+"}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Parent / Guardian Legal Name
                </label>
                <input
                  type="text"
                  name="guardianFullName"
                  value={formData.guardianFullName || ""}
                  onChange={handleChange}
                  placeholder="Guardian's Name"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Emergency Phone Contact
                </label>
                <input
                  type="text"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone || ""}
                  onChange={handleChange}
                  placeholder="+1 (555) 999-8888"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Residential Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  placeholder="e.g. 742 Evergreen Terrace"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic Custom Fields (No Schema Change Required) */}
          {customFieldsList.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Custom Institutional Fields
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-accent">
                  Schema-Free Dynamic Extensibility
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {customFieldsList.map((cf) => (
                  <div key={cf.id}>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      {cf.label} {cf.isRequired && <span className="text-accent">*</span>}
                    </label>
                    {cf.dataType === "SELECT" && cf.optionsJson ? (
                      <select
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                      >
                        <option value="">Select option...</option>
                        {JSON.parse(cf.optionsJson).map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={cf.dataType === "NUMBER" ? "number" : "text"}
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                        placeholder={`Enter ${cf.label}...`}
                        required={cf.isRequired}
                        className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-medium text-foreground-muted hover:bg-surface-secondary transition-colors"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={isPending || isUploadingPhoto || idAvailability.available === false}
              className="flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enrolling Student...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Save Official Record</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Photography & Live Preview Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Photo Capture & Studio Widget */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Official Photograph
              </h3>
              {officialPhotoPath ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <CheckCircle2 className="h-3 w-3" /> ATTACHED
                </span>
              ) : (
                <span className="text-[10px] text-foreground-muted font-mono">PENDING</span>
              )}
            </div>

            {/* Photo Preview Box */}
            <div className="relative aspect-[3/4] w-full rounded-xl border border-border bg-black overflow-hidden flex items-center justify-center group shadow-inner">
              {editedPhotoPreview ? (
                <img
                  src={editedPhotoPreview}
                  alt="Student portrait preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-foreground-muted">
                  <Camera className="h-10 w-10 stroke-[1.25] text-foreground-subtle mb-2" />
                  <span className="text-xs font-medium">No Portrait Captured</span>
                  <span className="text-[10px] text-foreground-subtle mt-0.5">
                    Capture via webcam or upload image
                  </span>
                </div>
              )}

              {/* Overlay Retake / Delete Controls */}
              {editedPhotoPreview && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="rounded-lg bg-white text-black px-3 py-1.5 text-xs font-semibold shadow hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedPhotoPreview(null);
                      setOfficialPhotoPath(null);
                    }}
                    className="rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/40 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Capture Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-2.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span>Webcam</span>
              </button>

              <label className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-secondary p-2.5 text-xs font-medium text-foreground hover:bg-surface-tertiary transition-colors cursor-pointer">
                <Upload className="h-4 w-4 text-foreground-muted" />
                <span>Upload File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Live ID Card Preview Card */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Live ID Card Output Mockup
            </h3>
            <div className="aspect-[1.586/1] w-full rounded-xl border border-border bg-gradient-to-br from-surface to-surface-secondary p-3 shadow-md flex flex-col justify-between relative overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <div className="font-mono text-[9px] font-bold text-accent tracking-wider">
                  {formData.school || "STUDENT BRIDGE ACADEMY"}
                </div>
                <div className="text-[8px] font-mono text-foreground-muted uppercase">
                  {formData.academicYear || "2026-2027"}
                </div>
              </div>

              {/* Body */}
              <div className="flex items-center gap-3 my-auto">
                <div className="h-16 w-12 rounded border border-border bg-black/60 overflow-hidden shrink-0 flex items-center justify-center">
                  {editedPhotoPreview ? (
                    <img
                      src={editedPhotoPreview}
                      alt="Mini portrait"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-4 w-4 text-foreground-subtle" />
                  )}
                </div>
                <div className="space-y-0.5 truncate">
                  <div className="text-[11px] font-bold text-foreground truncate">
                    {formData.fullName || "STUDENT LEGAL NAME"}
                  </div>
                  <div className="text-[9px] font-mono text-accent">
                    ID: {formData.studentId || "SB-2026-XXXX"}
                  </div>
                  <div className="text-[8px] text-foreground-muted">
                    {formData.grade} • {formData.sex}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border/60 pt-1 text-[8px] font-mono text-foreground-muted">
                <span>OFFICIAL CREDENTIAL</span>
                <span className="text-emerald-400 font-semibold">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* WebRTC Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleWebcamCaptured}
      />
    </div>
  );
}
