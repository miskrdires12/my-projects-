import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Eye, Edit2, Trash2, X, Plus, Calendar,
  UserCheck, Shield, ChevronLeft, ChevronRight,
  BookOpen, Users as UsersIcon, Check, Printer,
  RotateCcw, Download, Sparkles, Type, Image as ImageIcon,
  QrCode as QrIcon, Shapes, Award, Maximize2, ZoomIn, ZoomOut,
  Sliders, FileText, CheckCircle2, AlertTriangle, Phone, Mail,
  MapPin, Clock, ExternalLink, CreditCard
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getStudents, addStudent, updateStudent, deleteStudent, restoreStudent,
  getPhotoUrl, getPhotoEncodeClass, subscribeToStudentSync
} from '@/lib/store';
import { Student } from '@/types';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('2026-2027');

  // Selected Student (powers the Right Dossier Panel and Bottom ID Card Studio)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Right Dossier Tabs: 'Photo' | 'Academic' | 'Contact' | 'Activity'
  const [dossierTab, setDossierTab] = useState<'Photo' | 'Academic' | 'Contact' | 'Activity'>('Photo');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bottom ID Card Studio States
  const [designerSide, setDesignerSide] = useState<'Front' | 'Back'>('Front');
  const [activeTemplate, setActiveTemplate] = useState<'modern' | 'school' | 'classic'>('modern');
  const [cardOrientation, setCardOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [printLayout, setPrintLayout] = useState<'a4_8' | 'a4_10' | 'single'>('a4_8');

  // QR Code Data URL for Selected Student
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Form States for Add/Edit
  const [formFullName, setFormFullName] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formSex, setFormSex] = useState('Male');
  const [formGrade, setFormGrade] = useState('10');
  const [formSection, setFormSection] = useState('10-A');
  const [formSchool, setFormSchool] = useState('YMS');
  const [formPhone, setFormPhone] = useState('+251911000000');
  const [formDob, setFormDob] = useState('2010-03-15');
  const [formPhotoBase64, setFormPhotoBase64] = useState<string | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // 1. Authoritative Data Synchronization
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/students?all=true&limit=5000');
      if (res.ok) {
        const json = await res.json();
        if (json.students && json.students.length > 0) {
          const memory = getStudents();
          const serverIds = new Set(json.students.map((s: Student) => s.studentId));
          const localOnly = memory.filter(m => !serverIds.has(m.studentId));
          const combined = [...localOnly, ...json.students];
          setStudents(combined);
          if (!selectedStudent && combined.length > 0) {
            setSelectedStudent(combined[0]);
            setSelectedIds(new Set([combined[0].studentId]));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Syncing with local storage:', e);
    } finally {
      setIsLoading(false);
    }
    const mem = getStudents();
    setStudents([...mem]);
    if (!selectedStudent && mem.length > 0) {
      setSelectedStudent(mem[0]);
      setSelectedIds(new Set([mem[0].studentId]));
    }
  };

  useEffect(() => {
    const initial = getStudents();
    if (initial.length > 0) {
      setStudents(initial);
      setSelectedStudent(initial[0]);
      setSelectedIds(new Set([initial[0].studentId]));
    }

    loadData();

    const handleDataChange = () => {
      const current = getStudents();
      if (current.length > 0) {
        setStudents([...current]);
      }
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);

    const unsubscribe = subscribeToStudentSync(
      (incoming) => {
        setStudents((prev) => {
          const idx = prev.findIndex(s => s.studentId === incoming.studentId || s.id === incoming.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...incoming };
            return updated;
          }
          return [incoming, ...prev];
        });
      },
      (deletedId) => {
        setStudents((prev) => prev.filter(s => s.studentId !== deletedId && s.id !== deletedId));
      }
    );

    return () => {
      window.removeEventListener('studentbridge_datachange', handleDataChange);
      unsubscribe();
    };
  }, []);

  // Update QR Code whenever selectedStudent changes
  useEffect(() => {
    if (selectedStudent) {
      const payload = selectedStudent.qrCodeData || JSON.stringify({
        id: selectedStudent.studentId,
        name: selectedStudent.fullName,
        grade: selectedStudent.grade || '10',
        school: selectedStudent.school || 'YMS',
        verified: true,
        issuer: 'Silicon Labs StudentBridge'
      });

      QRCode.toDataURL(payload, {
        width: 130,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    }
  }, [selectedStudent]);

  // Normalize Section (e.g., '10A' -> '10-A', '9B' -> '9-B')
  const getSection = (s: Student): string => {
    if (s.department) return s.department;
    const g = (s.grade || '10').trim();
    if (g.length >= 2 && !g.includes('-')) {
      const num = g.slice(0, -1);
      const letter = g.slice(-1).toUpperCase();
      if (/^\d+$/.test(num) && /^[A-Z]$/.test(letter)) {
        return `${num}-${letter}`;
      }
    }
    return '10-A';
  };

  // Extract DOB (or consistent academic DOB based on grade)
  const getDob = (s: Student): string => {
    if (s.dateOfBirth) return s.dateOfBirth.substring(0, 10);
    const gNum = parseInt(s.grade?.replace(/\D/g, '') || '10', 10);
    const birthYear = 2026 - (gNum + 6);
    return `${birthYear}-03-15`;
  };

  // Distinct Grades and Sections for Filters
  const distinctGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered dataset
  const filtered = useMemo(() => {
    return students.filter(s => {
      if (!s) return false;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.school && s.school.toLowerCase().includes(q));

      const matchGrade = gradeFilter === 'ALL' || s.grade === gradeFilter;
      const sec = getSection(s);
      const matchSection = sectionFilter === 'ALL' || sec === sectionFilter;

      const st = (s.status || 'Active').toUpperCase();
      const isAccepted = st === 'ACCEPTED' || st === 'ACTIVE' || st === 'VERIFIED';
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && isAccepted && !s.receiverHidden) ||
        (statusFilter === 'Hidden' && s.receiverHidden === true);

      return matchSearch && matchGrade && matchSection && matchStatus;
    });
  }, [students, search, gradeFilter, sectionFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Row selection handler
  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setSelectedIds(new Set([s.studentId]));
  };

  const toggleSelectRow = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedIds(next);

    const match = students.find(s => s.studentId === studentId);
    if (match) setSelectedStudent(match);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedStudents.length && pagedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedStudents.map(s => s.studentId)));
    }
  };

  // Safe Deletion Handler
  const executeDelete = async (permanent: boolean) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const targetSid = deleteTarget.studentId;
    const targetId = deleteTarget.id;

    try {
      // Optimistic update
      if (permanent) {
        setStudents(prev => prev.filter(s => s.studentId !== targetSid && s.id !== targetId));
      } else {
        setStudents(prev => prev.map(s => {
          if (s.studentId === targetSid || s.id === targetId) {
            return { ...s, receiverHidden: true, hiddenAt: new Date().toISOString() };
          }
          return s;
        }));
      }

      if (selectedStudent?.studentId === targetSid || selectedStudent?.id === targetId) {
        const remaining = students.filter(s => s.studentId !== targetSid && s.id !== targetId);
        setSelectedStudent(remaining[0] || null);
      }
      setDeleteTarget(null);

      await deleteStudent(targetSid, permanent);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Save new student safely
  const handleSaveAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formStudentId.trim()) {
      alert('Please provide Full Name and Student ID.');
      return;
    }
    setIsSavingStudent(true);

    try {
      const newSt: Student = {
        id: 'stu-' + Date.now().toString(36),
        studentId: formStudentId.trim(),
        fullName: formFullName.trim(),
        sex: formSex as any,
        grade: formGrade.trim(),
        school: formSchool.trim(),
        phone: formPhone.trim(),
        status: 'Accepted',
        photoPath: formPhotoBase64 || null,
        previewPath: formPhotoBase64 || null,
        photoIntegrityStatus: formPhotoBase64 ? 'PHOTO_VERIFIED' : 'PHOTO_PENDING',
        dateOfBirth: formDob,
        department: formSection,
        createdAt: new Date().toISOString()
      };

      // Add to store
      addStudent(newSt);
      setStudents(prev => [newSt, ...prev]);
      setSelectedStudent(newSt);
      setSelectedIds(new Set([newSt.studentId]));
      setIsAddModalOpen(false);

      // Reset form
      setFormFullName('');
      setFormStudentId('');
      setFormPhotoBase64(null);

      // Push to Supabase PostgreSQL & R2
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSt)
      });
    } catch (err) {
      console.error('Error saving student:', err);
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Print Ready handler
  const handlePrintReady = () => {
    window.print();
  };

  // Fallback student if list is empty
  const activeDossier = selectedStudent || {
    id: 'STU001245',
    studentId: 'STU001245',
    fullName: 'Daniel Kim',
    grade: 'Grade 10',
    sex: 'Male',
    school: 'Silicon Labs Academy',
    phone: '+251911445566',
    status: 'Active',
    photoPath: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
    dateOfBirth: '2010-03-15',
    department: '10-A'
  } as Student;

  const currentPhoto = getPhotoUrl(activeDossier.photoPath || activeDossier.previewPath || activeDossier.thumbnailPath) ||
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400';

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-[#85E510] selection:text-[#062404]">
      {/* =========================================================================
          SECTION 1: TOP ROW (STUDENT DIRECTORY + STUDENT DETAILS DOSSIER)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Student Directory Table (8 Cols on Desktop) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#1E293B]">
                <UserCheck className="w-5 h-5 text-[#1E293B]" />
              </div>
              <h2 className="text-xl font-heading font-black text-[#1E293B] tracking-tight">
                Student Directory
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormStudentId('STU' + Math.floor(100000 + Math.random() * 900000));
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-[#256002] border border-[#85E510] text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#3B7E05]" />
              <span>Add Student</span>
            </button>
          </div>

          {/* Filter Bar matching Screenshot */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search students..."
                className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
              />
            </div>

            {/* Grades Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
              className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#85E510]"
            >
              <option value="ALL">All Grades</option>
              {distinctGrades.map(g => (
                <option key={g} value={g}>{g.startsWith('Grade') ? g : `Grade ${g}`}</option>
              ))}
            </select>

            {/* Sections Filter */}
            <select
              value={sectionFilter}
              onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
              className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#85E510]"
            >
              <option value="ALL">All Sections</option>
              {['10-A', '9-B', '11-A', '10-B', '9-A', '12-A', '11-B', '4-B', '2-A', '2-B'].map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            {/* Statuses Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#85E510]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Hidden">Hidden (Trash)</option>
            </select>

            {/* Academic Year Filter with Calendar Icon */}
            <div className="relative">
              <select
                value={academicYearFilter}
                onChange={(e) => setAcademicYearFilter(e.target.value)}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-[#1E293B] focus:outline-none focus:border-[#85E510] appearance-none"
              >
                <option value="2026-2027">Academic Year</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Green Search Action Button */}
            <button
              type="button"
              onClick={() => setPage(1)}
              className="px-4 py-1.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>

          {/* Directory Data Table */}
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] font-bold">
                <tr>
                  <th className="py-3 pl-3.5 w-9">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                    />
                  </th>
                  <th className="py-3 px-2">Photo</th>
                  <th className="py-3 px-2">Student ID</th>
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Grade</th>
                  <th className="py-3 px-2">Section</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {pagedStudents.map((s) => {
                  const photoSrc = getPhotoUrl(s.thumbnailPath || s.previewPath || s.photoPath);
                  const isSelected = selectedStudent?.studentId === s.studentId;
                  const sec = getSection(s);
                  const gradeLabel = s.grade?.startsWith('Grade') ? s.grade : `Grade ${s.grade || '10'}`;

                  return (
                    <tr
                      key={s.id || s.studentId}
                      onClick={() => handleSelectStudent(s)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F0FDF4] border-l-4 border-l-[#85E510]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 pl-3.5" onClick={(e) => toggleSelectRow(s.studentId, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected || selectedIds.has(s.studentId)}
                          onChange={() => {}}
                          className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                        />
                      </td>

                      {/* Circular Avatar Photo */}
                      <td className="py-2.5 px-2">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-[#CBD5E1] shrink-0 flex items-center justify-center">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={s.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">ID</span>
                          )}
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-2.5 px-2 font-mono font-bold text-[#1E293B]">
                        {s.studentId}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-2 font-bold text-[#1E293B]">
                        {s.fullName}
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-2 text-[#475569] font-medium">
                        {gradeLabel}
                      </td>

                      {/* Section */}
                      <td className="py-2.5 px-2 font-mono text-[#475569]">
                        {sec}
                      </td>

                      {/* Status Active Badge matching screenshot */}
                      <td className="py-2.5 px-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F8CE] text-[#256002] border border-[#85E510]/30 inline-block">
                          Active
                        </span>
                      </td>

                      {/* Actions Column (Eye, Pencil, Trash) */}
                      <td className="py-2.5 px-2 text-right pr-4 space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelectStudent(s)}
                          className="p-1 rounded-md text-slate-400 hover:text-[#1E293B] hover:bg-slate-100 transition-all"
                          title="Select / View Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setFormFullName(s.fullName);
                            setFormGrade(s.grade || '10');
                            setFormPhone(s.phone || '');
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          title="Edit Student"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {pagedStudents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#64748B]">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#85E510] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold">Streaming students from Supabase & Cloudflare R2...</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="font-bold text-xs text-[#1E293B]">No student records found</span>
                          <p className="text-[11px] text-[#94A3B8]">Try adjusting your search query or reset filter options.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer matching Screenshot */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-[#64748B]">
            <div>
              Showing <strong className="text-[#1E293B]">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-[#1E293B]">{Math.min(page * pageSize, filtered.length)}</strong> of{' '}
              <strong className="text-[#1E293B]">{filtered.length.toLocaleString()}</strong> students
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg border border-[#CBD5E1] bg-white flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 text-[#1E293B]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Numbered pagination badges */}
              {[1, 2, 3, 4, 5].map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    page === pageNum
                      ? 'bg-[#85E510] text-[#062404] shadow-xs'
                      : 'border border-[#CBD5E1] bg-white text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <span className="px-1 text-slate-400">...</span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded-lg border border-[#CBD5E1] bg-white flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 text-[#1E293B]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Page size dropdown */}
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="ml-2 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#1E293B]"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Student Details Dossier Panel (4 Cols on Desktop) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-lg text-[#1E293B]">
              Student Details
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F8CE] text-[#256002] border border-[#85E510]/30">
              Active
            </span>
          </div>

          {/* Student Dossier Summary matching Screenshot */}
          <div className="flex gap-4 items-start pb-2">
            {/* Student Portrait */}
            <div className="w-28 h-36 rounded-xl overflow-hidden bg-slate-100 border border-[#CBD5E1] shrink-0 shadow-xs">
              <img
                src={currentPhoto}
                alt={activeDossier.fullName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400';
                }}
              />
            </div>

            {/* Metadata Fields with Icons */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <h4 className="text-lg font-heading font-black text-[#1E293B] leading-tight truncate">
                  {activeDossier.fullName}
                </h4>
                <div className="text-xs font-mono font-bold text-[#64748B]">
                  {activeDossier.studentId}
                </div>
              </div>

              <div className="space-y-1 pt-1 text-xs text-[#475569]">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Grade</span>
                  <span className="font-bold text-[#1E293B]">{activeDossier.grade?.replace('Grade', '').trim() || '10'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <UsersIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Section</span>
                  <span className="font-bold text-[#1E293B]">{getSection(activeDossier)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400 truncate">Date of Birth</span>
                  <span className="font-mono text-[#1E293B] font-medium">{getDob(activeDossier)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Gender</span>
                  <span className="font-bold text-[#1E293B]">{activeDossier.sex || 'Male'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dossier Navigation Tabs */}
          <div className="border-b border-[#E2E8F0] flex items-center gap-4 text-xs font-bold">
            {(['Photo', 'Academic', 'Contact', 'Activity'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setDossierTab(tab)}
                className={`pb-2 transition-all relative ${
                  dossierTab === tab
                    ? 'text-[#256002] font-black'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <span>{tab}</span>
                {dossierTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#85E510] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {dossierTab === 'Photo' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Photo Preview Frame on Left */}
              <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-100 border border-[#CBD5E1]">
                <img
                  src={currentPhoto}
                  alt={activeDossier.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* R2 Cloudflare Source & View Full Size button on Right */}
              <div className="flex flex-col justify-between py-0.5">
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E293B]">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>Original Photo</span>
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">From Cloudflare R2</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(currentPhoto)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Size</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img src={currentPhoto} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[#1E293B]">Thumbnail</div>
                    <div className="text-[9px] text-[#64748B]">From Cloudflare R2</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {dossierTab === 'Academic' && (
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">School Campus</span>
                <span className="font-bold text-[#1E293B]">{activeDossier.school || 'Silicon Labs Central'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Academic Year</span>
                <span className="font-mono text-[#1E293B]">{activeDossier.academicYear || '2026-2027'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Roll Number</span>
                <span className="font-mono text-[#1E293B]">{activeDossier.rollNumber || 'R-104'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Biometric Verification</span>
                <span className="font-bold text-emerald-700">VERIFIED (Cloudflare R2)</span>
              </div>
            </div>
          )}

          {dossierTab === 'Contact' && (
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Primary Phone</span>
                <span className="font-mono font-bold text-[#1E293B]">{activeDossier.phone || '+251911000000'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">City / Region</span>
                <span className="font-bold text-[#1E293B]">{activeDossier.address || activeDossier.cityRegion || 'Addis Ababa'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Emergency Contact</span>
                <span className="font-medium text-[#1E293B]">{activeDossier.emergencyContactName || 'Guardian'}</span>
              </div>
            </div>
          )}

          {dossierTab === 'Activity' && (
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Enrolled Date</span>
                <span className="font-mono text-[#1E293B]">{activeDossier.createdAt?.substring(0, 10) || '2026-10-11'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Field Sender</span>
                <span className="font-bold text-[#1E293B]">{activeDossier.senderName || 'Sender Station 1'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Dual-Channel Sync</span>
                <span className="font-bold text-emerald-700">0ms Realtime SSE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: BOTTOM STUDIO (ID CARD DESIGNER + PRINT ENGINE PANEL)
         ========================================================================= */}
      <div id="id-card-designer" className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-4">
        {/* Studio Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[#1E293B]">
              <CreditCard className="w-5 h-5 text-[#1E293B]" />
            </div>
            <h3 className="text-xl font-heading font-black text-[#1E293B] tracking-tight">
              ID Card Designer
            </h3>
          </div>

          {/* Center Toolbar: Undo, Redo, Zoom, Front/Back Side Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[#64748B]">
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-[#1E293B]" title="Undo">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-[#1E293B] scale-x-[-1]" title="Redo">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-xs font-mono font-bold text-[#1E293B]">
              <button type="button" onClick={() => setZoomLevel(z => Math.max(75, z - 10))} className="hover:text-black">-</button>
              <span>{zoomLevel}%</span>
              <button type="button" onClick={() => setZoomLevel(z => Math.min(150, z + 10))} className="hover:text-black">+</button>
            </div>

            {/* Side Switcher Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setDesignerSide('Front')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  designerSide === 'Front'
                    ? 'bg-[#E6F8CE] text-[#256002] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setDesignerSide('Back')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  designerSide === 'Back'
                    ? 'bg-[#E6F8CE] text-[#256002] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                Back Side
              </button>
            </div>
          </div>
        </div>

        {/* Studio Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[460px]">
          {/* COLUMN 1: Templates & Settings Sidebar (3 Cols) */}
          <div className="lg:col-span-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Tabs: Templates / Elements */}
              <div className="flex items-center gap-4 border-b border-[#E2E8F0] pb-2 text-xs font-bold">
                <button type="button" className="text-[#1E293B] border-b-2 border-[#85E510] pb-1 font-black">
                  Templates
                </button>
                <button type="button" className="text-[#64748B] hover:text-[#1E293B] pb-1">
                  Elements
                </button>
              </div>

              {/* Template Category Pills */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTemplate('school')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeTemplate === 'school' ? 'bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200' : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  School
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate('modern')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeTemplate === 'modern' ? 'bg-[#85E510] text-[#062404] shadow-xs' : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  Modern
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate('classic')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    activeTemplate === 'classic' ? 'bg-slate-200 text-[#1E293B]' : 'bg-white border border-[#CBD5E1] text-[#64748B]'
                  }`}
                >
                  Classic
                </button>
              </div>

              {/* Template Preview Thumbnails */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* Modern Thumb */}
                <div
                  onClick={() => setActiveTemplate('modern')}
                  className={`cursor-pointer rounded-lg border-2 p-1 bg-white shadow-xs transition-all ${
                    activeTemplate === 'modern' ? 'border-[#85E510] ring-2 ring-[#85E510]/30' : 'border-slate-200'
                  }`}
                >
                  <div className="h-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded flex items-center justify-center p-1">
                    <span className="text-[8px] font-black text-[#85E510]">MODERN</span>
                  </div>
                </div>

                {/* School Thumb */}
                <div
                  onClick={() => setActiveTemplate('school')}
                  className={`cursor-pointer rounded-lg border-2 p-1 bg-white shadow-xs transition-all ${
                    activeTemplate === 'school' ? 'border-[#85E510] ring-2 ring-[#85E510]/30' : 'border-slate-200'
                  }`}
                >
                  <div className="h-12 bg-gradient-to-r from-indigo-900 to-indigo-700 rounded flex items-center justify-center p-1">
                    <span className="text-[8px] font-black text-white">SCHOOL</span>
                  </div>
                </div>

                {/* Classic Thumb */}
                <div
                  onClick={() => setActiveTemplate('classic')}
                  className={`cursor-pointer rounded-lg border-2 p-1 bg-white shadow-xs transition-all ${
                    activeTemplate === 'classic' ? 'border-[#85E510] ring-2 ring-[#85E510]/30' : 'border-slate-200'
                  }`}
                >
                  <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded flex items-center justify-center p-1">
                    <span className="text-[8px] font-black text-slate-800">CLASSIC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Settings at bottom of Column 1 */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5 text-xs">
              <div className="font-bold text-[#1E293B]">Template Settings</div>

              <div>
                <label className="text-[11px] text-[#64748B] block mb-1">Card Size</label>
                <select className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#1E293B]">
                  <option>CR80 (85.60 x 53.98 mm)</option>
                  <option>CR79 (83.90 x 52.10 mm)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[#64748B] block mb-1">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardOrientation('portrait')}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      cardOrientation === 'portrait'
                        ? 'border-[#85E510] bg-[#E6F8CE] text-[#256002]'
                        : 'border-[#CBD5E1] bg-white text-[#64748B]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cardOrientation === 'portrait' ? 'bg-[#85E510]' : 'border border-slate-300'}`} />
                    <span>Portrait</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardOrientation('landscape')}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      cardOrientation === 'landscape'
                        ? 'border-[#85E510] bg-[#E6F8CE] text-[#256002]'
                        : 'border-[#CBD5E1] bg-white text-[#64748B]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cardOrientation === 'landscape' ? 'bg-[#85E510]' : 'border border-slate-300'}`} />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#64748B] block mb-1">Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDesignerSide('Front')}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      designerSide === 'Front'
                        ? 'border-[#85E510] bg-[#E6F8CE] text-[#256002]'
                        : 'border-[#CBD5E1] bg-white text-[#64748B]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${designerSide === 'Front' ? 'bg-[#85E510]' : 'border border-slate-300'}`} />
                    <span>Front Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesignerSide('Back')}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      designerSide === 'Back'
                        ? 'border-[#85E510] bg-[#E6F8CE] text-[#256002]'
                        : 'border-[#CBD5E1] bg-white text-[#64748B]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${designerSide === 'Back' ? 'bg-[#85E510]' : 'border border-slate-300'}`} />
                    <span>Back Side</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Tool Palette (1 Col on Desktop) */}
          <div className="lg:col-span-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2 flex flex-col items-center justify-center gap-3">
            {[
              { icon: Type, label: 'Text' },
              { icon: ImageIcon, label: 'Image' },
              { icon: QrIcon, label: 'QR Code' },
              { icon: Shapes, label: 'Shape' },
              { icon: Award, label: 'Logo' },
              { icon: Maximize2, label: 'Frame' },
            ].map(tool => (
              <button
                key={tool.label}
                type="button"
                className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#85E510] hover:text-[#256002] flex flex-col items-center justify-center gap-1 text-[#64748B] shadow-xs transition-all"
                title={tool.label}
              >
                <tool.icon className="w-4 h-4" />
                <span className="text-[9px] font-bold leading-none">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* COLUMN 3: Center Canvas (Live Interactive CR80 ID Card - 5 Cols) */}
          <div className="lg:col-span-5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl p-6 flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px]">
            {/* The CR80 Physical Student ID Card Preview matching Screenshot */}
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              className="w-[380px] h-[240px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative flex flex-col justify-between transition-transform duration-200"
            >
              {/* Card Top Banner with StudentBridge Logo & Decorative Emerald Wave */}
              <div className="pt-3 px-4 flex items-start justify-between relative">
                {/* Brand */}
                <div className="flex items-center gap-2 z-10">
                  <div className="w-6 h-6 rounded-md bg-[#85E510] flex items-center justify-center p-1 text-[#062404] shadow-xs">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <rect x="3" y="3" width="8" height="8" rx="2" />
                      <rect x="13" y="3" width="8" height="8" rx="2" fillOpacity="0.8" />
                      <rect x="3" y="13" width="8" height="8" rx="2" fillOpacity="0.8" />
                      <rect x="13" y="13" width="8" height="8" rx="2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-tight text-[#0F172A] leading-tight">
                      StudentBridge
                    </div>
                    <div className="text-[8px] font-extrabold tracking-widest text-[#64748B] uppercase">
                      SILICON LABS
                    </div>
                  </div>
                </div>

                {/* Decorative Green Curve on Top Right */}
                <div className="absolute top-0 right-0 w-28 h-20 overflow-hidden pointer-events-none">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#85E510] to-[#65B703] opacity-80 -mr-10 -mt-10" />
                </div>
              </div>

              {/* Card Body: Student Portrait on Left + Details & QR Code on Right */}
              <div className="px-4 flex items-center gap-3.5 z-10">
                {/* Biometric Portrait Frame */}
                <div className="w-24 h-28 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-sm shrink-0">
                  <img
                    src={currentPhoto}
                    alt={activeDossier.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details & Live Scannable QR Code */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-heading font-black text-[#0F172A] leading-tight truncate">
                    {activeDossier.fullName}
                  </h4>
                  <div className="text-[11px] font-mono font-bold text-[#64748B]">
                    {activeDossier.studentId}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="space-y-1 text-[10px] text-[#475569]">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        <span>Grade</span>
                        <strong className="text-[#0F172A]">{activeDossier.grade?.replace('Grade', '').trim() || '10'}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-3 h-3 text-slate-400" />
                        <span>Section</span>
                        <strong className="text-[#0F172A]">{getSection(activeDossier)}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>DOB</span>
                        <strong className="text-[#0F172A] font-mono">{getDob(activeDossier)}</strong>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Security QR" className="w-full h-full object-contain" />
                      ) : (
                        <QrIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Dark Ribbon with Slogan */}
              <div className="h-7 bg-[#0F172A] px-4 flex items-center justify-between z-10">
                <span className="text-[9px] font-black tracking-wider text-white uppercase">
                  STUDENT ID CARD
                </span>
                <span className="text-[9px] font-bold text-[#85E510]">
                  Learn • Grow • Succeed
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 4: Print Preview & A4 Sheet Arrangement (3 Cols) */}
          <div id="print-preview" className="lg:col-span-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              {/* Header and Dropdown matching Screenshot */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#1E293B]">
                  <Printer className="w-3.5 h-3.5 text-[#1E293B]" />
                  <span>Print Preview</span>
                </div>

                <select
                  value={printLayout}
                  onChange={(e) => setPrintLayout(e.target.value as any)}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-[11px] font-bold text-[#1E293B]"
                >
                  <option value="a4_8">A4 Sheet (8 Cards)</option>
                  <option value="a4_10">A4 Sheet (10 Cards)</option>
                  <option value="single">Single Card</option>
                </select>
              </div>

              {/* Miniature A4 Sheet Preview showing 8 arranged cards matching Screenshot */}
              <div className="bg-white border border-slate-300 rounded-xl p-2 shadow-xs aspect-[1/1.3] flex flex-col justify-between overflow-hidden">
                <div className="grid grid-cols-2 gap-1.5 h-full">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const st = students[i] || activeDossier;
                    const thumb = getPhotoUrl(st.thumbnailPath || st.photoPath) || currentPhoto;
                    return (
                      <div
                        key={i}
                        className="border border-slate-200 rounded p-1 flex items-center gap-1 bg-[#FAFAFA] text-[6px] overflow-hidden leading-none"
                      >
                        <div className="w-5 h-6 rounded bg-slate-200 shrink-0 overflow-hidden">
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 truncate">
                          <div className="font-bold text-[#0F172A] truncate">{st.fullName}</div>
                          <div className="text-[5px] text-slate-400 font-mono">{st.studentId}</div>
                        </div>
                        <div className="w-3 h-3 bg-white border border-slate-300 shrink-0 rounded-xs flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-[#0F172A]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Print Ready Button matching Screenshot */}
            <button
              type="button"
              onClick={handlePrintReady}
              className="w-full py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] active:scale-[0.99] text-[#062404] text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ready</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS FOR COMPLETE ENTERPRISE FUNCTIONALITY & DATA SAFETY
         ========================================================================= */}

      {/* 1. Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-heading font-black text-lg text-[#1E293B]">Enroll New Student</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddStudent} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="e.g. Daniel Kim"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Gender</label>
                  <select
                    value={formSex}
                    onChange={(e) => setFormSex(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Grade</label>
                  <input
                    type="text"
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Section</label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1E293B] block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="font-bold text-[#1E293B] block mb-1">Biometric Portrait</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (re) => setFormPhotoBase64(re.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#85E510] file:text-[#062404] file:font-black"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black"
                >
                  {isSavingStudent ? 'Saving...' : 'Save & Upload to Cloudflare'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Student Modal */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-heading font-black text-lg text-[#1E293B]">Edit Student Information</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1E293B] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-[#1E293B] block mb-1">Grade</label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={(e) => setFormGrade(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-[#1E293B] block mb-1">Phone</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateStudent(selectedStudent.studentId, {
                      fullName: formFullName.trim(),
                      grade: formGrade.trim(),
                      phone: formPhone.trim()
                    });
                    setStudents(prev => prev.map(s => s.studentId === selectedStudent.studentId ? {
                      ...s,
                      fullName: formFullName.trim(),
                      grade: formGrade.trim(),
                      phone: formPhone.trim()
                    } : s));
                    setSelectedStudent(prev => prev ? {
                      ...prev,
                      fullName: formFullName.trim(),
                      grade: formGrade.trim(),
                      phone: formPhone.trim()
                    } : null);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black"
                >
                  Update Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal (Temporary vs Permanent) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#1E293B]">Delete Confirmation</h3>
              </div>
              <button type="button" onClick={() => setDeleteTarget(null)} className="p-1 text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-300 overflow-hidden shrink-0">
                  <img
                    src={getPhotoUrl(deleteTarget.photoPath || deleteTarget.previewPath) || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-[#1E293B]">{deleteTarget.fullName}</div>
                  <div className="font-mono text-[#64748B] text-[11px]">{deleteTarget.studentId}</div>
                </div>
              </div>

              {/* Option 1: Temporary Delete */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900">Temporary Delete (Hide Only)</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Hides student from directory view. Data remains safe in Supabase and can be restored at any time.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(false)}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                >
                  {isDeleting ? 'Updating...' : 'Hide from System'}
                </button>
              </div>

              {/* Option 2: Permanent Delete */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                <div className="font-bold text-rose-900">Permanent Delete (Purge Everywhere)</div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Irreversibly removes student from Supabase database and purges photo from Cloudflare R2 bucket.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(true)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {isDeleting ? 'Erasing...' : 'Permanent Delete Everywhere'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Lightbox Full Size Photo Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-lg w-full bg-slate-900 p-2 rounded-2xl border border-slate-700 shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={lightboxPhoto} alt="Full Size" className="w-full h-auto max-h-[80vh] rounded-xl object-contain mx-auto" />
            <div className="text-center text-xs font-mono text-slate-400 py-2">
              Cloudflare R2 Bucket &bull; siliconlabs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
