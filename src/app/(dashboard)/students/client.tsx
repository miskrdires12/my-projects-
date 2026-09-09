"use client";

// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE 20,000+ STUDENT DIRECTORY CLIENT
// Scalable server-side pagination, multi-filtering, bulk photo downloads,
// single photo downloads, and deep profile inspection drawer.
// ============================================================================

import React, { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  Printer,
  Eye,
  Trash2,
  QrCode,
  X,
  Camera,
  Download,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tag,
  UserPlus,
  Users,
  Upload,
  FileSpreadsheet,
  Crop,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  deleteStudentAction,
  clearAllStudentsAction,
  deleteMultipleStudentsAction,
  updateStudentPhotoAction,
} from "@/actions/students";
import type { UserRole } from "@/types/auth";
import { subscribeToCloudSync } from "@/lib/sync-client";
import { RECEIVER_EXCEL_HEADERS, getStudentPhotoLocalPath, formatPhoneForReceiver } from "@/lib/export-utils";
import { PhotoEditorModal } from "@/components/camera/PhotoEditorModal";

interface StudentExtended {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex: string;
  phone: string;
  department?: string | null;
  school?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  academicYear?: string | null;
  guardianFullName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactName?: string | null;
  bloodType?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | Date | null;
  photoPath?: string | null;
  qrCodeData?: string | null;
  status: string;
  batch?: { batchNumber: string; title: string } | null;
  customValues?: { customField: { label: string; fieldKey: string }; value: string }[];
}

interface StudentDirectoryClientProps {
  students: StudentExtended[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  grades: string[];
  departments: string[];
  batches: { id: string; batchNumber: string; title: string }[];
  userRole: UserRole;
  gradeCounts?: Record<string, number>;
}

export const StudentDirectoryClient: React.FC<StudentDirectoryClientProps> = ({
  students,
  totalCount,
  currentPage,
  pageSize,
  grades,
  departments,
  batches: _batches,
  userRole,
  gradeCounts,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Dual-Persistence Client State
  const [displayStudents, setDisplayStudents] = useState<StudentExtended[]>(students);
  const [editingStudent, setEditingStudent] = useState<StudentExtended | null>(null);
  const [isGradeExportModalOpen, setIsGradeExportModalOpen] = useState<boolean>(false);

  // Safe localStorage helper to prevent QuotaExceededError on 5,000–6,000 records
  const safeSaveLocalEnrolledStudents = (list: StudentExtended[]) => {
    try {
      const capped = list.slice(0, 250);
      localStorage.setItem("sb_enrolled_students", JSON.stringify(capped));
    } catch (err) {
      console.warn("localStorage quota protection engaged:", err);
    }
  };

  // 1. Initial Load: Merge server students, localStorage, and pull from /api/students/sync with tombstone suppression
  useEffect(() => {
    const loadAndMerge = async () => {
      let deletedIds = new Set<string>();
      try {
        const rawDel = localStorage.getItem("sb_deleted_student_ids");
        if (rawDel) {
          deletedIds = new Set(JSON.parse(rawDel));
        }
      } catch {}

      let localList: StudentExtended[] = [];
      try {
        const raw = localStorage.getItem("sb_enrolled_students");
        if (raw) localList = JSON.parse(raw);
      } catch {}

      const map = new Map<string, StudentExtended>();
      localList.forEach((s) => {
        if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
          map.set(s.studentId, s);
        }
      });
      students.forEach((s) => {
        if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
          map.set(s.studentId, s);
        }
      });

      // Also pull latest from /api/students/sync (which rehydrates from Cloud Sync if container was empty)
      try {
        const res = await fetch("/api/students/sync");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.students)) {
            data.students.forEach((s: any) => {
              if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
                map.set(s.studentId, s);
              }
            });
          }
        }
      } catch {}

      const merged = Array.from(map.values());
      setDisplayStudents(merged);
      safeSaveLocalEnrolledStudents(merged);
    };

    loadAndMerge();
  }, [students]);

  // 2. Real-time Live Sync across devices (Mobile Phone to Receiver Desktop)
  useEffect(() => {
    const unsubscribe = subscribeToCloudSync(
      (newStudent) => {
        let deletedIds = new Set<string>();
        try {
          const rawDel = localStorage.getItem("sb_deleted_student_ids");
          if (rawDel) deletedIds = new Set(JSON.parse(rawDel));
        } catch {}

        if (deletedIds.has(newStudent.id) || deletedIds.has(newStudent.studentId)) {
          return;
        }

        setDisplayStudents((prev) => {
          const map = new Map<string, StudentExtended>();
          prev.forEach((s) => map.set(s.studentId, s));
          map.set(newStudent.studentId, newStudent);
          const updated = Array.from(map.values());
          safeSaveLocalEnrolledStudents(updated);
          return updated;
        });
      },
      (studentIdOrId) => {
        // Record in tombstone storage so it is never rehydrated
        try {
          const rawDel = localStorage.getItem("sb_deleted_student_ids") || "[]";
          const list: string[] = JSON.parse(rawDel);
          if (!list.includes(studentIdOrId)) {
            list.push(studentIdOrId);
            localStorage.setItem("sb_deleted_student_ids", JSON.stringify(list));
          }
        } catch {}

        setDisplayStudents((prev) => {
          const updated = prev.filter((s) => s.studentId !== studentIdOrId && s.id !== studentIdOrId);
          safeSaveLocalEnrolledStudents(updated);
          return updated;
        });
      },
      () => {
        setDisplayStudents([]);
        try {
          localStorage.removeItem("sb_enrolled_students");
        } catch {}
      }
    );

    const handleStorage = () => {
      try {
        let deletedIds = new Set<string>();
        try {
          const rawDel = localStorage.getItem("sb_deleted_student_ids");
          if (rawDel) deletedIds = new Set(JSON.parse(rawDel));
        } catch {}

        const raw = localStorage.getItem("sb_enrolled_students");
        if (raw) {
          const localList: StudentExtended[] = JSON.parse(raw);
          const map = new Map<string, StudentExtended>();
          localList.forEach((s) => {
            if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
              map.set(s.studentId, s);
            }
          });
          setDisplayStudents((prev) => {
            prev.forEach((s) => {
              if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
                map.set(s.studentId, s);
              }
            });
            return Array.from(map.values());
          });
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get("grade") || "ALL");
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "ALL");
  const [selectedPhotoStatus, setSelectedPhotoStatus] = useState(searchParams.get("photoStatus") || "ALL");
  const [selectedQrStatus, setSelectedQrStatus] = useState(searchParams.get("qrStatus") || "ALL");

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeStudent, setActiveStudent] = useState<StudentExtended | null>(null);

  // Update URL search parameters to trigger server-side query
  const applyFilters = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === "ALL" || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    // Reset page to 1 on filter changes unless page itself is explicitly modified
    if (!newParams.page) {
      params.set("page", "1");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ q: searchQuery });
  };

  const handlePageChange = (newPage: number) => {
    applyFilters({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    applyFilters({ pageSize: newSize, page: 1 });
  };

  // Bulk Selection
  const handleToggleSelectAll = () => {
    if (selectedIds.size === displayStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Photo Download
  const handleBulkDownloadPhotos = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch("/api/photos/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          folderStructure: "by-grade",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate ZIP");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Selected_Student_Photos_${selectedIds.size}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Error downloading selected student photos.");
    }
  };

  // Single Photo Direct Download by Real Student Name
  const handleDownloadSinglePhoto = async (photoUrl: string, studentName: string) => {
    try {
      const cleanName = studentName.trim().replace(/[\\/:*?"<>|]/g, "_");
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      const a = document.createElement("a");
      a.href = photoUrl;
      a.download = `${studentName.trim().replace(/[\\/:*?"<>|]/g, "_")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Bulk Print
  const handleBulkPrint = () => {
    if (selectedIds.size === 0) return;
    router.push(`/print-engine?ids=${Array.from(selectedIds).join(",")}`);
  };

  // Single Delete
  const handleDelete = (id: string, name: string, studentId?: string) => {
    if (!confirm(`Are you sure you want to permanently delete student "${name}"?`)) return;

    // 1. Tombstone in localStorage so it never re-appears
    try {
      const rawDel = localStorage.getItem("sb_deleted_student_ids") || "[]";
      const list: string[] = JSON.parse(rawDel);
      if (id && !list.includes(id)) list.push(id);
      if (studentId && !list.includes(studentId)) list.push(studentId);
      localStorage.setItem("sb_deleted_student_ids", JSON.stringify(list));

      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = JSON.parse(raw);
        const filtered = localList.filter(
          (s: any) => s.id !== id && s.studentId !== studentId && s.id !== studentId
        );
        localStorage.setItem("sb_enrolled_students", JSON.stringify(filtered));
      }
    } catch {}

    // 2. Immediate UI update
    setDisplayStudents((prev) =>
      prev.filter((s) => s.id !== id && s.studentId !== studentId && s.id !== studentId)
    );
    if (activeStudent && (activeStudent.id === id || activeStudent.studentId === studentId)) {
      setActiveStudent(null);
    }

    // 3. Server action
    startTransition(async () => {
      try {
        const res = await deleteStudentAction(id, studentId);
        if (!res.success) {
          alert(res.error || "Failed to delete student record.");
        }
      } catch (err: any) {
        console.error("Delete communication error:", err);
        alert("Failed to communicate with server to delete record.");
      }
      router.refresh();
    });
  };

  // Bulk Delete Selected Students
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete the ${selectedIds.size} selected student records?`
      )
    )
      return;

    const idsToDelete = Array.from(selectedIds);
    const selectedItems: { id: string; studentId: string }[] = [];
    displayStudents.forEach((s) => {
      if (selectedIds.has(s.id) || selectedIds.has(s.studentId)) {
        selectedItems.push({ id: s.id, studentId: s.studentId });
      }
    });

    try {
      const rawDel = localStorage.getItem("sb_deleted_student_ids") || "[]";
      const list: string[] = JSON.parse(rawDel);
      idsToDelete.forEach((id) => {
        if (!list.includes(id)) list.push(id);
      });
      selectedItems.forEach((item) => {
        if (item.id && !list.includes(item.id)) list.push(item.id);
        if (item.studentId && !list.includes(item.studentId)) list.push(item.studentId);
      });
      localStorage.setItem("sb_deleted_student_ids", JSON.stringify(list));

      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = JSON.parse(raw);
        const filtered = localList.filter(
          (s: any) => !selectedIds.has(s.id) && !selectedIds.has(s.studentId)
        );
        localStorage.setItem("sb_enrolled_students", JSON.stringify(filtered));
      }
    } catch {}

    setDisplayStudents((prev) =>
      prev.filter((s) => !selectedIds.has(s.id) && !selectedIds.has(s.studentId))
    );
    setSelectedIds(new Set());
    if (activeStudent && (selectedIds.has(activeStudent.id) || selectedIds.has(activeStudent.studentId))) {
      setActiveStudent(null);
    }

    startTransition(async () => {
      try {
        const res = await deleteMultipleStudentsAction(selectedItems.length > 0 ? selectedItems : idsToDelete);
        if (!res.success) {
          alert(res.error || "Failed to delete selected student records.");
        }
      } catch (err: any) {
        console.error("Bulk delete error:", err);
        alert("Failed to communicate with server for bulk deletion.");
      }
      router.refresh();
    });
  };

  // Clear All Students (User Requirement)
  const handleClearAllStudents = () => {
    if (
      confirm(
        "Are you sure you want to permanently delete ALL student records? This will clear the entire credential directory so you can feed your own fresh data."
      )
    ) {
      try {
        const allIds = displayStudents.flatMap((s) => [s.id, s.studentId]).filter(Boolean);
        localStorage.setItem("sb_deleted_student_ids", JSON.stringify(allIds));
        localStorage.removeItem("sb_enrolled_students");
      } catch {}
      setDisplayStudents([]);
      setSelectedIds(new Set());
      setActiveStudent(null);

      startTransition(async () => {
        try {
          const res = await clearAllStudentsAction();
          if (!res.success) {
            alert(res.error || "Failed to clear all student records.");
          }
        } catch (err: any) {
          console.error("Clear all action error:", err);
          alert("Failed to clear records on server.");
        }
        router.refresh();
      });
    }
  };

  // Export Feeded Data to Excel / CSV with strict 5 columns & local desktop path:
  // [StudentID, Name, Grade, Phone, @photo (C:\Users\athede\Desktop\students project for 17000\<photo>)]
  // Smoothly handles 5,000 to 6,000+ records via server-side chunked query
  const handleExportExcel = (selectedOnly: boolean = false, overrideGrade?: string) => {
    if (!selectedOnly) {
      const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");
      const gradeQuery = targetGrade ? `&grade=${encodeURIComponent(targetGrade)}` : "";
      window.location.href = `/api/students/export-csv?format=xlsx${gradeQuery}`;
      return;
    }

    const listToExport = displayStudents.filter(
      (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
    );

    if (listToExport.length === 0) {
      alert("No student records selected to export.");
      return;
    }

    const headers = [...RECEIVER_EXCEL_HEADERS];
    const dataRows = listToExport.map((s) => [
      s.studentId || "",
      s.fullName || "",
      s.grade || "",
      formatPhoneForReceiver(s.phone),
      getStudentPhotoLocalPath(s),
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 14 },
      { wch: 18 },
      { wch: 70 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    const dateTag = new Date().toISOString().split("T")[0];
    const fileName = `Student_Credentials_Selected_${listToExport.length}_${dateTag}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const handleExportCSV = (selectedOnly: boolean = false, overrideGrade?: string) => {
    if (!selectedOnly) {
      const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");
      const gradeQuery = targetGrade ? `&grade=${encodeURIComponent(targetGrade)}` : "";
      window.location.href = `/api/students/export-csv?format=csv${gradeQuery}`;
      return;
    }

    const listToExport = displayStudents.filter(
      (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
    );

    if (listToExport.length === 0) {
      alert("No student records selected to export.");
      return;
    }

    const headers = [...RECEIVER_EXCEL_HEADERS];
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).trim();
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = listToExport.map((s) => {
      return [
        escapeCSV(s.studentId),
        escapeCSV(s.fullName),
        escapeCSV(s.grade),
        escapeCSV(formatPhoneForReceiver(s.phone)),
        escapeCSV(getStudentPhotoLocalPath(s)),
      ].join(",");
    });

    // Add UTF-8 BOM so Excel opens with proper character encoding
    const csvContent = "\uFEFF" + [headers.map((h) => escapeCSV(h)).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateTag = new Date().toISOString().split("T")[0];
    a.download = `Student_Credentials_Selected_${listToExport.length}_${dateTag}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Save edited/cropped photo from PhotoEditorModal studio & sync to receiver
  const handleSaveEditedPhoto = async (editedBlob: Blob, _originalBlob?: Blob | null, _metadata?: any) => {
    if (!editingStudent) return;
    const studentToUpdate = editingStudent;
    setEditingStudent(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;

      let cleanName = (studentToUpdate.fullName || studentToUpdate.studentId || "student")
        .replace(/[/\\]/g, " - ")
        .replace(/[:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
      const safePhotoName = `${cleanName}.jpg`;

      const form = new FormData();
      form.append("file", editedBlob, safePhotoName);
      form.append("studentId", studentToUpdate.studentId);

      let finalPath = dataUri;
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const uploadRes = await res.json();
          if (uploadRes.relativePath) {
            finalPath = uploadRes.relativePath;
          }
        }
      } catch (uploadErr) {
        console.warn("Upload fallback to dataUri:", uploadErr);
      }

      // Update database and broadcast to receiver via server action
      try {
        await updateStudentPhotoAction(studentToUpdate.id, finalPath);
      } catch (actionErr) {
        console.warn("Server action photo update warning:", actionErr);
      }

      // Update local state immediately
      setDisplayStudents((prev) => {
        const next = prev.map((s) =>
          s.id === studentToUpdate.id || s.studentId === studentToUpdate.studentId
            ? { ...s, photoPath: finalPath }
            : s
        );
        safeSaveLocalEnrolledStudents(next);
        return next;
      });

      if (
        activeStudent &&
        (activeStudent.id === studentToUpdate.id || activeStudent.studentId === studentToUpdate.studentId)
      ) {
        setActiveStudent((prev) => (prev ? { ...prev, photoPath: finalPath } : null));
      }
    };
    reader.readAsDataURL(editedBlob);
  };

  const totalEffective = Math.max(totalCount, displayStudents.length);
  const totalPages = Math.ceil(totalEffective / pageSize) || 1;
  const startItem = totalEffective === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalEffective);

  return (
    <div className="space-y-4">
      {/* Grade Separation Bar (First separate by grade, then download CSV) */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white text-xs font-mono font-bold">
              #
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black font-mono">
                GRADE SEPARATION & CSV QUICK-DOWNLOAD
              </h3>
              <p className="text-[11px] text-neutral-500">
                Separate student records by grade cohort and download grade-specific CSV/Excel files (handles 5,000–6,000+ records)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedGrade !== "ALL" && (
              <button
                type="button"
                onClick={() => handleExportCSV(false, selectedGrade)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-1.5 text-xs font-mono font-bold text-white hover:bg-neutral-800 transition-colors shadow-xs"
                title={`Download ${selectedGrade} CSV file with strict 5 columns`}
              >
                <Download className="h-3.5 w-3.5 text-amber-300" />
                <span>Download {selectedGrade} CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsGradeExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-mono font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors"
              title="Download CSV for any specific grade"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>All Grades CSV Hub</span>
            </button>
          </div>
        </div>

        {/* Grade Pills / Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedGrade("ALL");
              applyFilters({ grade: "ALL" });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all ${
              selectedGrade === "ALL"
                ? "bg-black text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            All Students ({totalCount.toLocaleString()})
          </button>
          {grades.map((g) => {
            const count = gradeCounts?.[g];
            const isSelected = selectedGrade === g;
            return (
              <div key={g} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGrade(g);
                    applyFilters({ grade: g });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-black text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {g} {count !== undefined ? `(${count.toLocaleString()})` : ""}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV(false, g);
                  }}
                  title={`Direct Download ${g} CSV`}
                  className="rounded-lg p-1 text-neutral-400 hover:text-black hover:bg-neutral-200 transition-colors"
                >
                  <Download className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Multi-Filter Controls Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Student ID, Phone, Department, or School..."
              className="w-full rounded-xl border border-border bg-surface-secondary pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => handleExportExcel(false)}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
            title="Export 5-column Excel sheet (Student ID, Name, Grade, Phone, Photo path)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportCSV(false)}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center gap-1.5"
            title="Export 5-column CSV file"
          >
            <Download className="h-3.5 w-3.5 text-neutral-600" />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handleClearAllStudents}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-mono font-semibold text-neutral-700 hover:text-red-600 hover:border-red-300 transition-colors"
            title="Delete all data to feed fresh records"
          >
            Clear All Data
          </button>
        </form>

        {/* Filters Grid (Streamlined) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Grade */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              applyFilters({ grade: e.target.value });
            }}
            className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="ALL">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              applyFilters({ department: e.target.value });
            }}
            className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Photo Status */}
          <select
            value={selectedPhotoStatus}
            onChange={(e) => {
              setSelectedPhotoStatus(e.target.value);
              applyFilters({ photoStatus: e.target.value });
            }}
            className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="ALL">Photo: All</option>
            <option value="HAS_PHOTO">Photo: Available</option>
            <option value="MISSING_PHOTO">Photo: Missing</option>
          </select>

          {/* QR Status */}
          <select
            value={selectedQrStatus}
            onChange={(e) => {
              setSelectedQrStatus(e.target.value);
              applyFilters({ qrStatus: e.target.value });
            }}
            className="rounded-lg border border-border bg-surface-secondary px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="ALL">QR: All</option>
            <option value="HAS_QR">QR: Attached</option>
            <option value="MISSING_QR">QR: Missing</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when 1+ selected) */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 shadow-glow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <span>{selectedIds.size} students selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportExcel(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              title="Export only selected students to Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Selected ({selectedIds.size}) to Excel</span>
            </button>

            <button
              onClick={() => handleExportCSV(true)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-100 transition-colors"
              title="Export only selected students to CSV"
            >
              <Download className="h-3.5 w-3.5 text-neutral-700" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleBulkDownloadPhotos}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Photos (.zip)</span>
            </button>

            <button
              onClick={handleBulkPrint}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print ID Cards</span>
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
              title="Delete selected student records"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Student Data Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-secondary text-[11px] uppercase tracking-wider text-foreground-muted">
              <tr>
                <th className="w-10 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayStudents.length && displayStudents.length > 0}
                    onChange={handleToggleSelectAll}
                    className="accent-black rounded h-3.5 w-3.5"
                  />
                </th>
                <th className="px-4 py-3">Portrait</th>
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">QR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 px-6 text-center bg-white">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-black/10 flex items-center justify-center text-black">
                        <Users className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-black tracking-tight">Student Directory is Empty (0 Records)</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          All previous data has been purged. The database is clean and ready to accept your fresh real-world data feed (up to 20,000+ students).
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <Link
                          href="/students/import"
                          className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Import Excel / CSV (Up to 20k)
                        </Link>
                        <Link
                          href="/register"
                          className="px-4 py-2 bg-white text-black border border-black/20 text-xs font-semibold rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Enroll Single Student
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const hasPhoto = Boolean(student.photoPath);
                  const hasQR = Boolean(student.qrCodeData);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isSelected ? "bg-neutral-100" : "hover:bg-neutral-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="accent-black rounded h-3.5 w-3.5"
                        />
                      </td>

                      {/* Photo Thumbnail */}
                      <td className="px-4 py-2">
                        <div className="h-10 w-8 rounded border border-neutral-300 bg-neutral-100 overflow-hidden flex items-center justify-center">
                          {student.photoPath ? (
                            <img
                              src={student.photoPath}
                              alt={student.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Camera className="h-3 w-3 text-neutral-400" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-foreground">
                        {student.studentId}
                      </td>

                      <td className="px-4 py-3 font-medium text-foreground">
                        {student.fullName}
                      </td>

                      <td className="px-4 py-3 text-foreground-muted">{student.grade}</td>
                      <td className="px-4 py-3 text-foreground-muted font-mono">{student.phone}</td>

                      {/* Photo Status */}
                      <td className="px-4 py-3">
                        {hasPhoto ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-black">
                            <CheckCircle2 className="h-3 w-3 text-black" /> OK
                          </span>
                        ) : null}
                      </td>

                      {/* QR Status */}
                      <td className="px-4 py-3">
                        {hasQR ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-black">
                            <CheckCircle2 className="h-3 w-3 text-black" /> OK
                          </span>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.photoPath && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDownloadSinglePhoto(student.photoPath!, student.fullName)}
                                className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                                title={`Download Photo (${student.fullName}.jpg)`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(student)}
                                className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                                title={`Crop & Edit Photo (${student.fullName})`}
                              >
                                <Crop className="h-3.5 w-3.5 text-neutral-800" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveStudent(student)}
                            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {(userRole === "RECEIVER" || userRole === "ADMIN" || userRole === "SENDER") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id, student.fullName, student.studentId)}
                              className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-red-600 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border bg-surface-secondary/50 px-6 py-3 text-xs text-foreground-muted">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-foreground">{startItem}</strong> to{" "}
              <strong className="text-foreground">{endItem}</strong> of{" "}
              <strong className="text-foreground font-mono">{totalCount.toLocaleString()}</strong> students
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className="rounded-lg border border-border bg-surface p-1.5 text-foreground hover:bg-surface-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className="rounded-lg border border-border bg-surface p-1.5 text-foreground hover:bg-surface-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Student Profile Deep Inspection Drawer */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Student Profile Details</h3>
                <span className="text-[10px] font-mono text-accent">{activeStudent.studentId}</span>
              </div>
              <button
                onClick={() => setActiveStudent(null)}
                className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media Row: Photo + QR */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-foreground-muted block">
                  Official Portrait
                </span>
                <div className="aspect-[3/4] rounded-xl border border-border bg-black overflow-hidden flex items-center justify-center">
                  {activeStudent.photoPath ? (
                    <img
                      src={activeStudent.photoPath}
                      alt={activeStudent.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-6 w-6 text-foreground-subtle" />
                  )}
                </div>
                {activeStudent.photoPath && (
                  <div className="pt-1 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePhoto(activeStudent.photoPath!, activeStudent.fullName)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-black hover:underline"
                    >
                      <Download className="h-3 w-3" /> Download Photo ({activeStudent.fullName}.jpg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudent(activeStudent)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-black bg-neutral-100 border border-neutral-300 rounded-lg px-2.5 py-1 hover:bg-neutral-200 transition-colors w-full justify-center shadow-xs"
                    >
                      <Crop className="h-3.5 w-3.5 text-black" /> Crop & Edit Photo
                    </button>
                    <div className="text-[10px] font-mono text-neutral-500 truncate" title={`/photos/${activeStudent.fullName}.jpg`}>
                      Path: /photos/{activeStudent.fullName}.jpg
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-foreground-muted block">
                  Credential QR
                </span>
                <div className="aspect-square rounded-xl border border-border bg-white p-2 flex items-center justify-center">
                  {activeStudent.qrCodeData ? (
                    activeStudent.qrCodeData.startsWith("/") ? (
                      <img
                        src={activeStudent.qrCodeData}
                        alt="External QR"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <QrCode className="h-16 w-16 text-black" />
                    )
                  ) : null}
                </div>
              </div>
            </div>

            {/* Field Details */}
            <div className="space-y-3 divide-y divide-border text-xs">
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Name:</span>
                <strong className="text-foreground">{activeStudent.fullName}</strong>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Grade:</span>
                <span className="text-foreground">{activeStudent.grade}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Gender:</span>
                <span className="text-foreground">{activeStudent.sex}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Phone:</span>
                <span className="text-foreground font-mono">{activeStudent.phone}</span>
              </div>
              {activeStudent.school && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">School:</span>
                  <span className="text-foreground">{activeStudent.school}</span>
                </div>
              )}
              {activeStudent.department && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">Department:</span>
                  <span className="text-foreground">{activeStudent.department}</span>
                </div>
              )}
              {activeStudent.emailAddress && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">Email:</span>
                  <span className="text-foreground">{activeStudent.emailAddress}</span>
                </div>
              )}
              {activeStudent.guardianFullName && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">Guardian:</span>
                  <span className="text-foreground">{activeStudent.guardianFullName}</span>
                </div>
              )}
              {activeStudent.emergencyContactPhone && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">Emergency Phone:</span>
                  <span className="text-foreground font-mono">{activeStudent.emergencyContactPhone}</span>
                </div>
              )}
              {activeStudent.bloodType && (
                <div className="pt-2 flex justify-between">
                  <span className="text-foreground-muted">Blood Group:</span>
                  <span className="text-accent font-bold">{activeStudent.bloodType}</span>
                </div>
              )}
            </div>

            {/* Custom Fields Section */}
            {activeStudent.customValues && activeStudent.customValues.length > 0 && (
              <div className="rounded-xl border border-border bg-surface-secondary p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground border-b border-border pb-2">
                  <Tag className="h-3.5 w-3.5 text-accent" />
                  <span>Custom Attributes</span>
                </div>
                {activeStudent.customValues.map((cv, i) => (
                  <div key={i} className="flex justify-between text-xs pt-1">
                    <span className="text-foreground-muted">{cv.customField.label}:</span>
                    <strong className="text-foreground">{cv.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions in Drawer */}
            {(userRole === "RECEIVER" || userRole === "ADMIN" || userRole === "SENDER") && (
              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDelete(activeStudent.id, activeStudent.fullName, activeStudent.studentId)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Student Record</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Photo Crop & Edit Studio Modal */}
      {editingStudent && editingStudent.photoPath && (
        <PhotoEditorModal
          isOpen={Boolean(editingStudent)}
          originalImageSrc={editingStudent.photoPath}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveEditedPhoto}
        />
      )}

      {/* Grade-Separated CSV & Excel Export Hub Modal (Handles 5,000–6,000+ records) */}
      {isGradeExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-300 bg-white shadow-2xl p-6 text-black">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                  Grade-Separated CSV & Excel Export Hub
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGradeExportModalOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-4">
              Download CSV or Excel files separated by grade cohorts. All exports follow the strict 5-column receiver format (StudentID, Name, Grade, Phone, @photo) and handle large cohorts (5,000–6,000+ records) smoothly.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors">
                <div>
                  <div className="text-xs font-bold font-mono text-black">All Grades (Full Directory)</div>
                  <div className="text-[11px] text-neutral-500 font-mono">{totalCount.toLocaleString()} total students</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleExportCSV(false, "");
                      setIsGradeExportModalOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-mono font-bold rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
                  >
                    <Download className="h-3 w-3 text-amber-300" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleExportExcel(false, "");
                      setIsGradeExportModalOpen(false);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 text-xs font-mono font-bold rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    <FileSpreadsheet className="h-3 w-3" /> Excel
                  </button>
                </div>
              </div>

              {grades.map((g) => {
                const count = gradeCounts?.[g] ?? 0;
                return (
                  <div key={g} className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
                    <div>
                      <div className="text-xs font-bold font-mono text-black">{g}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{count.toLocaleString()} students</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleExportCSV(false, g);
                          setIsGradeExportModalOpen(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-mono font-bold rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
                      >
                        <Download className="h-3 w-3 text-amber-300" /> CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportExcel(false, g);
                          setIsGradeExportModalOpen(false);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 text-xs font-mono font-bold rounded-lg hover:bg-emerald-500/20 transition-colors"
                      >
                        <FileSpreadsheet className="h-3 w-3" /> Excel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
