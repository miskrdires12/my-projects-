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
  X,
  Camera,
  Download,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  UserPlus,
  Users,
  Upload,
  FileSpreadsheet,
  Crop,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  deleteStudentAction,
  clearAllStudentsAction,
  deleteMultipleStudentsAction,
  updateStudentPhotoAction,
} from "@/actions/students";
import type { UserRole } from "@/types/auth";
import { subscribeToCloudSync, publishStudentSync } from "@/lib/sync-client";
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
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
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

import {
  saveStudentsToDB,
  saveStudentToDB,
  getAllStudentsFromDB,
  deleteStudentFromDB,
  clearAllStudentsFromDB,
} from "@/lib/idb-storage";

// Safe database helper using IndexedDB (handles 6,000 to 20,000+ students with photos safely)
const safeSaveLocalEnrolledStudents = (list: StudentExtended[]) => {
  saveStudentsToDB(list as any).catch((err) => {
    console.warn("IndexedDB bulk save notice:", err);
  });
  try {
    const lightList = list.slice(0, 100).map((s) => ({
      ...s,
      photoPath: s.photoPath && s.photoPath.length > 500 ? null : s.photoPath,
    }));
    localStorage.setItem("sb_enrolled_students", JSON.stringify(lightList));
  } catch {}
};

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
  const [, startTransition] = useTransition();

  // Dual-Persistence Client State
  const [displayStudents, setDisplayStudents] = useState<StudentExtended[]>(students);
  const [editingStudent, setEditingStudent] = useState<StudentExtended | null>(null);
  const [activePage, setActivePage] = useState<number>(currentPage || 1);
  const [activePageSize, setActivePageSize] = useState<number>(pageSize || 25);

  useEffect(() => {
    if (currentPage) setActivePage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (pageSize) setActivePageSize(pageSize);
  }, [pageSize]);

  // 1. Initial Load: Merge server students, high-capacity IndexedDB, localStorage, and pull from /api/students/sync
  useEffect(() => {
    const loadAndMerge = async () => {
      let deletedIds = new Set<string>();
      try {
        const rawDel = localStorage.getItem("sb_deleted_student_ids");
        if (rawDel) {
          deletedIds = new Set(JSON.parse(rawDel));
        }
      } catch {}

      // Load from IndexedDB (supports 6,000+ students with high-res photos)
      let idbList: any[] = [];
      try {
        idbList = await getAllStudentsFromDB();
      } catch {}

      let localList: StudentExtended[] = [];
      try {
        const raw = localStorage.getItem("sb_enrolled_students");
        if (raw) localList = JSON.parse(raw);
      } catch {}

      const map = new Map<string, StudentExtended>();
      idbList.forEach((s) => {
        if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
          map.set(s.studentId, s as any);
        }
      });
      localList.forEach((s) => {
        if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
          if (!map.has(s.studentId)) map.set(s.studentId, s);
        }
      });
      students.forEach((s) => {
        if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
          map.set(s.studentId, s);
        }
      });

      const immediateMerged = Array.from(map.values());
      immediateMerged.sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });
      setDisplayStudents(immediateMerged);
      safeSaveLocalEnrolledStudents(immediateMerged);

      // Non-blocking background sync from cloud
      fetch("/api/students/sync")
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.students) && data.students.length > 0) {
              setDisplayStudents((prev) => {
                const freshMap = new Map<string, StudentExtended>();
                data.students.forEach((s: any) => {
                  if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
                    freshMap.set(s.studentId, s);
                  }
                });
                prev.forEach((s) => {
                  if (!deletedIds.has(s.id) && !deletedIds.has(s.studentId)) {
                    freshMap.set(s.studentId, s);
                  }
                });
                const next = Array.from(freshMap.values());
                next.sort((a, b) => {
                  const tA = new Date(a.createdAt || 0).getTime();
                  const tB = new Date(b.createdAt || 0).getTime();
                  return tB - tA;
                });
                safeSaveLocalEnrolledStudents(next);
                return next;
              });
            }
          }
        })
        .catch(() => {});
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
          // Put the newest student at the very top
          map.set(newStudent.studentId, newStudent);
          prev.forEach((s) => {
            if (s.studentId !== newStudent.studentId) {
              map.set(s.studentId, s);
            }
          });
          const updated = Array.from(map.values());
          updated.sort((a, b) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });
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

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeStudent, setActiveStudent] = useState<StudentExtended | null>(null);
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);

  // Table Column Interactive Sorting (A-Z / Z-A / Default Newest First)
  const [sortField, setSortField] = useState<keyof StudentExtended | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof StudentExtended) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null); // Reset to default newest-first
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
    setActivePage(newPage);
    applyFilters({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    setActivePageSize(newSize);
    setActivePage(1);
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

  // Bulk Photo Download (Grouped strictly by Grade folders, without companion CSV)
  const handleBulkDownloadPhotos = async () => {
    const targetStudents = selectedIds.size > 0
      ? displayStudents.filter((s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId)))
      : displayStudents;

    const withPhotos = targetStudents.filter((s) => Boolean(s.photoPath && s.photoPath.trim().length > 0));

    if (withPhotos.length === 0) {
      alert(
        selectedIds.size > 0
          ? `None of the ${selectedIds.size} selected student(s) have photographs attached.`
          : "No student photographs found to download in this view."
      );
      return;
    }

    setIsDownloadingPhotos(true);

    try {
      // 1. Attempt server streaming endpoint with by-grade folder structure
      try {
        const response = await fetch("/api/photos/download-zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentIds: withPhotos.map((s) => s.id),
            folderStructure: "by-grade",
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          if (blob && blob.size > 200) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateTag = new Date().toISOString().split("T")[0];
            const scopeLabel = selectedIds.size > 0 ? `Selected_${withPhotos.length}` : `All_${withPhotos.length}`;
            a.download = `Student_Photos_By_Grade_${scopeLabel}_${dateTag}.zip`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              try {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch {}
            }, 500);
            return;
          }
        }
      } catch (serverErr) {
        console.warn("Server streaming zip fallback to client JSZip:", serverErr);
      }

      // 2. Client-side JSZip packaging organized by Grade Folders (Works offline, with IndexedDB base64 photos, etc.)
      const zip = new JSZip();

      for (const student of withPhotos) {
        const sId = student.studentId || student.id;
        let cleanName = (student.fullName || sId || "student")
          .replace(/[/\\]/g, " - ")
          .replace(/[:*?"<>|]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        cleanName = cleanName.replace(/^[.\-_ ]+|[.\-_ ]+$/g, "") || "student";
        const photoFileName = `${cleanName} - ${sId}.jpg`;

        // Organize strictly into Grade Folders
        const gradeStr = (student.grade || "General").trim() || "General";
        const safeGradeFolder = `Grade_${gradeStr.replace(/Grade /i, "").replace(/[:*?"<>|/\\]/g, "_")}`;
        const gradeFolder = zip.folder(safeGradeFolder) || zip;

        if (student.photoPath) {
          try {
            if (student.photoPath.startsWith("data:image/")) {
              const base64Data = student.photoPath.split(",")[1];
              if (base64Data) {
                gradeFolder.file(photoFileName, base64Data, { base64: true });
              }
            } else {
              const res = await fetch(student.photoPath);
              if (res.ok) {
                const imgBlob = await res.blob();
                gradeFolder.file(photoFileName, imgBlob);
              }
            }
          } catch (photoErr) {
            console.warn(`Failed to package photo for ${sId}:`, photoErr);
          }
        }
      }

      // Generate pure photo ZIP (no unwanted CSV)
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const dateTag = new Date().toISOString().split("T")[0];
      const scopeLabel = selectedIds.size > 0 ? `Selected_${withPhotos.length}` : `All_${withPhotos.length}`;
      a.download = `Student_Photos_By_Grade_${scopeLabel}_${dateTag}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch {}
      }, 500);
    } catch (err: any) {
      console.error("ZIP creation error:", err);
      alert("Failed to create photos ZIP archive: " + (err?.message || "Unknown error"));
    } finally {
      setIsDownloadingPhotos(false);
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

      deleteStudentFromDB(id).catch(() => {});
      if (studentId) deleteStudentFromDB(studentId).catch(() => {});

      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = JSON.parse(raw);
        const filtered = localList.filter(
          (s: any) => s.id !== id && s.studentId !== studentId && s.id !== studentId
        );
        localStorage.setItem("sb_enrolled_students", JSON.stringify(filtered));
      }

      // Broadcast to live sync channel so receiver dashboard updates instantly
      publishStudentSync("DELETE", studentId || id).catch(() => {});
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

      idsToDelete.forEach((id) => deleteStudentFromDB(id).catch(() => {}));
      selectedItems.forEach((item) => {
        if (item.id) deleteStudentFromDB(item.id).catch(() => {});
        if (item.studentId) deleteStudentFromDB(item.studentId).catch(() => {});
      });

      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = JSON.parse(raw);
        const filtered = localList.filter(
          (s: any) => !selectedIds.has(s.id) && !selectedIds.has(s.studentId)
        );
        localStorage.setItem("sb_enrolled_students", JSON.stringify(filtered));
      }

      // Broadcast each delete to live cloud sync so receiver dashboard updates immediately
      idsToDelete.forEach((id) => {
        publishStudentSync("DELETE", id).catch(() => {});
      });
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
      clearAllStudentsFromDB().catch(() => {});
      try {
        const allIds = displayStudents.flatMap((s) => [s.id, s.studentId]).filter(Boolean);
        localStorage.setItem("sb_deleted_student_ids", JSON.stringify(allIds));
        localStorage.removeItem("sb_enrolled_students");
        publishStudentSync("CLEAR").catch(() => {});
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
    const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");

    let listToExport: StudentExtended[] = [];
    if (selectedOnly) {
      listToExport = displayStudents.filter(
        (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
      );
      if (listToExport.length === 0) {
        alert("No student records selected to export.");
        return;
      }
    } else {
      listToExport = targetGrade
        ? displayStudents.filter((s) => s.grade === targetGrade)
        : displayStudents;
    }

    if (listToExport.length > 0) {
      const headers = [...RECEIVER_EXCEL_HEADERS];
      const dataRows = listToExport.map((s) => [
        s.studentId || "",
        s.fullName || "",
        s.sex || "Male",
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
      const scopeLabel = selectedOnly
        ? `Selected_${listToExport.length}`
        : targetGrade
        ? `Grade_${targetGrade.replace(/[^a-zA-Z0-9_-]/g, "_")}`
        : `All_${listToExport.length}`;
      const fileName = `Student_Credentials_${scopeLabel}_${dateTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
      return;
    }

    const gradeQuery = targetGrade ? `&grade=${encodeURIComponent(targetGrade)}` : "";
    window.location.href = `/api/students/export-csv?format=xlsx${gradeQuery}`;
  };

  const handleExportCSV = (selectedOnly: boolean = false, overrideGrade?: string) => {
    const targetGrade = overrideGrade !== undefined ? overrideGrade : (selectedGrade !== "ALL" ? selectedGrade : "");

    let listToExport: StudentExtended[] = [];
    if (selectedOnly) {
      listToExport = displayStudents.filter(
        (s) => selectedIds.has(s.id) || (s.studentId && selectedIds.has(s.studentId))
      );
      if (listToExport.length === 0) {
        alert("No student records selected to export.");
        return;
      }
    } else {
      listToExport = targetGrade
        ? displayStudents.filter((s) => s.grade === targetGrade)
        : displayStudents;
    }

    // Always generate CSV with UTF-8 BOM via client-side Blob — guaranteed to ALWAYS work!
    if (listToExport.length > 0) {
      const headers = [...RECEIVER_EXCEL_HEADERS];
      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).trim();
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = listToExport.map((s) => [
        escapeCSV(s.studentId),
        escapeCSV(s.fullName),
        escapeCSV(s.sex || "Male"),
        escapeCSV(s.grade),
        escapeCSV(formatPhoneForReceiver(s.phone)),
        escapeCSV(getStudentPhotoLocalPath(s)),
      ].join(","));

      // Add UTF-8 BOM so Excel opens with proper character encoding
      const csvContent = "\uFEFF" + [headers.map((h) => escapeCSV(h)).join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const dateTag = new Date().toISOString().split("T")[0];
      const scopeLabel = selectedOnly
        ? `Selected_${listToExport.length}`
        : targetGrade
        ? `Grade_${targetGrade.replace(/[^a-zA-Z0-9_-]/g, "_")}`
        : `All_${listToExport.length}`;
      const fileName = `Student_Credentials_${scopeLabel}_${dateTag}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }

    const gradeQuery = targetGrade ? `&grade=${encodeURIComponent(targetGrade)}` : "";
    window.location.href = `/api/students/export-csv?format=csv${gradeQuery}`;
  };

  // Download all selected students together into 1 combined CSV or Excel file via API
  const downloadSelectedTogether = async (format: "csv" | "xlsx" = "csv") => {
    if (selectedIds.size === 0) {
      alert("No student records selected to export.");
      return;
    }

    try {
      const res = await fetch("/api/students/export-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          format,
        }),
      });

      if (!res.ok) throw new Error("Failed to export selected student records");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateTag = new Date().toISOString().split("T")[0];
      const ext = format === "xlsx" ? "xlsx" : "csv";
      a.download = `Student_Credentials_Selected_${selectedIds.size}_Together_${dateTag}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Selected export API error, falling back:", err);
      if (format === "xlsx") handleExportExcel(true);
      else handleExportCSV(true);
    }
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

      const updatedStudent: StudentExtended = {
        ...studentToUpdate,
        photoPath: finalPath,
      };

      // 1. Persist to IndexedDB (permanent local database supporting 6,000+ per day)
      try {
        await saveStudentToDB(updatedStudent as any);
      } catch (idbErr) {
        console.warn("IndexedDB photo update error:", idbErr);
      }

      // 2. Broadcast live update across all tabs and mobile/desktop clients
      try {
        publishStudentSync("UPSERT", updatedStudent as any);
      } catch (syncErr) {
        console.warn("Real-time sync photo broadcast notice:", syncErr);
      }

      // 3. Update database via server action
      try {
        await updateStudentPhotoAction(studentToUpdate.id, finalPath);
      } catch (actionErr) {
        console.warn("Server action photo update warning:", actionErr);
      }

      // 4. Update local React state immediately
      setDisplayStudents((prev) => {
        const next = prev.map((s) =>
          s.id === studentToUpdate.id || s.studentId === studentToUpdate.studentId
            ? updatedStudent
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
  const totalPages = Math.ceil(totalEffective / activePageSize) || 1;
  const startItem = totalEffective === 0 ? 0 : (activePage - 1) * activePageSize + 1;
  const endItem = Math.min(activePage * activePageSize, totalEffective);

  // Sorted students based on active column sort or default newest first
  const sortedStudents = React.useMemo(() => {
    if (!sortField) return displayStudents;
    const sorted = [...displayStudents];
    sorted.sort((a, b) => {
      const valA = (a as any)[sortField] ?? "";
      const valB = (b as any)[sortField] ?? "";
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comp : -comp;
    });
    return sorted;
  }, [displayStudents, sortField, sortDirection]);

  // Client-side pagination slice ensuring Per page (25, 50, 100) functions instantaneously
  const paginatedStudents = React.useMemo(() => {
    const start = (activePage - 1) * activePageSize;
    return sortedStudents.slice(start, start + activePageSize);
  }, [sortedStudents, activePage, activePageSize]);

  return (
    <div className="space-y-4 pb-28">
      {/* Grade Cohort Tabs (Clean, Sleek, Instant Filtering) */}
      {grades.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setSelectedGrade("ALL");
              applyFilters({ grade: "ALL" });
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              selectedGrade === "ALL"
                ? "bg-[#8fe617] text-[#070908] font-bold shadow-xs"
                : "bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-secondary"
            }`}
          >
            All Students ({totalCount.toLocaleString()})
          </button>
          {grades.map((g) => {
            const count = gradeCounts?.[g];
            const isSelected = selectedGrade === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setSelectedGrade(g);
                  applyFilters({ grade: g });
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-[#8fe617] text-[#070908] font-bold shadow-xs"
                    : "bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-secondary"
                }`}
              >
                {g} {count !== undefined ? `(${count.toLocaleString()})` : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Multi-Filter Controls Bar (Comfortable Size & Enterprise Layout) */}
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Student ID, Phone, Department, or School..."
              className="w-full h-11 rounded-xl border border-border bg-surface-secondary pl-11 pr-4 text-sm text-foreground placeholder:text-foreground-subtle focus:border-[#8fe617] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="h-11 px-6 rounded-xl bg-[#8fe617] text-[#070908] font-bold text-sm hover:brightness-105 transition-all shadow-xs"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => handleExportCSV(false)}
            className="h-11 px-4 rounded-xl border border-border bg-surface hover:bg-surface-secondary text-foreground text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs"
            title="Download full student directory as CSV"
          >
            <Download className="h-4 w-4 text-foreground-muted" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExportExcel(false)}
            className="h-11 px-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs"
            title="Download full student directory as Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            disabled={isDownloadingPhotos}
            onClick={handleBulkDownloadPhotos}
            className="h-11 px-5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:border dark:border-[#223126] text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            title="Download student portraits organized into Grade folders (ZIP archive)"
          >
            {isDownloadingPhotos ? (
              <Loader2 className="h-4 w-4 text-[#8fe617] animate-spin" />
            ) : (
              <Download className="h-4 w-4 text-[#8fe617]" />
            )}
            <span>
              {isDownloadingPhotos
                ? "Packaging ZIP..."
                : selectedIds.size > 0
                ? `Download Photos ZIP (${selectedIds.size})`
                : "Download Photos (.zip)"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleClearAllStudents}
            className="h-11 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 text-sm font-semibold transition-colors flex items-center gap-1.5"
            title="Delete all data to feed fresh records"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data</span>
          </button>
        </form>

        {/* 3-Column Streamlined Filters Grid (QR removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              applyFilters({ grade: e.target.value });
            }}
            className="h-10 rounded-xl border border-border bg-surface-secondary px-3.5 text-sm text-foreground focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              applyFilters({ department: e.target.value });
            }}
            className="h-10 rounded-xl border border-border bg-surface-secondary px-3.5 text-sm text-foreground focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Photo Status Filter */}
          <select
            value={selectedPhotoStatus}
            onChange={(e) => {
              setSelectedPhotoStatus(e.target.value);
              applyFilters({ photoStatus: e.target.value });
            }}
            className="h-10 rounded-xl border border-border bg-surface-secondary px-3.5 text-sm text-foreground focus:border-[#8fe617] focus:outline-none transition-colors"
          >
            <option value="ALL">Photo: All</option>
            <option value="HAS_PHOTO">Photo: Available</option>
            <option value="MISSING_PHOTO">Photo: Missing</option>
          </select>
        </div>
      </div>

      {/* Main Student Data Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-secondary text-xs uppercase tracking-wider text-foreground-muted font-mono select-none">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === displayStudents.length && displayStudents.length > 0}
                    onChange={handleToggleSelectAll}
                    className="accent-[#8fe617] rounded h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3.5 w-16">Photo</th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("studentId")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Student ID"
                  >
                    <span>Student ID</span>
                    {sortField === "studentId" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("fullName")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Full Name (A-Z / Z-A)"
                  >
                    <span>Name</span>
                    {sortField === "fullName" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("sex")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Sex"
                  >
                    <span>Sex</span>
                    {sortField === "sex" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("grade")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Grade"
                  >
                    <span>Grade</span>
                    {sortField === "grade" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort("phone")}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-mono cursor-pointer"
                    title="Click to sort by Phone"
                  >
                    <span>Phone</span>
                    {sortField === "phone" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-[#8fe617]" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 text-[#8fe617]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5">Photo Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 px-6 text-center bg-surface">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-accent">
                        <Users className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-lg font-bold text-foreground tracking-tight">Student Directory is Empty (0 Records)</h4>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                          All previous data has been purged. The database is clean and ready to accept your fresh real-world data feed.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <Link
                          href="/students/import"
                          className="px-5 py-2.5 bg-[#8fe617] text-[#070908] text-sm font-bold rounded-xl hover:brightness-105 transition-all shadow-xs flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Import Excel / CSV
                        </Link>
                        <Link
                          href="/register"
                          className="px-5 py-2.5 bg-surface text-foreground border border-border text-sm font-semibold rounded-xl hover:bg-surface-secondary transition-colors flex items-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Enroll Single Student
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const hasPhoto = Boolean(student.photoPath);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        isSelected ? "bg-[#8fe617]/10" : "hover:bg-surface-secondary/60"
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student.id)}
                          className="accent-[#8fe617] rounded h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Photo Thumbnail with Hover Zoom Popover */}
                      <td className="px-4 py-3">
                        <div className="relative group/thumb inline-block">
                          <div className="h-14 w-11 rounded-xl border border-border bg-surface-secondary overflow-hidden flex items-center justify-center shadow-xs transition-transform duration-150 group-hover/thumb:scale-105 cursor-pointer">
                            {student.photoPath ? (
                              <img
                                src={student.photoPath}
                                alt={student.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Camera className="h-4 w-4 text-foreground-subtle" />
                            )}
                          </div>

                          {/* Studio Portrait Hover Zoom Popover */}
                          {student.photoPath && (
                            <div className="hidden group-hover/thumb:flex flex-col absolute left-14 top-1/2 -translate-y-1/2 z-30 w-44 rounded-2xl border border-border bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                              <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-black border border-border">
                                <img
                                  src={student.photoPath}
                                  alt={student.fullName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="pt-2 px-1">
                                <div className="font-bold text-xs text-foreground truncate">{student.fullName}</div>
                                <div className="font-mono text-[10px] text-foreground-muted flex items-center justify-between pt-0.5">
                                  <span>{student.studentId}</span>
                                  <span className="text-[#8fe617] font-semibold">{student.grade}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-sm text-foreground">
                        {student.studentId}
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-sm text-foreground">
                        {student.fullName}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            student.sex?.toLowerCase() === "female"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {student.sex || "Male"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-sm font-medium text-foreground">{student.grade}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-foreground-muted">{student.phone}</td>

                      {/* Photo Status */}
                      <td className="px-4 py-3.5">
                        {hasPhoto ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#8fe617]/15 text-[#8fe617] border border-[#8fe617]/30">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Photo OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Missing
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.photoPath && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDownloadSinglePhoto(student.photoPath!, student.fullName)}
                                className="rounded-lg p-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                                title={`Download Photo (${student.fullName}.jpg)`}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStudent(student)}
                                className="rounded-lg p-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                                title={`Crop & Edit Photo (${student.fullName})`}
                              >
                                <Crop className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveStudent(student)}
                            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-secondary hover:text-foreground transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {(userRole === "RECEIVER" || userRole === "ADMIN" || userRole === "SENDER") && (
                            <button
                              type="button"
                              onClick={() => handleDelete(student.id, student.fullName, student.studentId)}
                              className="rounded-lg p-2 text-foreground-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
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
              <strong className="text-foreground font-mono">{totalEffective.toLocaleString()}</strong> students
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={activePageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-foreground focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">
              Page {activePage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage <= 1}
              className="rounded-lg border border-border bg-surface p-1.5 text-foreground hover:bg-surface-secondary disabled:opacity-30 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage >= totalPages}
              className="rounded-lg border border-border bg-surface p-1.5 text-foreground hover:bg-surface-secondary disabled:opacity-30 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sleek Floating Bulk Action Dock (Linear / Vercel Style) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[calc(100%-2rem)] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-[#0c100e]/95 backdrop-blur-md px-5 py-3.5 shadow-2xl text-white ring-1 ring-white/10">
            {/* Left: Counter and 8-Up calculation */}
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center bg-[#8fe617] text-[#070908] px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-xs">
                {selectedIds.size}
              </span>
              <div className="text-xs">
                <span className="text-white font-semibold">Selected</span>
                <span className="text-neutral-500 mx-2">•</span>
                <span className="text-[#8fe617] font-mono font-semibold">
                  {Math.ceil(selectedIds.size / 8)} A4 {Math.ceil(selectedIds.size / 8) === 1 ? "Sheet" : "Sheets"} (8-Up)
                </span>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export Selected to Excel */}
              <button
                type="button"
                onClick={() => downloadSelectedTogether("xlsx")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors cursor-pointer"
                title="Export selected students to Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              {/* Export Selected to CSV */}
              <button
                type="button"
                onClick={() => downloadSelectedTogether("csv")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors cursor-pointer"
                title="Export selected students to CSV"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>CSV</span>
              </button>

              {/* Download Selected Photos ZIP */}
              <button
                type="button"
                onClick={handleBulkDownloadPhotos}
                disabled={isDownloadingPhotos}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
                title="Download selected student photos organized by grade (.zip)"
              >
                {isDownloadingPhotos ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8fe617]" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-[#8fe617]" />
                )}
                <span>Photos ZIP</span>
              </button>

              {/* Batch Print 8-Up Engine */}
              <button
                type="button"
                onClick={handleBulkPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#8fe617] hover:bg-[#80d312] text-[#070908] text-xs font-bold transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                title="Open selected students in 8-Up A4 Print Engine"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print 8-Up ({Math.ceil(selectedIds.size / 8)} sheets)</span>
              </button>

              {/* Bulk Delete */}
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-900/40 bg-red-950/40 hover:bg-red-900/60 text-xs font-medium text-red-300 transition-colors cursor-pointer"
                title="Delete selected student records"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>

              {/* Deselect All */}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
                title="Deselect all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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

            {/* Studio Photo Showcase (QR Removed) */}
            <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl border border-border bg-surface-secondary/40">
              <span className="text-xs font-mono uppercase tracking-wider text-foreground-muted font-semibold">
                Official Studio Portrait (3:4)
              </span>
              <div className="w-48 aspect-[3/4] rounded-2xl border-2 border-border bg-black overflow-hidden flex items-center justify-center shadow-lg relative">
                {activeStudent.photoPath ? (
                  <img
                    src={activeStudent.photoPath}
                    alt={activeStudent.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-10 w-10 text-foreground-subtle" />
                )}
              </div>
              {activeStudent.photoPath && (
                <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePhoto(activeStudent.photoPath!, activeStudent.fullName)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-[#8fe617]" /> Download Portrait (.jpg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(activeStudent)}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl bg-[#8fe617] text-[#070908] font-bold hover:brightness-105 transition-all shadow-xs"
                  >
                    <Crop className="h-3.5 w-3.5" /> Crop & Edit Portrait
                  </button>
                  <div className="text-[11px] font-mono text-foreground-muted text-center truncate pt-0.5">
                    /photos/{activeStudent.fullName}.jpg
                  </div>
                </div>
              )}
            </div>

            {/* Field Details */}
            <div className="space-y-3 divide-y divide-border text-sm">
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Name:</span>
                <strong className="text-foreground">{activeStudent.fullName}</strong>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Grade:</span>
                <span className="text-foreground">{activeStudent.grade}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-foreground-muted">Sex:</span>
                <span className="text-foreground font-semibold">{activeStudent.sex || "Male"}</span>
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
    </div>
  );
};
