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
} from "lucide-react";
import Link from "next/link";
import { deleteStudentAction, clearAllStudentsAction } from "@/actions/students";
import type { UserRole } from "@/types/auth";

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
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Dual-Persistence Client State
  const [displayStudents, setDisplayStudents] = useState<StudentExtended[]>(students);

  // Sync with props when server updates and load dual-persistence localStorage students
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList: StudentExtended[] = JSON.parse(raw);
        const map = new Map<string, StudentExtended>();
        localList.forEach((s) => map.set(s.studentId, s));
        students.forEach((s) => map.set(s.studentId, s));
        const merged = Array.from(map.values());
        setDisplayStudents(merged);

        // Sync local students to serverless container database
        fetch("/api/students/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: localList }),
        }).catch(() => {});
        return;
      }
    } catch {}
    setDisplayStudents(students);
  }, [students]);

  // Real-time synchronization across browser tabs and storage
  useEffect(() => {
    const handleStorage = () => {
      try {
        const raw = localStorage.getItem("sb_enrolled_students");
        if (raw) {
          const localList: StudentExtended[] = JSON.parse(raw);
          const map = new Map<string, StudentExtended>();
          localList.forEach((s) => map.set(s.studentId, s));
          setDisplayStudents((prev) => {
            prev.forEach((s) => map.set(s.studentId, s));
            return Array.from(map.values());
          });
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
    try {
      const raw = localStorage.getItem("sb_enrolled_students");
      if (raw) {
        const localList = JSON.parse(raw);
        const filtered = localList.filter((s: any) => s.id !== id && s.studentId !== studentId);
        localStorage.setItem("sb_enrolled_students", JSON.stringify(filtered));
      }
    } catch {}
    setDisplayStudents((prev) => prev.filter((s) => s.id !== id && s.studentId !== studentId));
    startTransition(async () => {
      await deleteStudentAction(id);
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
        localStorage.removeItem("sb_enrolled_students");
      } catch {}
      setDisplayStudents([]);
      startTransition(async () => {
        await clearAllStudentsAction();
        router.refresh();
      });
    }
  };

  const totalEffective = Math.max(totalCount, displayStudents.length);
  const totalPages = Math.ceil(totalEffective / pageSize) || 1;
  const startItem = totalEffective === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalEffective);

  return (
    <div className="space-y-4">
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
        <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-5 py-3 shadow-glow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <span>{selectedIds.size} students selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownloadPhotos}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Selected Photos (.zip)</span>
            </button>

            <button
              onClick={handleBulkPrint}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print ID Cards</span>
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
                            <button
                              type="button"
                              onClick={() => handleDownloadSinglePhoto(student.photoPath!, student.fullName)}
                              className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                              title={`Download Photo (${student.fullName}.jpg)`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveStudent(student)}
                            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                            title="Inspect Profile"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {(userRole === "RECEIVER" || userRole === "ADMIN") && (
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
                  <div className="pt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePhoto(activeStudent.photoPath!, activeStudent.fullName)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-black hover:underline"
                    >
                      <Download className="h-3 w-3" /> Download Photo ({activeStudent.fullName}.jpg)
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
          </div>
        </div>
      )}
    </div>
  );
};
