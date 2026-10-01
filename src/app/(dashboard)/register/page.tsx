"use client";

// ============================================================================
// STUDENT BRIDGE — PHONE-EASY STUDENT ENROLLMENT STATION (SENDER)
//
// Strictly designed for ultra-rapid enrollment (6,000+ students per day):
// - 60% #f7faf9, 30% #8fe617, 10% #080808 color scheme
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
  Check,
  Loader2,
  RotateCcw,
  Receipt,
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  createStudentAction,
  getCustomFieldsAction,
  checkStudentIdAvailabilityAction,
  getSenderStatsAction,
} from "@/actions/students";
import { getSenderTasksAction } from "@/actions/tasks";
import { getGlobalSystemSettingsAction } from "@/actions/settings";
import type { StudentFormInput } from "@/lib/validations";
import { CameraModal } from "@/components/camera/CameraModal";
import { PhotoEditorModal } from "@/components/camera/PhotoEditorModal";
import { publishStudentSync, subscribeToCloudSync } from "@/lib/sync-client";
import { saveStudentToDB, getAllStudentsFromDB } from "@/lib/idb-storage";
import {
  saveActiveDraft,
  getActiveDraft,
  clearActiveDraft,
  deliverStudentSequentially,
  type DeliveryProgress,
  subscribeToOutbox,
  triggerOutboxWorker,
  type OutboxItem,
} from "@/lib/outbox-engine";

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
  const fullNameInputRef = React.useRef<HTMLInputElement | null>(null);

  // Telegram-style Delivery Wait State
  const [deliveryProgress, setDeliveryProgress] = useState<DeliveryProgress | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);

  // Modals & Camera Controls
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");
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
    folderSaved?: boolean;
    supabaseUploaded?: boolean;
    qrCodeData?: string;
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

  // Selected Section & School Dropdowns (Requirement 7)
  const [selectedSection, setSelectedSection] = useState<string>("Adama");

  // Photo Edit Reminder & Slash Mark Rejection (Requirement 6)
  const [photoWasEdited, setPhotoWasEdited] = useState<boolean>(false);
  const [showPhotoReminderModal, setShowPhotoReminderModal] = useState<boolean>(false);
  const [slashAlertModal, setSlashAlertModal] = useState<{ isOpen: boolean; message: string } | null>(null);

  // Active Assigned Tasks (Requirement 5)
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  // Offline-First Queue & Network State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [offlinePendingQueue, setOfflinePendingQueue] = useState<any[]>([]);
  const [isSyncingOfflineQueue, setIsSyncingOfflineQueue] = useState<boolean>(false);

  // Sender Station Output Metrics (Registrations to Admin per day, per month, and total)
  const [senderStats, setSenderStats] = useState<{
    studentsRegistered: number;
    studentsRegisteredToday: number;
    studentsRegisteredThisMonth: number;
    studentsWithPhotos: number;
    senderName: string;
  }>({
    studentsRegistered: 0,
    studentsRegisteredToday: 0,
    studentsRegisteredThisMonth: 0,
    studentsWithPhotos: 0,
    senderName: "",
  });

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

  // Generate clean default student ID & load Sender Station defaults on mount
  useEffect(() => {
    // Fetch live sender registration metrics to Admin (per day, per month, and total)
    getSenderStatsAction()
      .then((res) => {
        if (res.success) {
          setSenderStats({
            studentsRegistered: res.studentsRegistered,
            studentsRegisteredToday: res.studentsRegisteredToday,
            studentsRegisteredThisMonth: res.studentsRegisteredThisMonth,
            studentsWithPhotos: res.studentsWithPhotos,
            senderName: res.senderName,
          });
        }
      })
      .catch(() => {});

    // Fetch active assigned tasks for this sender (Requirement 5)
    getSenderTasksAction()
      .then((res) => {
        if (res.success && res.tasks && res.tasks.length > 0) {
          setActiveTasks(res.tasks);
        }
      })
      .catch(() => {});

    // Hydrate Super Admin Global System Settings (Requirement 12)
    getGlobalSystemSettingsAction()
      .then((settings) => {
        if (settings) {
          setFormData((prev) => ({
            ...prev,
            grade: prev.grade || settings.defaultGrade || "10",
            school: prev.school || settings.defaultSchool || "Sena Yerosen",
            address: prev.address || settings.defaultSection || "Adama",
            academicYear: prev.academicYear || settings.defaultAcademicYear || "2026-2027",
          }));
          if (settings.defaultSection) {
            setSelectedSection(settings.defaultSection);
          }
        }
      })
      .catch(() => {});

    let defaultGrade = "10";
    let defaultSchool = "";
    let defaultAcademicYear = "2026-2027";
    let idPrefix = "SB-";
    try {
      const saved = localStorage.getItem("sb_app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultGrade) defaultGrade = parsed.defaultGrade;
        if (parsed.schoolName) defaultSchool = parsed.schoolName;
        if (parsed.academicYear) defaultAcademicYear = parsed.academicYear;
        if (parsed.idPrefix) idPrefix = parsed.idPrefix;
        if (parsed.cameraFacing) setCameraFacing(parsed.cameraFacing);
      }
    } catch {}

    setFormData((current) =>
      current.studentId
        ? current
        : {
            ...current,
            grade: current.grade || defaultGrade,
            school: current.school || defaultSchool,
            academicYear: current.academicYear || defaultAcademicYear,
            studentId: `${idPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          }
    );

    getCustomFieldsAction()
      .then((fields) => {
        if (fields) setCustomFieldsList(fields as CustomFieldMeta[]);
      })
      .catch(() => {});

    // Hydrate active form draft if browser was closed or reloaded (Rules 1 & 2)
    try {
      const draft = getActiveDraft();
      if (draft && draft.formData && (draft.formData.fullName || draft.formData.phone || draft.officialPhotoPath)) {
        setFormData((prev) => ({ ...prev, ...draft.formData }));
        if (draft.officialPhotoPath) setOfficialPhotoPath(draft.officialPhotoPath);
        if (draft.editedPhotoPreview) setEditedPhotoPreview(draft.editedPhotoPreview);
      }
    } catch {}

    // Hydrate offline pending registrations from secure storage
    try {
      localStorage.removeItem("sb_offline_pending_students");
      const rawQueue = localStorage.getItem("_sec_off_pend_q");
      if (rawQueue) {
        const jsonStr = decodeURIComponent(atob(rawQueue));
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          setOfflinePendingQueue(parsed);
        }
      }
    } catch {}

    // Network status listener & auto-resend on connection restore
    const handleOnline = () => {
      setIsOnline(true);
      handleSyncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Automatic Photo Resender: Automatically retries transmission of disrupted/offline records in background
    const autoResendTimer = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        handleSyncOfflineQueue();
      }
    }, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(autoResendTimer);
    };
  }, []);

  // Active Draft Autosave: Persists every keystroke and photo to prevent data loss on reload/close
  useEffect(() => {
    if (formData.fullName || formData.phone || officialPhotoPath) {
      saveActiveDraft({ formData, officialPhotoPath, editedPhotoPreview });
    }
  }, [formData, officialPhotoPath, editedPhotoPreview]);

  // Outbox subscription: real-time updates of queued/syncing items
  const [outboxQueue, setOutboxQueue] = useState<OutboxItem[]>([]);
  useEffect(() => {
    const unsub = subscribeToOutbox((q) => setOutboxQueue(q));
    return () => unsub();
  }, []);

  // Download Offline Backup JSON
  const handleDownloadOfflineBackup = () => {
    if (offlinePendingQueue.length === 0) {
      alert("No offline records currently pending.");
      return;
    }
    const dataStr = JSON.stringify(offlinePendingQueue, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateTag = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `Student_Bridge_Offline_Backup_${dateTag}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {}
    }, 500);
  };

  // Sync Offline Queue to Directory
  const handleSyncOfflineQueue = async () => {
    if (offlinePendingQueue.length === 0 || isSyncingOfflineQueue) return;
    setIsSyncingOfflineQueue(true);
    setErrorMessage(null);
    let successfulCount = 0;
    const remainingQueue = [...offlinePendingQueue];

    for (let i = 0; i < offlinePendingQueue.length; i++) {
      const item = offlinePendingQueue[i];
      try {
        const res = await createStudentAction(item.payload);
        if (res.success || (res.error && res.error.includes("already exists"))) {
          successfulCount++;
          await saveStudentToDB(item.record);
          publishStudentSync("UPSERT", item.record).catch(() => {});
          const idx = remainingQueue.findIndex((q) => q.record.studentId === item.record.studentId);
          if (idx !== -1) remainingQueue.splice(idx, 1);
        }
      } catch (e) {
        console.warn("Sync failed for record:", item.record?.studentId, e);
      }
    }

    setOfflinePendingQueue(remainingQueue);
    try {
      localStorage.removeItem("sb_offline_pending_students");
      if (remainingQueue.length > 0) {
        localStorage.setItem("_sec_off_pend_q", btoa(encodeURIComponent(JSON.stringify(remainingQueue))));
      } else {
        localStorage.removeItem("_sec_off_pend_q");
      }
    } catch {}
    setIsSyncingOfflineQueue(false);

    if (successfulCount > 0) {
      alert(`⚡ Successfully synced ${successfulCount} offline student(s) into directory!`);
    }
  };

  // Background Auto-Resend: Periodically flush offline pending queue whenever online
  useEffect(() => {
    if (!isOnline || offlinePendingQueue.length === 0 || isSyncingOfflineQueue) return;
    const interval = setInterval(() => {
      handleSyncOfflineQueue();
    }, 8000);
    return () => clearInterval(interval);
  }, [isOnline, offlinePendingQueue.length, isSyncingOfflineQueue]);

  // Realtime Cloud Listener: Auto-respond to Receiver Station photo resend requests
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      () => {},
      () => {},
      () => {},
      async (payload) => {
        if (payload?.action === "RESEND_PHOTO_REQUEST" && payload.studentId) {
          const reqId = payload.studentId;
          // 1. Check offline pending queue
          const foundInQueue = offlinePendingQueue.find(
            (q) => q.record?.studentId === reqId || q.record?.id === reqId
          );
          if (foundInQueue && foundInQueue.record?.photoPath) {
            handleSyncOfflineQueue();
          } else {
            // 2. Check local client IndexedDB
            try {
              const all = await getAllStudentsFromDB();
              const found = all.find((s: any) => s.studentId === reqId || s.id === reqId);
              if (found && found.photoPath) {
                publishStudentSync("UPSERT", found).catch(() => {});
              }
            } catch {}
          }
        }
      }
    );
    return () => unsubscribe();
  }, [offlinePendingQueue]);

  // Auto-reset countdown timer & instant keyboard advance when "Sent Successfully" dialog is shown
  useEffect(() => {
    if (!sentSuccessfullyData) return;
    setAutoResetTimer(1);
    const interval = setInterval(() => {
      setAutoResetTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleResetForm();
          return 0;
        }
        return prev - 1;
      });
    }, 1400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        clearInterval(interval);
        handleResetForm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
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

  const capitalizeWords = (str: string): string => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ""))
      .join(" ");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let finalVal: any = value;
    if (name === "dateOfBirth") {
      finalVal = value ? new Date(value) : undefined;
    } else if (name === "fullName" || name === "guardianFullName") {
      // Auto-capitalize student name and father/guardian name as typed (Requirement 3)
      const words = value.split(" ");
      finalVal = words
        .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
        .join(" ");
    } else if (name === "phone" || name === "emergencyContactPhone") {
      // Auto +2517 for 07 start (Requirement 14) and +2519 for 09 start
      let p = value.trim();
      if (p.startsWith("07")) {
        p = "+2517" + p.substring(2);
      } else if (p.startsWith("09")) {
        p = "+2519" + p.substring(2);
      } else if (p.startsWith("2517")) {
        p = "+2517" + p.substring(4);
      } else if (p.startsWith("2519")) {
        p = "+2519" + p.substring(4);
      }
      finalVal = p;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: finalVal,
    }));
  };

  const handleNameBlur = (fieldName: "fullName" | "guardianFullName") => {
    if (formData[fieldName]) {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: capitalizeWords(prev[fieldName] || ""),
      }));
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone) {
      let p = formData.phone.trim();
      if (p.startsWith("07")) p = "+2517" + p.substring(2);
      else if (p.startsWith("09")) p = "+2519" + p.substring(2);
      else if (p.startsWith("2517")) p = "+2517" + p.substring(4);
      else if (p.startsWith("2519")) p = "+2519" + p.substring(4);
      setFormData((prev) => ({
        ...prev,
        phone: p,
      }));
    }
  };

  const handleSectionChange = (sec: string) => {
    setSelectedSection(sec);
    const validSchools =
      sec === "Adama"
        ? ["Sena Yerosen", "Debebech", "Yacine", "Odda"]
        : sec === "Addis Ababa"
        ? ["YMS", "Adika Youth", "School Of America"]
        : sec === "Mojjo"
        ? ["Mojjo"]
        : [];
    const defaultSchoolForSec = validSchools[0] || "";
    setFormData((prev) => ({
      ...prev,
      address: sec,
      school: validSchools.includes(prev.school || "") ? prev.school : defaultSchoolForSec,
    }));
  };

  const handleSchoolChange = (schoolName: string) => {
    let sec = selectedSection;
    if (["Sena Yerosen", "Debebech", "Yacine", "Odda"].includes(schoolName)) {
      sec = "Adama";
    } else if (["YMS", "Adika Youth", "School Of America"].includes(schoolName)) {
      sec = "Addis Ababa";
    } else if (["Mojjo"].includes(schoolName)) {
      sec = "Mojjo";
    }
    setSelectedSection(sec);
    setFormData((prev) => ({
      ...prev,
      school: schoolName,
      address: sec,
    }));
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
   * Called when webcam captures an image (Auto-attached in ~150KB ID-card bounds).
   */
  const handleWebcamCaptured = (file: File, previewUrl: string) => {
    setIsCameraOpen(false);
    setPhotoWasEdited(false);
    setEditedPhotoPreview(previewUrl);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setOfficialPhotoPath(dataUri);
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
    setPhotoWasEdited(true);
    const previewUrl = URL.createObjectURL(editedBlob);
    setEditedPhotoPreview(previewUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setOfficialPhotoPath(dataUri);
    };
    reader.readAsDataURL(editedBlob);
  };

  /**
   * Fast Gallery File Selection: Automatically scales large phone photos to 300 DPI ID bounds
   */
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoWasEdited(false);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      const maxW = 900;
      const maxH = 1200;
      if (w > maxW || h > maxH) {
        const scale = Math.min(maxW / w, maxH / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setEditedPhotoPreview(dataUrl);
        setOfficialPhotoPath(dataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setEditedPhotoPreview(dataUrl);
          setOfficialPhotoPath(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    img.src = objectUrl;
  };

  /**
   * Executes student registration and multi-stage delivery pipeline.
   */
  const executeStudentSubmission = () => {
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
          address: formData.address || selectedSection,
          school: formData.school,
          department: formData.department,
          academicYear: formData.academicYear,
          guardianFullName: formData.guardianFullName,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactPhone: formData.emergencyContactPhone,
          nationality: formData.nationality,
          bloodType: formData.bloodType && formData.bloodType.trim() && formData.bloodType.trim() !== "Unknown" ? formData.bloodType.trim() : null,
          photoPath: officialPhotoPath && !officialPhotoPath.startsWith("blob:") ? officialPhotoPath : null,
          status: formData.status as any,
          customFields: customFieldValues,
        };

        // Real QR Code Payload: Auto-generated for instant verification & receiver sync
        const qrPayload = JSON.stringify({
          id: payload.studentId,
          name: payload.fullName,
          roll: formData.rollNumber || "",
          grade: payload.grade,
        });
        payload.qrCodeData = qrPayload;

        // Construct standard record for IndexedDB and sync
        const record = {
          id: formData.studentId!,
          studentId: payload.studentId,
          fullName: payload.fullName,
          grade: payload.grade,
          sex: payload.sex,
          phone: payload.phone,
          emailAddress: payload.emailAddress || null,
          address: payload.address || selectedSection,
          school: payload.school || null,
          department: payload.department || null,
          academicYear: payload.academicYear || null,
          guardianFullName: payload.guardianFullName || null,
          emergencyContactPhone: payload.emergencyContactPhone || null,
          emergencyContactName: payload.emergencyContactName || null,
          bloodType: payload.bloodType && payload.bloodType.trim() !== "Unknown" ? payload.bloodType.trim() : null,
          nationality: payload.nationality || null,
          photoPath: officialPhotoPath && !officialPhotoPath.startsWith("blob:") ? officialPhotoPath : null,
          qrCodeData: qrPayload,
          status: payload.status || "ACTIVE",
          createdAt: new Date().toISOString(),
          customValues: Object.entries(customFieldValues).map(([k, v]) => ({
            customField: { label: k, fieldKey: k },
            value: v,
          })),
        };

        // Telegram Sequential Delivery: Wait for local desktop backup + PostgreSQL + Supabase Cloud
        setIsDelivering(true);
        setDeliveryProgress({
          stage: 1,
          stageName: "Local Backup & Photo Pipeline",
          detail: "Encoding photo, backing up to host PC folders...",
        });

        const deliveryRes = await deliverStudentSequentially(payload, record, (prog) => {
          setDeliveryProgress(prog);
        });

        setIsDelivering(false);

        if (!deliveryRes.success) {
          setErrorMessage(deliveryRes.error || "Delivery failed. Student is saved in outbox and will not advance until delivered.");
          return;
        }

        // Clear active form draft since student is safely enrolled & confirmed
        clearActiveDraft();

        // Optimistically increment station registered counters (per day, per month, total)
        setSenderStats((prev) => ({
          ...prev,
          studentsRegistered: prev.studentsRegistered + 1,
          studentsRegisteredToday: prev.studentsRegisteredToday + 1,
          studentsRegisteredThisMonth: prev.studentsRegisteredThisMonth + 1,
          studentsWithPhotos: payload.photoPath ? prev.studentsWithPhotos + 1 : prev.studentsWithPhotos,
        }));

        // If active task exists, increment completed count optimistically
        setActiveTasks((prev) =>
          prev.map((t, idx) => (idx === 0 ? { ...t, completedCount: t.completedCount + 1 } : t))
        );

        // Show "Sent Successfully!" confirmation modal
        setSentSuccessfullyData({
          studentId: payload.studentId,
          fullName: payload.fullName,
          grade: payload.grade,
          sex: payload.sex,
          folderSaved: true,
          supabaseUploaded: true,
          qrCodeData: qrPayload,
        });
      } catch (err: any) {
        setIsDelivering(false);
        setErrorMessage(err?.message || "Communication failure while enrolling student.");
      }
    });
  };

  /**
   * Fast Submit with Slash Mark Rejection & Photo Edit Quality Reminder (Requirement 6).
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Prohibited character / slash rejection (Requirement 6)
    const slashCheckList = [
      { label: "Full Name", value: formData.fullName },
      { label: "Student ID", value: formData.studentId },
      { label: "Grade", value: formData.grade },
      { label: "Phone Number", value: formData.phone },
      { label: "School Name", value: formData.school },
      { label: "Section / Branch", value: formData.address },
      { label: "Guardian / Father Name", value: formData.guardianFullName },
    ];
    const slashMatch = slashCheckList.find(
      (item) => item.value && (item.value.includes("/") || item.value.includes("\\"))
    );
    if (slashMatch) {
      setSlashAlertModal({
        isOpen: true,
        message: `Remove any mark like / for senders! The "${slashMatch.label}" field contains prohibited mark "${slashMatch.value}". Slashes (/) and backslashes (\\) are rejected by the system.`,
      });
      return;
    }

    // 2. Validate required fields
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

    // 3. Photo Edit Reminder (Requirement 6)
    if (officialPhotoPath && !photoWasEdited) {
      setShowPhotoReminderModal(true);
      return;
    }

    executeStudentSubmission();
  };

  const handleResetForm = () => {
    clearActiveDraft();
    setPhotoWasEdited(false);
    let defaultGrade = "10";
    let defaultSchool = "Sena Yerosen";
    let defaultAcademicYear = "2026-2027";
    let idPrefix = "SB-";
    try {
      const saved = localStorage.getItem("sb_app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.defaultGrade) defaultGrade = parsed.defaultGrade;
        if (parsed.schoolName) defaultSchool = parsed.schoolName;
        if (parsed.academicYear) defaultAcademicYear = parsed.academicYear;
        if (parsed.idPrefix) idPrefix = parsed.idPrefix;
      }
    } catch {}

    setFormData({
      studentId: `${idPrefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName: "",
      grade: defaultGrade,
      sex: "Male",
      phone: "",
      emailAddress: "",
      address: selectedSection || "Adama",
      school: defaultSchool,
      department: "",
      academicYear: defaultAcademicYear,
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
    setTimeout(() => {
      fullNameInputRef.current?.focus();
    }, 60);
  };

  return (
    <div className="min-h-screen bg-[#f7faf9] dark:bg-[#070908] text-[#080808] dark:text-[#f2f7f4] pb-16 transition-colors duration-200">
      {/* Phone-Centric Container */}
      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

        {/* Offline Queue & Network Status Banner */}
        {(offlinePendingQueue.length > 0 || !isOnline) && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {!isOnline ? (
                  <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <Wifi className="h-4 w-4 text-[#8fe617] shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-[#080808] dark:text-[#f2f7f4] flex items-center gap-2 font-mono">
                    <span>{!isOnline ? "Working Offline" : "Network Connected"}</span>
                    {offlinePendingQueue.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                        {offlinePendingQueue.length} Queued
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6b7771] dark:text-[#8a9e93]">
                    {offlinePendingQueue.length > 0
                      ? "Enrolled students stored safely on this phone with full photos."
                      : "Ready to sync records back into student directory."}
                  </div>
                </div>
              </div>
            </div>

            {offlinePendingQueue.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={handleDownloadOfflineBackup}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-[#161e19] border border-amber-500/30 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-neutral-100 dark:hover:bg-[#223126] transition-all shadow-xs cursor-pointer"
                  title="Download offline registrations backup file (.json)"
                >
                  <Download className="h-3.5 w-3.5 text-amber-500" />
                  <span>Download Backup ({offlinePendingQueue.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncOfflineQueue}
                  disabled={isSyncingOfflineQueue}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#8fe617] text-[#070908] text-xs font-mono font-black hover:brightness-105 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title="Sync offline students to server and directory"
                >
                  {isSyncingOfflineQueue ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>{isSyncingOfflineQueue ? "Syncing..." : "Sync to Directory"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Enterprise Progressive Outbox Buffer Banner */}
        {outboxQueue.length > 0 && (
          <div className="rounded-2xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3.5 flex items-center justify-between gap-2.5 text-xs text-sky-800 dark:text-sky-300 shadow-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <span className="font-bold">Zero-Data-Loss Outbox: </span>
                <span>{outboxQueue.length} student(s) syncing in 3 progressive stages (150px thumbnail &rarr; 800px preview &rarr; master).</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerOutboxWorker()}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-mono text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
            >
              Sync Now
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="rounded-xl border border-red-300 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3.5 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-400 font-semibold shadow-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Station Output Telemetry Banner: Registrations to Admin (Per Day & Per Month) */}
        <div className="rounded-2xl border border-[#8fe617]/40 bg-gradient-to-r from-[#8fe617]/15 via-emerald-500/10 to-transparent p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#8fe617] text-[#062404] flex items-center justify-center font-mono font-black text-sm shadow-md shadow-[#8fe617]/20 shrink-0">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-xs font-black uppercase text-[#080808] dark:text-[#f2f7f4] tracking-tight">
                    Station Output
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-[#8fe617]/25 text-[#062404] dark:text-[#8fe617] font-bold">
                    TO ADMIN
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  Operator: <strong className="text-[#080808] dark:text-[#f2f7f4]">{senderStats.senderName || "Sender Station"}</strong> • {senderStats.studentsWithPhotos} portraits verified
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xl font-black font-mono text-[#080808] dark:text-[#f2f7f4] leading-none">
                {senderStats.studentsRegistered}
              </div>
              <div className="text-[8px] font-mono font-bold text-[#6b7771] dark:text-[#8a9e93] uppercase mt-0.5">
                Total Intake
              </div>
            </div>
          </div>

          {/* Daily & Monthly Cadence Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#8fe617]/20">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-[#111613]/80 border border-[#8fe617]/30 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  Registered Today
                </span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                +{senderStats.studentsRegisteredToday}
              </span>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-[#111613]/80 border border-blue-500/30 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">🗓️</span>
                <span className="text-[10px] font-mono font-bold text-[#080808] dark:text-[#f2f7f4]">
                  This Month
                </span>
              </div>
              <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                {senderStats.studentsRegisteredThisMonth}
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================================
            ACTIVE ASSIGNED SENDER TASK BANNER (Requirement 5)
           ==================================================================== */}
        {activeTasks.length > 0 && (
          <div className="rounded-2xl border-2 border-[#8fe617]/50 bg-[#8fe617]/10 dark:bg-[#8fe617]/5 p-3.5 shadow-sm space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#8fe617] text-[#062404] font-black text-sm">
                  🎯
                </span>
                <div>
                  <div className="text-xs font-bold text-[#080808] dark:text-[#f2f7f4]">
                    Assigned Task: {activeTasks[0].title}
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                    {activeTasks[0].school ? `School: ${activeTasks[0].school}` : ""}{" "}
                    {activeTasks[0].section ? `• ${activeTasks[0].section} Section` : ""}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-black text-[#8fe617]">
                  {activeTasks[0].completedCount} / {activeTasks[0].targetCount}
                </span>
                <span className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] block">
                  ({Math.min(100, Math.round((activeTasks[0].completedCount / (activeTasks[0].targetCount || 1)) * 100))}%)
                </span>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#8fe617] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((activeTasks[0].completedCount / (activeTasks[0].targetCount || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* ====================================================================
            PORTRAIT CAMERA (EASY PHONE VIEWPORT, PURE 3:4 STUDIO)
           ==================================================================== */}
        <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] dark:border-t-2 dark:border-t-[#8fe617] bg-white dark:bg-[#111613] p-4 shadow-sm dark:shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_15px_rgba(143,230,23,0.06)] space-y-3 transition-all duration-200">
          <div className="flex items-center justify-end pb-1">
            {officialPhotoPath && (
              <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" /> Photo Attached
              </span>
            )}
          </div>

          {/* Photo Viewfinder Display */}
          <div className="relative aspect-[3/4] max-w-[240px] mx-auto rounded-2xl border-2 border-dashed border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] overflow-hidden flex items-center justify-center shadow-inner group">
            {editedPhotoPreview ? (
              <img
                src={editedPhotoPreview}
                alt="Student portrait"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-1.5">
                <div className="h-12 w-12 rounded-full bg-[#eef5f1] dark:bg-[#232d27] flex items-center justify-center text-[#080808] dark:text-[#f2f7f4]">
                  <Camera className="h-6 w-6 stroke-[1.75] text-[#8fe617]" />
                </div>
                <div className="text-xs font-bold text-[#080808] dark:text-[#f2f7f4]">Take Student Photo</div>
                <div className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93]">
                  3:4 Portrait Photo
                </div>
              </div>
            )}

            {/* Quick Actions Hover/Tap Overlay */}
            {editedPhotoPreview && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 backdrop-blur-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (editedPhotoPreview) {
                      setEditorImageSrc(editedPhotoPreview);
                      setIsEditorOpen(true);
                    }
                  }}
                  className="w-36 rounded-xl bg-[#8fe617] text-[#062404] py-1.5 text-xs font-black shadow-md flex items-center justify-center gap-1.5 cool-btn-hover cursor-pointer"
                >
                  <Crop className="h-3.5 w-3.5" />
                  <span>Edit / Crop Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleLaunchCamera}
                  className="w-36 rounded-xl bg-white dark:bg-[#1c2420] text-[#080808] dark:text-[#f2f7f4] py-1.5 text-xs font-bold shadow-md flex items-center justify-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-[#232d27] cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-[#8fe617]" />
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8fe617] text-[#062404] py-3 px-4 text-xs font-mono font-black shadow-[0_0_18px_rgba(143,230,23,0.35)] hover:bg-[#7ecc10] active:scale-95 cool-btn-hover transition-all cursor-pointer"
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
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#8fe617] bg-[#8fe617]/10 py-2.5 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#8fe617]/20 transition-colors cool-btn-hover cursor-pointer"
              >
                <Crop className="h-3.5 w-3.5 text-[#8fe617]" />
                <span>Edit & Crop Photo</span>
              </button>
            ) : (
              <label className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] py-2.5 text-xs font-mono font-semibold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] transition-colors cool-btn-hover cursor-pointer">
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
            CORE STUDENT CREDENTIALS (EASY PHONE INPUTS)
           ==================================================================== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-[#dce7e1] dark:border-[#223126] dark:border-t-2 dark:border-t-[#8fe617] bg-white dark:bg-[#111613] p-4 shadow-sm dark:shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_15px_rgba(143,230,23,0.06)] space-y-3.5 transition-all duration-200">
            <div className="flex items-center justify-between border-b border-[#eef5f1] dark:border-[#223126] pb-2">
              <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-[#080808] dark:text-[#f2f7f4]">
                Student Information
              </span>
              <span className="text-[10px] font-mono text-[#8fe617] font-bold">REQUIRED</span>
            </div>

            {/* Student ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#080808] dark:text-[#f2f7f4] font-mono">
                  Student ID <span className="text-red-500">*</span>
                </label>
                {idAvailability.checking ? (
                  <span className="text-[10px] font-mono text-[#6b7771] dark:text-[#8a9e93] flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> checking...
                  </span>
                ) : idAvailability.available === true ? (
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">✓ Ready</span>
                ) : idAvailability.available === false ? (
                  <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">✕ Taken</span>
                ) : null}
              </div>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g. STU-2026-001"
                required
                className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] focus:outline-none transition-all"
              />
            </div>

            {/* Full Name (Auto-Capitalized: e.g. miskr dires -> Miskr Dires) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={fullNameInputRef}
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={() => handleNameBlur("fullName")}
                placeholder="e.g. Miskr Dires"
                required
                className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 text-xs text-[#080808] dark:text-[#f2f7f4] font-semibold placeholder:text-[#6b7771] dark:placeholder:text-[#8a9e93] focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] focus:outline-none transition-all"
              />
            </div>

            {/* Sex / Gender Dropdown (Blue Hover & Focus) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                Sex <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 pr-10 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:border-blue-500 hover:shadow-[0_0_14px_rgba(59,130,246,0.35)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all cursor-pointer accent-blue-500"
                >
                  <option value="Male" className="bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4]">Male</option>
                  <option value="Female" className="bg-white dark:bg-[#161c18] text-[#080808] dark:text-[#f2f7f4]">Female</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-blue-500">
                  <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Blood Type Selector */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono flex items-center justify-between">
                <span>Blood Group / Type</span>
                <span className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-normal">Optional</span>
              </label>
              <div className="relative">
                <select
                  name="bloodType"
                  value={formData.bloodType || ""}
                  onChange={handleChange}
                  className="w-full appearance-none rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 pr-10 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:border-red-500 hover:shadow-[0_0_14px_rgba(239,68,68,0.25)] focus:border-red-500 focus:ring-2 focus:ring-red-500/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- No Blood Group Selected --</option>
                  <option value="A+">A+ (A Positive)</option>
                  <option value="A-">A- (A Negative)</option>
                  <option value="B+">B+ (B Positive)</option>
                  <option value="B-">B- (B Negative)</option>
                  <option value="AB+">AB+ (AB Positive)</option>
                  <option value="AB-">AB- (AB Negative)</option>
                  <option value="O+">O+ (O Positive)</option>
                  <option value="O-">O- (O Negative)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-red-500">
                  <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Grade (Writable Input - Supports KG, KG-1, 10, etc.) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                Grade / Class <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                placeholder="e.g. 10, KG, or KG-1"
                required
                className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] placeholder:text-[#6b7771] dark:placeholder:text-[#8a9e93] hover:border-[#8fe617] focus:border-[#8fe617] focus:ring-2 focus:ring-[#8fe617]/30 focus:outline-none transition-all"
              />
            </div>

            {/* Branch / Section Selection (Requirement 7) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                Section / Branch <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 pr-10 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] focus:border-[#8fe617] focus:ring-2 focus:ring-[#8fe617]/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Adama">Adama Section</option>
                  <option value="Addis Ababa">Addis Ababa Section</option>
                  <option value="Mojjo">Mojjo Section</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8fe617]">
                  <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* School Dropdown (Requirement 7: Sena Yerosen, Debebech, Yacine, Odda from adama section; YMS, Adika Youth, School Of America for adisababa section; and Mojjo for mojjo section) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                School Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="school"
                  value={formData.school || ""}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  required
                  className="w-full appearance-none rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 pr-10 text-xs font-mono font-bold text-[#080808] dark:text-[#f2f7f4] hover:border-[#8fe617] focus:border-[#8fe617] focus:ring-2 focus:ring-[#8fe617]/30 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Select School --</option>
                  {(!selectedSection || selectedSection === "Adama") && (
                    <optgroup label="Adama Section" className="font-bold text-[#080808] dark:text-[#8fe617]">
                      <option value="Sena Yerosen">Sena Yerosen</option>
                      <option value="Debebech">Debebech</option>
                      <option value="Yacine">Yacine</option>
                      <option value="Odda">Odda</option>
                    </optgroup>
                  )}
                  {(!selectedSection || selectedSection === "Addis Ababa") && (
                    <optgroup label="Addis Ababa Section" className="font-bold text-[#080808] dark:text-[#8fe617]">
                      <option value="YMS">YMS</option>
                      <option value="Adika Youth">Adika Youth</option>
                      <option value="School Of America">School Of America</option>
                    </optgroup>
                  )}
                  {(!selectedSection || selectedSection === "Mojjo") && (
                    <optgroup label="Mojjo Section" className="font-bold text-[#080808] dark:text-[#8fe617]">
                      <option value="Mojjo">Mojjo</option>
                    </optgroup>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#8fe617]">
                  <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Phone Number (Auto +2517 for 07 / +2519 for 09) */}
            <div>
              <label className="block text-xs font-bold text-[#080808] dark:text-[#f2f7f4] mb-1 font-mono">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handlePhoneBlur}
                placeholder="+2517... or +2519..."
                required
                className="w-full rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3.5 py-2.5 text-xs font-mono text-[#080808] dark:text-[#f2f7f4] placeholder:text-[#6b7771] dark:placeholder:text-[#8a9e93] hover:border-[#8fe617] focus:border-[#8fe617] focus:ring-2 focus:ring-[#8fe617]/30 focus:outline-none transition-all"
              />
            </div>

            {/* Collapsible Additional Details */}
            <div className="pt-2 border-t border-[#eef5f1] dark:border-[#26332b]">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="flex items-center justify-between w-full text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] py-1 transition-colors"
              >
                <span>{showOptionalFields ? "Hide Extra Details" : "+ More Details (DOB, Guardian, Address)"}</span>
                {showOptionalFields ? <ChevronUp className="h-4 w-4 text-[#8fe617]" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showOptionalFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">Academic Year</label>
                    <input
                      type="text"
                      name="academicYear"
                      value={formData.academicYear || ""}
                      onChange={handleChange}
                      placeholder="2026-2027"
                      className="w-full rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">Guardian / Father Name</label>
                    <input
                      type="text"
                      name="guardianFullName"
                      value={formData.guardianFullName || ""}
                      onChange={handleChange}
                      onBlur={() => handleNameBlur("guardianFullName")}
                      placeholder="e.g. Dires Kebede"
                      className="w-full rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone || ""}
                      onChange={handleChange}
                      placeholder="Emergency phone"
                      className="w-full rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
                    />
                  </div>

                  {customFieldsList.map((cf) => (
                    <div key={cf.id}>
                      <label className="block text-[11px] font-mono text-[#6b7771] dark:text-[#8a9e93] mb-1">{cf.label}</label>
                      <input
                        type="text"
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => handleCustomFieldChange(cf.fieldKey, e.target.value)}
                        className="w-full rounded-lg border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] px-3 py-2 text-xs text-[#080808] dark:text-[#f2f7f4] focus:outline-none focus:border-[#8fe617] focus:ring-1 focus:ring-[#8fe617] transition-all"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ====================================================================
              ACTION BUTTONS (STANDARD POSITION: SAVE & SEND + CLEAR FORM)
             ==================================================================== */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isPending || isDelivering || idAvailability.available === false}
              className="flex-1 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#8fe617] py-3.5 px-6 text-sm font-mono font-black text-[#062404] hover:bg-[#7ecc10] active:scale-[0.98] animated-btn transition-all shadow-[0_0_22px_rgba(143,230,23,0.45)] disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#062404]" />
                  <span>Registering & Syncing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-[#062404] stroke-[2.5]" />
                  <span>SAVE & SEND TO RECEIVER</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              disabled={isPending}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#161c18] hover:bg-neutral-100 dark:hover:bg-[#232d27] text-xs font-mono font-bold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] hover:border-[#8fe617] hover:shadow-[0_0_14px_rgba(143,230,23,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer animated-btn shrink-0"
              title="Reset all form fields and photo"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear Form</span>
            </button>
          </div>
        </form>
      </div>

      {/* ====================================================================
          SEQUENTIAL INGESTION & VERIFICATION PROGRESS MODAL
         ==================================================================== */}
      {isDelivering && deliveryProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#8fe617] bg-white dark:bg-[#161c18] p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Circular Rotating Loader */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#080808] border-2 border-[#8fe617]/50 shadow-[0_0_25px_rgba(143,230,23,0.3)]">
              <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#8fe617] border-r-[#8fe617] stage-spinner-circle" />
              <span className="text-sm font-mono font-black text-[#8fe617]">
                {deliveryProgress.stage}/3
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-mono font-black tracking-tight text-[#080808] dark:text-[#f2f7f4]">
                Confirming Ingestion Pipeline...
              </h3>
              <p className="text-xs font-mono text-[#8fe617] font-bold">
                Stage {deliveryProgress.stage}: {deliveryProgress.stageName}
              </p>
              <p className="text-[11px] text-[#6b7771] dark:text-[#a4b8ad]">
                {deliveryProgress.detail}
              </p>
            </div>

            {/* 3-Stage Progress Confirmation Steps */}
            <div className="space-y-1.5 pt-2 border-t border-[#dce7e1] dark:border-[#223126] text-left font-mono text-xs">
              <div
                className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                  deliveryProgress.stage === 1
                    ? "bg-[#8fe617]/15 border border-[#8fe617]/40 text-[#080808] dark:text-[#f2f7f4] font-bold"
                    : deliveryProgress.stage > 1
                    ? "text-emerald-500 font-medium"
                    : "text-[#6b7771] opacity-50"
                }`}
              >
                <span>{deliveryProgress.stage > 1 ? "✓✓" : "1."}</span>
                <span>Local IndexedDB & Desktop Backup</span>
              </div>
              <div
                className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                  deliveryProgress.stage === 2
                    ? "bg-[#8fe617]/15 border border-[#8fe617]/40 text-[#080808] dark:text-[#f2f7f4] font-bold"
                    : deliveryProgress.stage > 2
                    ? "text-emerald-500 font-medium"
                    : "text-[#6b7771] opacity-50"
                }`}
              >
                <span>{deliveryProgress.stage > 2 ? "✓✓" : "2."}</span>
                <span>PostgreSQL Cloud Database</span>
              </div>
              <div
                className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                  deliveryProgress.stage === 3
                    ? "bg-[#8fe617]/15 border border-[#8fe617]/40 text-[#080808] dark:text-[#f2f7f4] font-bold"
                    : "text-[#6b7771] opacity-50"
                }`}
              >
                <span>3.</span>
                <span>Supabase Storage Bucket (&apos;student data&apos;)</span>
              </div>
            </div>

            <div className="text-[10px] text-[#6b7771] dark:text-[#8a9e93] font-mono">
              Enforcing multi-destination delivery confirmation before next entry...
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          "SENT SUCCESSFULLY!" CELEBRATION MODAL
         ==================================================================== */}
      {sentSuccessfullyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border-2 border-[#8fe617] bg-white dark:bg-[#161c18] p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Animated Check Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#8fe617] shadow-[0_0_25px_rgba(143,230,23,0.6)]">
              <Check className="h-9 w-9 text-[#062404] stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-mono font-black tracking-tight text-[#080808] dark:text-[#f2f7f4]">
                Delivered Successfully!
              </h3>
              <p className="text-xs text-[#3f4743] dark:text-[#a4b8ad]">
                Verified across Host Folder, PostgreSQL &amp; Supabase Cloud
              </p>
            </div>

            {/* Student Preview Card with Real QR Code */}
            <div className="rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-[#f7faf9] dark:bg-[#1c2420] p-3 text-left space-y-2 font-mono text-xs">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#080808] dark:text-[#f2f7f4] text-sm truncate">
                    {sentSuccessfullyData.fullName}
                  </div>
                  <div className="text-[#3f4743] dark:text-[#a4b8ad] mt-0.5">
                    ID: <strong className="text-[#080808] dark:text-[#f2f7f4]">{sentSuccessfullyData.studentId}</strong>
                  </div>
                  <div className="text-[#3f4743] dark:text-[#a4b8ad]">
                    Class: {sentSuccessfullyData.grade} • {sentSuccessfullyData.sex}
                  </div>
                </div>

                {/* Scannable Real QR Preview */}
                {sentSuccessfullyData.qrCodeData && (
                  <div
                    className="shrink-0 text-center cursor-pointer group/qr p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    onClick={() => {
                      const cleanName = (sentSuccessfullyData.fullName || sentSuccessfullyData.studentId || "Student")
                        .trim()
                        .replace(/[\\/:*?"<>|]/g, "_")
                        .replace(/\s+/g, " ") || "Student_QR";
                      const a = document.createElement("a");
                      a.href = `/api/qr?data=${encodeURIComponent(sentSuccessfullyData.qrCodeData!)}&name=${encodeURIComponent(cleanName)}&studentId=${encodeURIComponent(sentSuccessfullyData.studentId)}&download=1`;
                      a.download = `${cleanName}.png`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        try { document.body.removeChild(a); } catch {}
                      }, 500);
                    }}
                    title={`Click to download QR photo (${sentSuccessfullyData.fullName}.png)`}
                  >
                    <img
                      src={`/api/qr?data=${encodeURIComponent(sentSuccessfullyData.qrCodeData)}&name=${encodeURIComponent(sentSuccessfullyData.fullName || "")}`}
                      alt="Student QR"
                      className="w-14 h-14 rounded-lg border border-[#8fe617]/60 bg-white p-0.5 shadow-xs group-hover/qr:scale-105 transition-transform"
                    />
                    <span className="block text-[8px] font-bold text-[#8fe617] mt-0.5 group-hover/qr:underline">SAVE QR</span>
                  </div>
                )}
              </div>

              <div className="pt-1.5 border-t border-[#dce7e1] dark:border-[#26332b] space-y-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                <div>✓ Real QR Code Auto-Encoded &amp; Assigned</div>
                <div>✓ Host PC Backup Folder (Desktop)</div>
                <div>✓ Supabase Cloud PostgreSQL DB</div>
                <div>✓ Supabase Storage Bucket (&apos;student data&apos;)</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full rounded-xl bg-[#8fe617] text-[#062404] py-2.5 text-xs font-mono font-black shadow-md hover:bg-[#7ecc10] cool-btn-hover transition-all cursor-pointer"
              >
                Register Next Student (Enter ↵ • {autoResetTimer}s)
              </button>
              <Link
                href={`/sender/receipts?studentId=${sentSuccessfullyData.studentId}`}
                className="w-full flex items-center justify-center gap-1 rounded-xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] py-2 text-xs font-mono font-semibold text-[#080808] dark:text-[#f2f7f4] hover:bg-[#eef5f1] dark:hover:bg-[#232d27] cool-btn-hover transition-colors"
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
        initialFacingMode={cameraFacing}
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

      {/* ====================================================================
          SLASH MARK PROHIBITION REJECTION MODAL (Requirement 6)
         ==================================================================== */}
      {slashAlertModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border-2 border-red-500/50 bg-white dark:bg-[#111613] p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center text-red-500 animate-bounce">
              <AlertCircle className="h-9 w-9 stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Prohibited Mark Detected
              </div>
              <h3 className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-1">
                Remove Any Mark Like &quot;/&quot; For Senders
              </h3>
              <p className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mt-2 leading-relaxed">
                {slashAlertModal.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSlashAlertModal(null)}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              I Will Fix It (OK)
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          PHOTO EDIT & CROP REMINDER MODAL (Requirement 6)
         ==================================================================== */}
      {showPhotoReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border-2 border-amber-500/50 bg-white dark:bg-[#111613] p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500">
              <Crop className="h-9 w-9 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Quality Control Reminder
              </div>
              <h3 className="text-lg font-black text-[#080808] dark:text-[#f2f7f4] mt-1">
                Photo Has Not Been Cropped / Edited
              </h3>
              <p className="text-xs font-mono text-[#6b7771] dark:text-[#8a9e93] mt-2 leading-relaxed">
                The student portrait has been attached, but you have not adjusted or cropped it in the studio editor. Cropping ensures accurate 3:4 badge proportions and prevents card rejections.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPhotoReminderModal(false);
                  if (editedPhotoPreview) {
                    setEditorImageSrc(editedPhotoPreview);
                    setIsEditorOpen(true);
                  }
                }}
                className="w-full flex-1 py-3 rounded-2xl bg-[#8fe617] hover:bg-[#7ecc10] text-[#062404] font-mono font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crop className="h-4 w-4" />
                <span>Edit &amp; Crop Now</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPhotoReminderModal(false);
                  setPhotoWasEdited(true);
                  executeStudentSubmission();
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-[#dce7e1] dark:border-[#26332b] bg-white dark:bg-[#1c2420] text-xs font-mono font-bold text-[#6b7771] dark:text-[#8a9e93] hover:text-[#080808] dark:hover:text-[#f2f7f4] transition-colors cursor-pointer"
              >
                Send Without Cropping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
