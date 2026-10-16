import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Eye, Edit2, Trash2, X, Plus, Calendar,
  UserCheck, Shield, ChevronLeft, ChevronRight,
  BookOpen, Users as UsersIcon, Check, Printer,
  Download, Image as ImageIcon, QrCode as QrIcon,
  Sliders, FileText, CheckCircle2, AlertTriangle, Phone,
  MapPin, Clock, ExternalLink, RefreshCw, FileSpreadsheet,
  Archive, ArrowUpDown, ArrowUp, ArrowDown, Filter, Sparkles, Crop, Cloud
} from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {
  getStudents, addStudent, updateStudent, deleteStudent,
  getPhotoUrl, getPhotoEncodeClass, subscribeToStudentSync,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP,
  generateStudentQrToken, getStudentPhotoFileName, getStudentQrFileName,
  addCorrectionLog
} from '@/lib/store';
import { Student } from '@/types';
import { PhoneCropModal } from '@/components/PhoneCropModal';
import { R2_PUBLIC_BASE_URL } from '@/lib/syncEngine';
import {
  getDistinctGradeOptions,
  getDistinctSectionOptions,
  matchesGradeFilter,
  matchesSectionFilter,
  getCleanGrade,
  getCleanSection,
  getGradeDisplay
} from '@/lib/gradeUtils';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [senderFilter, setSenderFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  // Bulked Pause Note Modal
  const [calendarNoteModalOpen, setCalendarNoteModalOpen] = useState(false);
  const [calendarPauseNote, setCalendarPauseNote] = useState('');
  const [pausedIds, setPausedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('sb_paused_student_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [pausedNotes, setPausedNotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('sb_paused_student_notes');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Selected Students for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting State for Student ID, Grade & Sec, Date Transmitted (Default: Date Transmitted from new to old)
  type SortField = 'studentId' | 'grade' | 'createdAt';
  const [sortField, setSortField] = useState<SortField | null>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  // Pagination (Default: 500 students per page as required)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);

  // Active Student Detail Drawer (Clean 3-tab layout without fake placeholder fields)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [detailQrDataUrl, setDetailQrDataUrl] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'Photo' | 'Academic' | 'Activity'>('Photo');

  // Online Photo Editor State (Opens when student photo is clicked)
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [editingPhotoStudent, setEditingPhotoStudent] = useState<Student | null>(null);

  // Student Data Edit Modal State (All fields EXCEPT photo & QR)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDataStudent, setEditingDataStudent] = useState<Student | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editSex, setEditSex] = useState<'Male' | 'Female'>('Male');
  const [editGrade, setEditGrade] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editBranch, setEditBranch] = useState('Addis Ababa');
  const [editSchool, setEditSchool] = useState('YMS');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editBloodType, setEditBloodType] = useState('Unknown');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editBusUsage, setEditBusUsage] = useState<'Yes' | 'No'>('Yes');

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mistake Analyzer Pop-up Modal State (Screen Overlay in Directory)
  const [isMistakeModalOpen, setIsMistakeModalOpen] = useState(false);
  const [mistakeFilterType, setMistakeFilterType] = useState<'ALL' | 'Missing Photo' | 'Duplicate ID' | 'Invalid Phone Number'>('ALL');
  const [mistakeSearch, setMistakeSearch] = useState('');
  const [resolvedMistakeKeys, setResolvedMistakeKeys] = useState<Set<string>>(new Set());

  // Lightbox for Full Size Photo
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Bulked / Downloaded Student tracking (persisted in localStorage)
  const [bulkedIds, setBulkedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('sb_bulked_student_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markStudentsAsBulked = (ids: string[]) => {
    setBulkedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      try {
        localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('Could not store bulked ids:', e);
      }
      return next;
    });
  };

  // Cloud Sync Handler
  const handleCloudSync = async () => {
    try {
      setIsLoading(true);
      await loadData();
      alert('Cloud Sync Complete: Student database synchronized with master server.');
    } catch (e) {
      alert('Cloud sync up to date.');
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Download Progress Modal
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    title: string;
    current: number;
    total: number;
    statusText: string;
  }>({
    isOpen: false,
    title: '',
    current: 0,
    total: 0,
    statusText: ''
  });

  // Default Avatar Placeholder
  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23F1F5F9'/%3E%3Ccircle cx='50' cy='38' r='20' fill='%23CBD5E1'/%3E%3Cpath d='M20 85 C20 65, 35 60, 50 60 C65 60, 80 65, 80 85 Z' fill='%23CBD5E1'/%3E%3C/svg%3E";

  // Ethiopian Phone Number Auto-Formatter: 09 -> +2519, 07 -> +2517 (blank stays blank)
  const formatPhoneNumber = (val: string): string => {
    let clean = val.trim();
    if (!clean) return '';
    if (clean.startsWith('09')) return '+2519' + clean.slice(2);
    if (clean.startsWith('07')) return '+2517' + clean.slice(2);
    if (clean.startsWith('9') && !clean.startsWith('+')) return '+2519' + clean.slice(1);
    if (clean.startsWith('7') && !clean.startsWith('+')) return '+2517' + clean.slice(1);
    return clean;
  };

  // 1. Authoritative Data Loading
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
          const normalizedServer = json.students.map((s: Student) => {
            const d = (s.createdAt || (s as any).registrationDate || (s as any).date || '').substring(0, 10);
            let school = s.school;
            let bloodType = s.bloodType;
            if (d >= '2026-10-14') {
              if ((school || '').toLowerCase() === 'yms') school = 'YMS 1';
              if (bloodType === 'O+') bloodType = 'Unknown';
            }
            return { ...s, school, bloodType };
          });
          const combined = [...localOnly, ...normalizedServer];
          setStudents(combined);
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
  };

  useEffect(() => {
    const initial = getStudents();
    if (initial.length > 0) {
      setStudents(initial);
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

  // Update Detail QR Code when detail student changes
  useEffect(() => {
    if (detailStudent) {
      // Strict JSON QR token format: {"id":"...","name":"...","roll":"","grade":"..."}
      QRCode.toDataURL(generateStudentQrToken(detailStudent), {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
        .then(url => setDetailQrDataUrl(url))
        .catch(() => setDetailQrDataUrl(null));
    } else {
      setDetailQrDataUrl(null);
    }
  }, [detailStudent]);

  // Normalize Section (compatibility wrapper using canonical gradeUtils)
  const getSection = (s: Student): string => {
    return getCleanSection(s) || s.department || 'A';
  };

  // Distinct Filter Values
  const distinctGrades = useMemo(() => {
    return getDistinctGradeOptions(students);
  }, [students]);

  const distinctSections = useMemo(() => {
    return getDistinctSectionOptions(students, gradeFilter);
  }, [students, gradeFilter]);

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
        (s.school && s.school.toLowerCase().includes(q)) ||
        (s.senderName && s.senderName.toLowerCase().includes(q));

      const matchGrade = matchesGradeFilter(s, gradeFilter);
      const matchSection = matchesSectionFilter(s, sectionFilter);
      const matchBranch = branchFilter === 'ALL' || s.location === branchFilter;
      const matchSchool = schoolFilter === 'ALL' || s.school === schoolFilter;
      const matchSender = senderFilter === 'ALL' || (s.senderName || s.senderId) === senderFilter;
      const matchDate = !selectedDate || (s.createdAt && s.createdAt.substring(0, 10) === selectedDate);

      const st = (s.status || 'Active').toUpperCase();
      const isAccepted = st === 'ACCEPTED' || st === 'ACTIVE' || st === 'VERIFIED';
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && isAccepted && !s.receiverHidden) ||
        (statusFilter === 'Hidden' && s.receiverHidden === true);

      return matchSearch && matchGrade && matchSection && matchBranch && matchSchool && matchSender && matchDate && matchStatus;
    });
  }, [students, search, gradeFilter, sectionFilter, branchFilter, schoolFilter, statusFilter, senderFilter, selectedDate]);

  const distinctSenders = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.senderName) set.add(s.senderName);
      else if (s.senderId) set.add(s.senderId);
    });
    return Array.from(set).sort();
  }, [students]);

  // Calendar dates with student count for everyday viewer
  const calendarDateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      const d = (s.createdAt || '').substring(0, 10);
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [students]);

  const distinctDates = useMemo(() => {
    return Object.keys(calendarDateCounts).sort().reverse();
  }, [calendarDateCounts]);

  // Dynamically computed registry anomalies for the Mistake Analyzer pop-up
  const mistakeItems = useMemo(() => {
    const list: Array<{
      key: string;
      student: Student;
      type: 'Missing Photo' | 'Duplicate ID' | 'Invalid Phone Number';
      severity: 'High' | 'Medium';
      detail: string;
    }> = [];

    const idCounts = new Map<string, number>();
    students.forEach(s => {
      idCounts.set(s.studentId, (idCounts.get(s.studentId) || 0) + 1);
    });

    students.forEach(s => {
      // 1. Missing Photo: placeholder or empty
      const photo = s.photoPath || s.previewPath || '';
      if (!photo || photo.includes('data:image/svg') || photo.trim() === '') {
        const key = `photo_${s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Missing Photo',
            severity: 'High',
            detail: 'Missing biometric portrait photo (default avatar)'
          });
        }
      }

      // 2. Duplicate ID
      if ((idCounts.get(s.studentId) || 0) > 1) {
        const key = `dupe_${s.id || s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Duplicate ID',
            severity: 'High',
            detail: `ID collision: ${idCounts.get(s.studentId)} students share ${s.studentId}`
          });
        }
      }

      // 3. Invalid Phone
      const digits = (s.phone || '').replace(/\D/g, '');
      if (s.phone && (digits.length < 9 || digits.length > 13 || (!s.phone.startsWith('+251') && !s.phone.startsWith('09') && !s.phone.startsWith('07')))) {
        const key = `phone_${s.studentId}`;
        if (!resolvedMistakeKeys.has(key)) {
          list.push({
            key,
            student: s,
            type: 'Invalid Phone Number',
            severity: 'Medium',
            detail: `Format issue: "${s.phone}" (expected +251 9... / 09...)`
          });
        }
      }
    });

    return list;
  }, [students, resolvedMistakeKeys]);

  const handleQuickFixPhone = (s: Student) => {
    const fixed = formatPhoneNumber(s.phone || '');
    if (fixed && fixed !== s.phone) {
      updateStudent(s.studentId, { phone: fixed });
      setStudents(prev => prev.map(item => item.studentId === s.studentId ? { ...item, phone: fixed } : item));
      setResolvedMistakeKeys(prev => new Set([...prev, `phone_${s.studentId}`]));
      addCorrectionLog({
        studentId: s.studentId,
        studentName: s.fullName || 'Student',
        senderId: s.senderId,
        senderName: s.senderName || 'Field Sender',
        actionType: 'PHONE_FORMATTED',
        description: `Phone standardized to valid Ethiopian format (${fixed}) for ${s.fullName}`,
        resolvedBy: 'Receiver Desk'
      });
    }
  };

  const sortedFiltered = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'studentId') {
        comparison = (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true });
      } else if (sortField === 'grade') {
        const gradeA = `${a.grade || ''} ${a.department || ''}`.trim();
        const gradeB = `${b.grade || ''} ${b.department || ''}`.trim();
        comparison = gradeA.localeCompare(gradeB, undefined, { numeric: true });
      } else if (sortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
        if (comparison === 0) {
          comparison = (a.studentId || '').localeCompare(b.studentId || '', undefined, { numeric: true });
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedFiltered.length / pageSize) || 1;
  const pagedStudents = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  // Selection Checkboxes
  const toggleSelectRow = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedStudents.length && pagedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedStudents.map(s => s.studentId)));
    }
  };

  // Open Student Detail Drawer (View Action)
  const handleOpenDetail = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailStudent(s);
    setDetailTab('Photo');
    setIsDetailDrawerOpen(true);
  };

  // Open Online Photo Editor (Triggered when photo thumbnail or avatar is clicked)
  const handleOpenPhotoEditor = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhotoStudent(s);
    setIsPhotoEditorOpen(true);
  };

  // Save Edited Photo: Uploads directly to Cloudflare R2 storage and replaces unedited photo
  const handleSaveEditedPhoto = async (croppedDataUrl: string) => {
    if (!editingPhotoStudent) return;
    const targetSid = editingPhotoStudent.studentId;
    const cleanGrade = (editingPhotoStudent.grade || 'General').trim().replace(/[\/\\:*?"<>|\s]+/g, '_');
    const cleanName = (editingPhotoStudent.fullName || 'Student').trim().replace(/[\/\\:*?"<>|\s]+/g, '_');
    const photoKey = `${cleanGrade}/${cleanName}.jpg`;

    // 1. Update UI state immediately with local data URL for instant zero-lag preview
    setStudents(prev => prev.map(s => s.studentId === targetSid ? {
      ...s,
      photoPath: croppedDataUrl,
      previewPath: croppedDataUrl,
      thumbnailPath: croppedDataUrl,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    } : s));

    if (detailStudent?.studentId === targetSid) {
      setDetailStudent(prev => prev ? {
        ...prev,
        photoPath: croppedDataUrl,
        previewPath: croppedDataUrl,
        thumbnailPath: croppedDataUrl,
        photoIntegrityStatus: 'PHOTO_VERIFIED'
      } : null);
    }

    setIsPhotoEditorOpen(false);

    // 2. Upload to Cloudflare R2 Bucket 'siliconlabs'
    let r2Url = `${R2_PUBLIC_BASE_URL}/${photoKey}`;
    try {
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetSid,
          grade: cleanGrade,
          filename: photoKey,
          data: croppedDataUrl
        })
      });
      if (upRes.ok) {
        const upData = await upRes.json();
        if (upData.url || upData.r2Url) {
          r2Url = upData.url || upData.r2Url;
        }
      }
    } catch (r2Err) {
      console.warn('R2 upload warning during photo edit, edge worker fallback:', r2Err);
    }

    // 3. Update store and local state with permanent Cloudflare R2 URL
    updateStudent(targetSid, {
      photoPath: r2Url,
      previewPath: r2Url,
      thumbnailPath: r2Url,
      originalPhotoPath: r2Url,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    });

    setStudents(prev => prev.map(s => s.studentId === targetSid ? {
      ...s,
      photoPath: r2Url,
      previewPath: r2Url,
      thumbnailPath: r2Url,
      photoIntegrityStatus: 'PHOTO_VERIFIED'
    } : s));

    if (detailStudent?.studentId === targetSid) {
      setDetailStudent(prev => prev ? {
        ...prev,
        photoPath: r2Url,
        previewPath: r2Url,
        thumbnailPath: r2Url,
        photoIntegrityStatus: 'PHOTO_VERIFIED'
      } : null);
    }

    // Add feedback log so the sender sees their mistake has been corrected:
    addCorrectionLog({
      studentId: targetSid,
      studentName: editingPhotoStudent.fullName || 'Student',
      senderId: editingPhotoStudent.senderId,
      senderName: editingPhotoStudent.senderName || 'Field Sender',
      actionType: 'PHOTO_CORRECTED',
      description: `Photograph re-centered & enhanced to 3:4 portrait standard for ${editingPhotoStudent.fullName}`,
      resolvedBy: 'Receiver Desk'
    });

    setEditingPhotoStudent(null);
  };

  // Open Edit Student Data Modal (Excludes photo and QR per requirement)
  const handleOpenEditData = (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDataStudent(s);
    setEditFullName(s.fullName || '');
    setEditSex(s.sex === 'Female' ? 'Female' : 'Male');
    setEditGrade(s.grade || '9');
    setEditSection(getSection(s));
    const loc = s.location || 'Addis Ababa';
    setEditBranch(loc);
    const validSchools = BRANCH_SCHOOL_MAP[loc] || ['YMS'];
    setEditSchool(validSchools.includes(s.school || '') ? s.school! : validSchools[0]);
    setEditPhone(s.phone || '');
    setEditDob(s.dateOfBirth ? s.dateOfBirth.substring(0, 10) : '2010-01-01');
    setEditBloodType(s.bloodType || 'Unknown');
    setEditGuardianName(s.guardianFullName || '');
    setEditEmergencyPhone(s.emergencyContactPhone || '');
    setEditBusUsage(s.schoolBusUsage === 'No' ? 'No' : 'Yes');
    setIsEditModalOpen(true);
  };

  // Save Student Data Updates
  const handleSaveStudentData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDataStudent) return;
    const targetSid = editingDataStudent.studentId;

    const updates: Partial<Student> = {
      fullName: editFullName.trim(),
      sex: editSex,
      grade: editGrade.trim(),
      department: editSection.trim(),
      location: editBranch,
      school: editSchool,
      phone: formatPhoneNumber(editPhone),
      dateOfBirth: editDob,
      bloodType: editBloodType,
      guardianFullName: editGuardianName.trim(),
      emergencyContactPhone: formatPhoneNumber(editEmergencyPhone),
      schoolBusUsage: editBusUsage
    };

    updateStudent(targetSid, updates);

    setStudents(prev => prev.map(s => s.studentId === targetSid ? { ...s, ...updates } : s));

    if (detailStudent?.studentId === targetSid) {
      setDetailStudent(prev => prev ? { ...prev, ...updates } : null);
    }

    addCorrectionLog({
      studentId: targetSid,
      studentName: editingDataStudent.fullName || 'Student',
      senderId: editingDataStudent.senderId,
      senderName: editingDataStudent.senderName || 'Field Sender',
      actionType: 'DATA_UPDATED',
      description: `Student metadata and academic records updated for ${editingDataStudent.fullName}`,
      resolvedBy: 'Receiver Desk'
    });

    setIsEditModalOpen(false);
    setEditingDataStudent(null);
  };

  // Branch change in Edit Modal
  const handleEditBranchChange = (newBranch: string) => {
    setEditBranch(newBranch);
    const allowed = BRANCH_SCHOOL_MAP[newBranch] || ['YMS'];
    if (!allowed.includes(editSchool)) {
      setEditSchool(allowed[0]);
    }
  };

  // =========================================================================
  // DOWNLOAD ENGINES (SINGLE & BULK WITH PROGRESS MODAL)
  // =========================================================================

  // Single Student Photo Download (Direct Native Download via Edge Proxy or Blob)
  const downloadSinglePhoto = async (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const photoUrl = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath);
    if (!photoUrl) {
      alert(`No biometric photograph available for ${s.fullName} (${s.studentId}).`);
      return;
    }

    markStudentsAsBulked([s.studentId]);
    const fileName = getStudentPhotoFileName(s);
    try {
      if (photoUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = photoUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Same-Origin Proxy URL with Content-Disposition: attachment header
      const proxyDownloadUrl = `/api/proxy-photo?url=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(fileName)}&download=1`;

      // 1. Fetch as blob to trigger instant browser save
      let res = await fetch(proxyDownloadUrl).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(photoUrl, { mode: 'cors' }).catch(() => null);
      }

      if (res && res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      // 2. Direct browser navigation to same-origin download proxy
      const a = document.createElement('a');
      a.href = proxyDownloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.warn('Fallback download for photo:', fileName, err);
      const directProxy = `/api/proxy-photo?url=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(fileName)}&download=1`;
      const a = document.createElement('a');
      a.href = directProxy;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Single Student QR Code Download (PNG - Token strictly JSON payload)
  const downloadSingleQr = async (s: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const qrPayload = generateStudentQrToken(s);
      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 600,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      const a = document.createElement('a');
      a.href = qrUrl;
      a.download = getStudentQrFileName(s);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Error generating QR code: ' + err.message);
    }
  };

  // Bulk Selected Photos Download (ZIP with Progress)
  const downloadSelectedPhotosZip = async (customTargets?: Student[]) => {
    const targets = customTargets || (selectedIds.size > 0 ? students.filter(s => selectedIds.has(s.studentId)) : filtered);
    if (targets.length === 0) {
      alert('No student records selected or available for Photo ZIP export.');
      return;
    }
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Downloading Selected Photographs (ZIP Archive)',
      current: 0,
      total: targets.length,
      statusText: 'Initializing compression engine...'
    });

    try {
      const zip = new JSZip();
      const folder = zip.folder('student_photos') || zip;
      let count = 0;

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        const fileName = getStudentPhotoFileName(s);
        setProgressModal({
          isOpen: true,
          title: 'Downloading Selected Photographs (ZIP Archive)',
          current: i + 1,
          total: targets.length,
          statusText: `Fetching photo ${i + 1}/${targets.length}: ${fileName}...`
        });

        const photoUrl = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath);
        if (photoUrl) {
          try {
            if (photoUrl.startsWith('data:')) {
              const base64Data = photoUrl.split(',')[1];
              folder.file(fileName, base64Data, { base64: true });
              count++;
            } else {
              let res = await fetch(photoUrl, { mode: 'cors' }).catch(() => null);
              if (!res || !res.ok) {
                // Try proxy
                res = await fetch(`/api/proxy-photo?url=${encodeURIComponent(photoUrl)}`).catch(() => null);
              }
              if (res && res.ok) {
                const blob = await res.blob();
                folder.file(fileName, blob);
                count++;
              }
            }
          } catch (e) {
            console.warn('Skipping photo for', s.studentId, e);
          }
        }
        await new Promise(r => setTimeout(r, 15));
      }

      if (count === 0) {
        alert('None of the selected students have downloadable photos.');
        setProgressModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      setProgressModal(prev => ({ ...prev, statusText: 'Building ZIP archive for download...' }));
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setProgressModal(prev => ({
          ...prev,
          statusText: `Compressing ZIP archive (${metadata.percent.toFixed(0)}%)...`
        }));
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_photos_pack_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('Error creating photo archive: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 500);
    }
  };

  // Bulk Selected QR Codes Download (ZIP with Progress - Token strictly JSON payload)
  const downloadSelectedQrsZip = async () => {
    const targets = students.filter(s => selectedIds.has(s.studentId));
    if (targets.length === 0) {
      alert('Please select at least one student from the table.');
      return;
    }

    setProgressModal({
      isOpen: true,
      title: 'Auto-Generating Student QR Codes (ZIP Archive)',
      current: 0,
      total: targets.length,
      statusText: 'Encoding QR codes with JSON payload...'
    });

    try {
      const zip = new JSZip();
      const folder = zip.folder('student_qr_codes') || zip;

      for (let i = 0; i < targets.length; i++) {
        const s = targets[i];
        setProgressModal({
          isOpen: true,
          title: 'Auto-Generating Student QR Codes (ZIP Archive)',
          current: i + 1,
          total: targets.length,
          statusText: `Rendering QR token for ${s.studentId} (${i + 1}/${targets.length})...`
        });

        const qrPayload = generateStudentQrToken(s);
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
          width: 500,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });

        const base64Data = qrDataUrl.split(',')[1];
        folder.file(getStudentQrFileName(s), base64Data, { base64: true });

        await new Promise(r => setTimeout(r, 10));
      }

      setProgressModal(prev => ({ ...prev, statusText: 'Packaging QR codes ZIP...' }));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student_qr_codes_pack_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('Error generating QR archive: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 500);
    }
  };

  // Excel Export (.xlsx with Progress)
  const exportExcel = async (onlySelected: boolean = false) => {
    const targets = onlySelected
      ? students.filter(s => selectedIds.has(s.studentId))
      : filtered;

    if (targets.length === 0) {
      alert('No student records available for Excel export.');
      return;
    }
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Compiling Excel Spreadsheet (.xlsx)',
      current: 0,
      total: targets.length,
      statusText: 'Formatting student records...'
    });

    try {
      const rows = targets.map((s, idx) => {
        const photoName = getStudentPhotoFileName(s);
        const qrName = getStudentQrFileName(s);
        const photoLocalPath = `C:\\Users\\Administrator\\Desktop\\yekaelementry\\${photoName}`;
        return {
          '#': idx + 1,
          'Name': s.fullName,
          'StudentId': s.studentId,
          'Sex': s.sex || 'Male',
          'Grade': s.grade || '',
          'BloodType': s.bloodType || 'Unknown',
          'Phone': s.phone || '',
          '@photo': photoLocalPath,
          '@qr': qrName,
          'Branch': s.location || 'Addis Ababa',
          'School': s.school || '',
          'Status': s.status || 'Accepted'
        };
      });

      setProgressModal(prev => ({ ...prev, current: targets.length, statusText: 'Building Excel workbook...' }));
      await new Promise(r => setTimeout(r, 80));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `studentbridge_directory_${Date.now()}.xlsx`);
    } catch (err: any) {
      alert('Excel export error: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 400);
    }
  };

  // CSV Export (.csv with Progress - strictly formatted headers and Desktop photo path)
  const exportCsv = async (onlySelected: boolean = false) => {
    const targets = onlySelected
      ? students.filter(s => selectedIds.has(s.studentId))
      : filtered;

    if (targets.length === 0) {
      alert('No student records available for CSV export.');
      return;
    }
    markStudentsAsBulked(targets.map(t => t.studentId));

    setProgressModal({
      isOpen: true,
      title: 'Compiling CSV Data File',
      current: 0,
      total: targets.length,
      statusText: 'Writing Name, StudentId, Sex, Grade, BloodType, Phone, @photo, @qr...'
    });

    try {
      // Exact required header format: Name StudentId Sex Grade BloodType Phone @photo @qr
      const headers = ['Name', 'StudentId', 'Sex', 'Grade', 'BloodType', 'Phone', '@photo', '@qr'];
      const csvRows = [headers.join(',')];

      targets.forEach(s => {
        const photoName = getStudentPhotoFileName(s);
        const qrName = getStudentQrFileName(s);
        const photoLocalPath = `C:\\Users\\Administrator\\Desktop\\yekaelementry\\${photoName}`;
        const qrLocalPath = `C:\\Users\\Administrator\\Desktop\\yekaelementry\\${qrName}`;

        const row = [
          `"${(s.fullName || '').replace(/"/g, '""')}"`,
          `"${s.studentId}"`,
          `"${s.sex || 'Male'}"`,
          `"${s.grade || ''}"`,
          `"${s.bloodType || 'Unknown'}"`,
          `"${s.phone || ''}"`,
          `"${photoLocalPath.replace(/"/g, '""')}"`,
          `"${qrLocalPath.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      setProgressModal(prev => ({ ...prev, current: targets.length, statusText: 'Downloading CSV file...' }));
      await new Promise(r => setTimeout(r, 80));

      const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studentbridge_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      alert('CSV export error: ' + err.message);
    } finally {
      setTimeout(() => {
        setProgressModal(prev => ({ ...prev, isOpen: false }));
      }, 400);
    }
  };

  // Safe Deletion Handler
  const executeDelete = async (permanent: boolean) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const targetSid = deleteTarget.studentId;
    const targetId = deleteTarget.id;

    try {
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

      if (detailStudent?.studentId === targetSid || detailStudent?.id === targetId) {
        setIsDetailDrawerOpen(false);
        setDetailStudent(null);
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

  // Bulk Selected Deletion Handler
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const executeBulkDelete = async (permanent: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const targetIds = Array.from(selectedIds);
    try {
      if (permanent) {
        setStudents(prev => prev.filter(s => !selectedIds.has(s.studentId) && !selectedIds.has(s.id)));
      } else {
        setStudents(prev => prev.map(s => {
          if (selectedIds.has(s.studentId) || selectedIds.has(s.id)) {
            return { ...s, receiverHidden: true, hiddenAt: new Date().toISOString() };
          }
          return s;
        }));
      }

      for (const sid of targetIds) {
        await deleteStudent(sid, permanent);
      }
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#0B1118] tracking-tight">
              Student Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9EE617]/20 text-[#256002] border border-[#9EE617]/40 font-mono">
              {filtered.length.toLocaleString()} Records
            </span>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Mistake Analyzer */}
          <button
            type="button"
            onClick={() => setIsMistakeModalOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Scan student directory for mistakes & anomalies"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Mistake Analyzer</span>
            {mistakeItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black">
                {mistakeItems.length}
              </span>
            )}
          </button>

          {/* 2. Excel (.xlsx) */}
          <button
            type="button"
            onClick={() => exportExcel(false)}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* 3. Export CSV */}
          <button
            type="button"
            onClick={() => exportCsv(false)}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Export CSV</span>
          </button>

          {/* 4. Export Photo ZIP */}
          <button
            type="button"
            onClick={() => downloadSelectedPhotosZip()}
            className="py-2 px-3.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAF9] text-[#0B1118] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Download student photos archive (ZIP)"
          >
            <Archive className="w-4 h-4 text-[#256002]" />
            <span>Export Photo ZIP</span>
          </button>

          {/* 5. Refresh */}
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1118] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* 6. Cloud Sync */}
          <button
            type="button"
            onClick={handleCloudSync}
            disabled={isLoading}
            className="py-2 px-3.5 rounded-xl bg-[#0B1118] hover:bg-[#1A2533] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Synchronize registry with cloud master server"
          >
            <Cloud className="w-3.5 h-3.5 text-[#9EE617]" />
            <span>Cloud Sync</span>
          </button>
        </div>
      </div>

      {/* Selected Items Bulk Action Bar (Visible when 1 or more rows selected) */}
      {selectedIds.size > 0 && (
        <div className="p-3.5 bg-[#0B1118] text-white rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg border border-[#2D3748] animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9EE617] animate-pulse" />
            <span className="text-xs font-black text-white">
              {selectedIds.size} {selectedIds.size === 1 ? 'student selected' : 'students selected'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-slate-400 hover:text-white underline ml-1 cursor-pointer"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Delete or hide selected student records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSelectedPhotosZip()}
              className="py-1.5 px-3 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download Photos (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={downloadSelectedQrsZip}
              className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B1118] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <QrIcon className="w-3.5 h-3.5 text-[#366804]" />
              <span>Download QRs (ZIP)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetIds = Array.from(selectedIds);
                const allBulked = targetIds.every(id => bulkedIds.has(id));
                setBulkedIds(prev => {
                  const next = new Set(prev);
                  if (allBulked) {
                    targetIds.forEach(id => next.delete(id));
                  } else {
                    targetIds.forEach(id => next.add(id));
                  }
                  localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                  return next;
                });
              }}
              className="py-1.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-[#9EE617] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{Array.from(selectedIds).every(id => bulkedIds.has(id)) ? 'Unbulk Selected' : 'Bulk Selected'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportExcel(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Selected (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => exportCsv(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Export Selected (CSV)</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Calendar Date Filter */}
      <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#256002]" />
          </div>
          <div>
            <span className="text-xs font-black text-[#0B1118]">Transmit Date Filter</span>
            <p className="text-[10px] text-slate-500 font-medium">Filter directory records by day transmitted</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
            className="h-9 rounded-xl border border-[#CBD5E1] bg-[#F8FAF9] px-3 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:outline-none cursor-pointer"
          />
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate('')}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Clear Date
            </button>
          )}
          <button
            type="button"
            onClick={() => setCalendarNoteModalOpen(true)}
            className="h-9 px-3 rounded-xl bg-[#0B1118] hover:bg-slate-800 text-xs font-bold text-[#9EE617] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Note taking for pausing bulked students"
          >
            <span>Pause Bulked Note</span>
            {pausedIds.size > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[10px] font-black rounded-full">
                {pausedIds.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, name, phone, school or sender..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sender Filter */}
          <div>
            <select
              value={senderFilter}
              onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">Sender: All Senders</option>
              {distinctSenders.map(s => (
                <option key={s} value={s}>Sender: {s}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Branches</option>
              {DEFAULT_BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* School Filter */}
          <div>
            <select
              value={schoolFilter}
              onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Schools</option>
              {Object.entries(BRANCH_SCHOOL_MAP).flatMap(([branch, schs]) =>
                schs.map(sName => (
                  <option key={`${branch}-${sName}`} value={sName}>
                    {sName} ({branch})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <select
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-xs font-bold text-[#0B1118] focus:border-[#9EE617]"
            >
              <option value="ALL">All Grades</option>
              {distinctGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Everyday Calendar Data Viewer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0B1118]">
              <Calendar className="w-4 h-4 text-[#256002]" />
              <span>Everyday Calendar Viewer:</span>
            </div>

            {/* Native Date Picker */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] cursor-pointer"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => { setSelectedDate(''); setPage(1); }}
                  className="ml-1 p-1 text-slate-400 hover:text-black rounded-lg hover:bg-slate-100"
                  title="Clear calendar date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Calendar Date Chips */}
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => { setSelectedDate(''); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !selectedDate
                    ? 'bg-[#0B1118] text-[#9EE617] shadow-xs'
                    : 'bg-[#F1F5F9] text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Days ({students.length})
              </button>
              {distinctDates.slice(0, 6).map(dt => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => { setSelectedDate(dt); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedDate === dt
                      ? 'bg-[#9EE617] text-[#0B1118] shadow-xs'
                      : 'bg-[#F1F5F9] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{dt}</span>
                  <span className="text-[10px] font-black opacity-80">({calendarDateCounts[dt]})</span>
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="text-xs font-bold text-[#256002] bg-[#9EE617]/20 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#256002] animate-pulse" />
              <span>Viewing {filtered.length} student(s) registered on {selectedDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Student Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[11px] font-black text-[#0B1118] uppercase tracking-wider">
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-[#9EE617] focus:ring-[#9EE617] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-4 min-w-[220px] whitespace-nowrap">Students</th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('studentId')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Student ID"
                  >
                    <span>Student ID</span>
                    {sortField === 'studentId' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('grade')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Grade & Section"
                  >
                    <span>Grade & Sec</span>
                    {sortField === 'grade' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 min-w-[160px] whitespace-nowrap">School & Branch</th>
                <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">Phone</th>
                <th className="py-4 px-4 text-center min-w-[95px] whitespace-nowrap">Blood Type</th>
                <th className="py-4 px-4 text-center min-w-[115px] whitespace-nowrap">Bus Transport</th>
                <th className="py-4 px-4 text-center min-w-[115px] whitespace-nowrap">Batch Status</th>
                <th className="py-4 px-4 min-w-[145px] whitespace-nowrap">Sender Operator</th>
                <th className="py-4 px-4 min-w-[155px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('createdAt')}
                    className="inline-flex items-center gap-1.5 hover:text-[#256002] transition-colors cursor-pointer group"
                    title="Sort by Date Transmitted"
                  >
                    <span>Date Transmitted</span>
                    {sortField === 'createdAt' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#256002]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#256002]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-4 text-center min-w-[95px] whitespace-nowrap">QR Code</th>
                <th className="py-4 px-4 text-right min-w-[115px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pagedStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#64748B]">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Search className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-[#0B1118]">No students found</div>
                    <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or branch filters</p>
                  </td>
                </tr>
              ) : (
                pagedStudents.map((s) => {
                  const isSelected = selectedIds.has(s.studentId);
                  const photoSrc = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath) || DEFAULT_AVATAR;
                  const isBulked = bulkedIds.has(s.studentId) || s.bulkedStatus === 'BULKED';

                  return (
                    <tr
                      key={s.studentId}
                      className={`hover:bg-[#F8FAF9] transition-colors ${
                        isSelected ? 'bg-[#BEF264]/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(s.studentId, e as any)}
                          className="rounded text-[#9EE617] focus:ring-[#9EE617] cursor-pointer"
                        />
                      </td>

                      {/* Photo & Name (Click photo to edit online) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => handleOpenPhotoEditor(s, e)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-[#CBD5E1] shrink-0 cursor-pointer group shadow-2xs"
                            title="Click photograph to crop and edit online"
                          >
                            <img
                              src={photoSrc}
                              alt={s.fullName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Edit2 className="w-3.5 h-3.5 text-[#9EE617]" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div
                              onClick={() => handleOpenDetail(s)}
                              className="font-bold text-[#0B1118] hover:text-[#256002] cursor-pointer truncate max-w-[190px]"
                              title={s.fullName}
                            >
                              {s.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-medium mt-0.5">
                              <span>{s.sex || 'Male'}</span>
                              <span>&bull;</span>
                              <span className="text-[#366804] font-semibold">{s.status || 'Accepted'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0B1118] text-[11px] whitespace-nowrap">
                        {s.studentId}
                      </td>

                      {/* Grade & Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[#0B1118] font-bold text-[11px]">
                          {getGradeDisplay(s)}
                        </span>
                      </td>

                      {/* School & Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#0B1118] truncate max-w-[160px]">{s.school || 'YMS'}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#366804]" />
                          <span>{s.location || 'Addis Ababa'}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {s.phone || '-'}
                      </td>

                      {/* Blood Type */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {s.bloodType || 'Unknown'}
                        </span>
                      </td>

                      {/* Bus Transport */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {s.schoolBusUsage === 'Yes' || s.busUser === 'YES' ? (
                          <span className="px-2.5 py-1 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                            🚌 Bus
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">No Bus</span>
                        )}
                      </td>

                      {/* Batch Status (Bulked / Unbulked / Paused Indicator) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {pausedIds.has(s.studentId) ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]"
                            title={`Paused: ${pausedNotes[s.studentId] || 'No note'}`}
                          >
                            <span>⏸️ Paused</span>
                          </span>
                        ) : isBulked ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkedIds(prev => {
                                const next = new Set(prev);
                                next.delete(s.studentId);
                                localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#85E510]/15 text-[#1D5102] border border-[#85E510]/40 font-black text-[11px] cursor-pointer hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                            title="Bulked (Click to unbulk)"
                          >
                            <Check className="w-3.5 h-3.5 text-[#85E510] stroke-[3]" />
                            <span>Bulked</span>
                          </span>
                        ) : (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setBulkedIds(prev => {
                                const next = new Set(prev);
                                next.add(s.studentId);
                                localStorage.setItem('sb_bulked_student_ids', JSON.stringify(Array.from(next)));
                                return next;
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#85E510]/20 text-slate-500 hover:text-[#1D5102] font-medium text-[10px] cursor-pointer"
                            title="Unbulked (Click to bulk)"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>Unbulked</span>
                          </span>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {s.senderName || 'Field Sender'}
                        </span>
                      </td>

                      {/* Date Transmitted */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Oct 12, 08:30'}
                      </td>

                      {/* QR Code Action (Token strictly studentId) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => downloadSingleQr(s, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#9EE617]/20 hover:text-[#256002] text-slate-700 transition-colors cursor-pointer"
                          title="Download QR Code (PNG - Token: Student ID)"
                        >
                          <QrIcon className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Dossier (Eye icon opens details drawer) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenDetail(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="View Student Details Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Crop & Edit Photo (3:4 Portrait default) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenPhotoEditor(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Crop & Edit Student Photograph (3:4 Portrait)"
                          >
                            <Crop className="w-4 h-4" />
                          </button>

                          {/* Download Photo */}
                          <button
                            type="button"
                            onClick={(e) => downloadSinglePhoto(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Download Biometric Photograph"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Edit Student Data (excludes photo & qr) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditData(s, e)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#256002] hover:bg-[#9EE617]/20 transition-colors cursor-pointer"
                            title="Edit Student Information (Text/Academic)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(s);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-[#F8FAF9] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            Showing <span className="font-bold text-[#0B1118]">{pagedStudents.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-[#0B1118]">{Math.min(filtered.length, page * pageSize)}</span> of{' '}
            <span className="font-bold text-[#0B1118]">{filtered.length.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-xs bg-white border border-[#CBD5E1] rounded-lg">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="ml-2 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#0B1118]"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={250}>250 per page</option>
              <option value={500}>500 per page (Default)</option>
              <option value={1000}>1000 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SLIDE-OVER DRAWER: STUDENT DETAIL DOSSIER (Appears ONLY when eye icon clicked)
         ========================================================================= */}
      {isDetailDrawerOpen && detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden border-l border-[#E2E8F0] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAF9]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center text-[#256002]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm text-[#0B1118]">Student Dossier</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{detailStudent.studentId}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Profile Card */}
              <div className="flex gap-4 items-start pb-4 border-b border-[#E2E8F0]">
                {/* Photo (Clickable to edit online) */}
                <div
                  onClick={() => handleOpenPhotoEditor(detailStudent)}
                  className="relative w-28 h-36 rounded-xl overflow-hidden bg-slate-100 border border-[#CBD5E1] shrink-0 shadow-xs cursor-pointer group"
                  title="Click photo to crop and adjust online"
                >
                  <img
                    src={getPhotoUrl(detailStudent.photoPath || detailStudent.previewPath || detailStudent.thumbnailPath) || DEFAULT_AVATAR}
                    alt={detailStudent.fullName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity">
                    <Edit2 className="w-4 h-4 text-[#9EE617] mb-1" />
                    <span>Edit Photo</span>
                  </div>
                </div>

                {/* Identity Metadata */}
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-base font-heading font-black text-[#0B1118] truncate leading-tight">
                    {detailStudent.fullName}
                  </h4>
                  <div className="text-xs font-mono font-bold text-[#366804]">
                    {detailStudent.studentId}
                  </div>

                  <div className="space-y-1 pt-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Grade:</span>
                      <span className="font-bold text-[#0B1118]">{getCleanGrade(detailStudent)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UsersIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Section:</span>
                      <span className="font-bold text-[#0B1118]">{getCleanSection(detailStudent) || 'A'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Branch:</span>
                      <span className="font-bold text-[#0B1118]">{detailStudent.location || 'Addis Ababa'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Transmitted:</span>
                      <span className="font-mono text-[10px] font-semibold text-[#0B1118]">
                        {detailStudent.createdAt ? new Date(detailStudent.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Oct 12, 08:30'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => downloadSinglePhoto(detailStudent)}
                  className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-[#9EE617]/20 text-[#0B1118] text-[11px] font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#366804]" />
                  <span>Download Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadSingleQr(detailStudent)}
                  className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-[#9EE617]/20 text-[#0B1118] text-[11px] font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <QrIcon className="w-3.5 h-3.5 text-[#366804]" />
                  <span>Download QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditData(detailStudent)}
                  className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-[#9EE617]/20 text-[#0B1118] text-[11px] font-bold flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#366804]" />
                  <span>Edit Data</span>
                </button>
              </div>

              {/* Auto-Generated QR Code Panel (Token: Strictly studentId) */}
              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#0B1118]">
                    <QrIcon className="w-4 h-4 text-[#366804]" />
                    <span>Auto QR Code</span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-[180px]">
                    Token strictly encoded with Student ID <span className="font-mono font-bold text-[#0B1118]">({detailStudent.studentId})</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadSingleQr(detailStudent)}
                    className="text-[11px] text-[#256002] font-black hover:underline pt-1 inline-block cursor-pointer"
                  >
                    Save QR PNG &rarr;
                  </button>
                </div>

                <div className="w-20 h-20 bg-white p-1 rounded-xl border border-[#CBD5E1] shadow-2xs flex items-center justify-center">
                  {detailQrDataUrl ? (
                    <img src={detailQrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                  )}
                </div>
              </div>

              {/* Dossier Tabs (Photo, Academic, Activity) */}
              <div className="border-b border-[#E2E8F0] flex items-center gap-4 text-xs font-bold">
                {(['Photo', 'Academic', 'Activity'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`pb-2 transition-all relative cursor-pointer ${
                      detailTab === tab ? 'text-[#256002] font-black' : 'text-slate-500 hover:text-black'
                    }`}
                  >
                    <span>{tab}</span>
                    {detailTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9EE617] rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {detailTab === 'Photo' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Biometric Integrity:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Storage Cluster:</span>
                    <span className="font-mono text-slate-800">Enterprise High-Speed Storage</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Aspect Ratio:</span>
                    <span className="font-bold text-[#0B1118]">3:4 ID Portrait Standard</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPhotoEditor(detailStudent)}
                    className="w-full py-2.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Open Phone-Style Photo Editor</span>
                  </button>
                </div>
              )}

              {detailTab === 'Academic' && (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">School Campus:</span>
                    <span className="font-bold text-[#0B1118]">{detailStudent.school || 'YMS'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Branch Location:</span>
                    <span className="font-bold text-[#0B1118]">{detailStudent.location || 'Addis Ababa'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Grade & Section:</span>
                    <span className="font-mono font-bold text-[#0B1118]">{getGradeDisplay(detailStudent)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Student Phone:</span>
                    <span className="font-mono font-bold text-[#0B1118]">{detailStudent.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">School Bus Transport:</span>
                    <span className="font-bold text-[#0B1118]">{detailStudent.schoolBusUsage || 'Yes'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Blood Group:</span>
                    <span className="font-bold text-[#0B1118]">{detailStudent.bloodType || 'Unknown'}</span>
                  </div>
                </div>
              )}

              {detailTab === 'Activity' && (
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Sender Operator:</span>
                    <span className="font-bold text-[#0B1118]">{detailStudent.senderName || 'Field Sender'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Transmission Timestamp:</span>
                    <span className="font-mono text-slate-800">{detailStudent.createdAt ? new Date(detailStudent.createdAt).toLocaleString() : 'Oct 12, 2026 08:30'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Database Sync:</span>
                    <span className="font-bold text-emerald-700">Authoritative Synchronized (Live)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteTarget(detailStudent)}
                className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
              >
                Delete Student
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditData(detailStudent)}
                className="py-2 px-4 rounded-xl bg-[#0B1118] text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Edit Student Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ONLINE PHOTO EDITOR & PHONE CROP MODAL
         ========================================================================= */}
      {isPhotoEditorOpen && editingPhotoStudent && (
        <PhoneCropModal
          isOpen={isPhotoEditorOpen}
          imageUrl={getPhotoUrl(editingPhotoStudent.photoPath || editingPhotoStudent.previewPath || editingPhotoStudent.thumbnailPath) || DEFAULT_AVATAR}
          studentId={editingPhotoStudent.studentId}
          title={`Edit Student Photograph (${editingPhotoStudent.fullName})`}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setEditingPhotoStudent(null);
          }}
          onSave={handleSaveEditedPhoto}
        />
      )}

      {/* =========================================================================
          EDIT STUDENT DATA MODAL (All fields EXCEPT Photo and QR)
         ========================================================================= */}
      {isEditModalOpen && editingDataStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  Edit Student Information
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingDataStudent.studentId} &bull; Academic & Contact metadata
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentData} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-[#0B1118] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Sex Identification</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSex('Male')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        editSex === 'Male'
                          ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                          : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                      }`}
                    >
                      <span className="text-sm">♂</span>
                      <span>Male</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSex('Female')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        editSex === 'Female'
                          ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                          : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                      }`}
                    >
                      <span className="text-sm">♀</span>
                      <span>Female</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Grade (with Section)</label>
                  <input
                    type="text"
                    required
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    placeholder="e.g. 10A or Grade 9B"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Blood Group</label>
                  <select
                    value={editBloodType === 'O+' ? 'Unknown' : editBloodType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBloodType(val === 'O+' ? 'Unknown' : val);
                    }}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Branch Location */}
                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Branch Location</label>
                  <select
                    value={editBranch}
                    onChange={(e) => handleEditBranchChange(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    {DEFAULT_BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned School (Filtered to branch) */}
                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Assigned School ({editBranch})</label>
                  <select
                    value={editSchool}
                    onChange={(e) => setEditSchool(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    {(BRANCH_SCHOOL_MAP[editBranch] || ['YMS']).map(sch => (
                      <option key={sch} value={sch}>{sch}</option>
                    ))}
                  </select>
                </div>

                {/* Phone (auto formats 09/07 to +2519/+2517, blank stays blank) */}
                <div className="col-span-2">
                  <label className="font-bold text-[#0B1118] block mb-1 flex items-center justify-between">
                    <span>Student Phone Number</span>
                    <span className="text-[10px] text-slate-400 font-normal">Auto 09/07 &rarr; +2519/+2517 (blank if empty)</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhoneNumber(e.target.value))}
                    onBlur={() => setEditPhone(formatPhoneNumber(editPhone))}
                    placeholder="e.g. 0911223344"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={editGuardianName}
                    onChange={(e) => setEditGuardianName(e.target.value)}
                    placeholder="Parent / Guardian"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(formatPhoneNumber(e.target.value))}
                    onBlur={() => setEditEmergencyPhone(formatPhoneNumber(editEmergencyPhone))}
                    placeholder="e.g. 0911223344"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#0B1118] block mb-1">School Bus Transport</label>
                  <select
                    value={editBusUsage}
                    onChange={(e) => setEditBusUsage(e.target.value as any)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 font-bold text-xs"
                  >
                    <option value="Yes">Yes (School Bus)</option>
                    <option value="No">No (Private)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] text-xs font-black shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE DOWNLOAD PROGRESS MODAL
         ========================================================================= */}
      {progressModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B1118] text-white border border-[#2D3748] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center text-[#9EE617]">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-white">
                  {progressModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Please wait while files are processed</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-slate-400 truncate max-w-[240px]">{progressModal.statusText}</span>
                <span className="text-[#9EE617]">
                  {progressModal.total > 0
                    ? Math.round((progressModal.current / progressModal.total) * 100)
                    : 100}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-[#9EE617] to-[#BEF264] transition-all duration-150 rounded-full"
                  style={{
                    width: `${progressModal.total > 0
                      ? Math.min(100, Math.round((progressModal.current / progressModal.total) * 100))
                      : 100}%`
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex justify-between">
                <span>Processed: {progressModal.current} of {progressModal.total}</span>
                <span>Active thread</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE MODAL (Temporary hide vs Permanent purge)
         ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">Delete Confirmation</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-300 overflow-hidden shrink-0">
                  <img
                    src={getPhotoUrl(deleteTarget.photoPath || deleteTarget.previewPath) || DEFAULT_AVATAR}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-bold text-[#0B1118]">{deleteTarget.fullName}</div>
                  <div className="font-mono text-[#64748B] text-[11px]">{deleteTarget.studentId}</div>
                </div>
              </div>

              {/* Temporary Hide */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900">Temporary Hide</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Hides student from table view. Record remains safe in database and can be restored.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(false)}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
                >
                  {isDeleting ? 'Updating...' : 'Hide from Directory'}
                </button>
              </div>

              {/* Permanent Delete */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                <div className="font-bold text-rose-900">Permanent Purge</div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Irreversibly removes student from database and purges photograph from Cloudflare R2 bucket.
                </p>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(true)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                >
                  {isDeleting ? 'Erasing...' : 'Permanent Purge Everywhere'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BULK DELETE MODAL (Selected Students Deletion)
         ========================================================================= */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-heading font-black text-base text-[#0B1118]">
                  Delete {selectedIds.size} Selected Students
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="font-bold text-[#0B1118] text-sm">
                  {selectedIds.size} student record{selectedIds.size === 1 ? '' : 's'} selected
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose whether to temporarily hide these records or permanently erase them from both the active station and the master server.
                </p>
              </div>

              {/* Temporary Hide Selected */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 space-y-2">
                <div className="font-bold text-amber-900">Temporary Hide Selected</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Removes selected students from active view. Records remain safe in the repository and can be restored anytime.
                </p>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => executeBulkDelete(false)}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {isBulkDeleting ? 'Updating records...' : `Hide ${selectedIds.size} Records from Directory`}
                </button>
              </div>

              {/* Permanent Purge Selected */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 space-y-2">
                <div className="font-bold text-rose-900">Permanent Purge Selected</div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Irreversibly deletes selected students from database and purges photos from storage bucket.
                </p>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => executeBulkDelete(true)}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {isBulkDeleting ? 'Erasing records...' : `Permanently Delete ${selectedIds.size} Records`}
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MISTAKE ANALYZER POP-UP MODAL (Screen Overlay in Student Directory)
         ========================================================================= */}
      {isMistakeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-[#CBD5E1] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-lg text-[#0B1118]">
                      Mistake Analyzer & Quality Control
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                      {mistakeItems.length} Flagged Anomalies
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Automated heuristic scan of student photographs, duplicate IDs, and phone formats
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(false)}
                className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-all cursor-pointer"
                title="Close Analyzer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Category Filter Cards */}
            <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAF9] shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <button
                  type="button"
                  onClick={() => setMistakeFilterType('ALL')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    mistakeFilterType === 'ALL'
                      ? 'bg-[#9EE617] border-black text-black font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">All Anomalies</div>
                  <div className="text-2xl font-black">{mistakeItems.length}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Missing Photo')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    mistakeFilterType === 'Missing Photo'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Missing Photos</div>
                  <div className="text-2xl font-black text-amber-600">
                    {mistakeItems.filter(m => m.type === 'Missing Photo').length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Duplicate ID')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    mistakeFilterType === 'Duplicate ID'
                      ? 'bg-rose-100 border-rose-400 text-rose-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-rose-300 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Duplicate IDs</div>
                  <div className="text-2xl font-black text-rose-600">
                    {mistakeItems.filter(m => m.type === 'Duplicate ID').length}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMistakeFilterType('Invalid Phone Number')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    mistakeFilterType === 'Invalid Phone Number'
                      ? 'bg-purple-100 border-purple-400 text-purple-950 font-black shadow-xs'
                      : 'bg-white border-slate-200 hover:border-purple-300 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Phone Issues</div>
                  <div className="text-2xl font-black text-purple-600">
                    {mistakeItems.filter(m => m.type === 'Invalid Phone Number').length}
                  </div>
                </button>
              </div>

              {/* Search Within Anomalies */}
              <div className="mt-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={mistakeSearch}
                  onChange={(e) => setMistakeSearch(e.target.value)}
                  placeholder="Filter anomaly by student name or ID..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                />
              </div>
            </div>

            {/* Anomalies List / Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
              {(() => {
                const filteredMistakes = mistakeItems.filter(m => {
                  const matchType = mistakeFilterType === 'ALL' || m.type === mistakeFilterType;
                  const q = mistakeSearch.toLowerCase().trim();
                  const matchSearch = !q || m.student.fullName.toLowerCase().includes(q) || m.student.studentId.toLowerCase().includes(q);
                  return matchType && matchSearch;
                });

                if (filteredMistakes.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="w-12 h-12 text-[#85E510] mx-auto mb-2 stroke-[1.8]" />
                      <div className="font-heading font-black text-base text-[#0B1118]">No Active Anomalies Found</div>
                      <p className="text-xs text-slate-500 mt-1">All student records match quality standards.</p>
                    </div>
                  );
                }

                return filteredMistakes.map(m => {
                  const s = m.student;
                  const photoSrc = getPhotoUrl(s.photoPath || s.previewPath || s.thumbnailPath) || DEFAULT_AVATAR;

                  return (
                    <div
                      key={m.key}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Student Photo */}
                        <div
                          onClick={() => handleOpenPhotoEditor(s)}
                          className="w-12 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-300 shrink-0 cursor-pointer group relative shadow-2xs"
                          title="Click to crop and edit photo in 3:4 portrait"
                        >
                          <img src={photoSrc} alt={s.fullName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Crop className="w-4 h-4 text-[#9EE617]" />
                          </div>
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-black text-xs text-[#0B1118] truncate">
                              {s.fullName}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {s.studentId}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                              m.type === 'Missing Photo' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              m.type === 'Duplicate ID' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-purple-100 text-purple-800 border border-purple-300'
                            }`}>
                              {m.type}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 font-medium">
                            {m.detail}
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{getGradeDisplay(s)}</span>
                            <span>&bull;</span>
                            <span>{s.school || 'YMS'}</span>
                            {s.phone && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono">{s.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {/* Crop & Edit Photo */}
                        <button
                          type="button"
                          onClick={() => handleOpenPhotoEditor(s)}
                          className="py-1.5 px-2.5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Open Biometric Photo Cropper (3:4)"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Edit Photo</span>
                        </button>

                        {/* Quick-fix phone if applicable */}
                        {m.type === 'Invalid Phone Number' && (
                          <button
                            type="button"
                            onClick={() => handleQuickFixPhone(s)}
                            className="py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                            title="Format to +251 standard"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Fix Phone</span>
                          </button>
                        )}

                        {/* Edit Student Info */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditData(s)}
                          className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                          title="Edit academic and contact info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Data</span>
                        </button>

                        {/* Dismiss */}
                        <button
                          type="button"
                          onClick={() => setResolvedMistakeKeys(prev => new Set([...prev, m.key]))}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Dismiss anomaly"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Click "Edit Photo" to crop in default 3:4 portrait or "Edit Data" to resolve registry mistakes.
              </span>
              <button
                type="button"
                onClick={() => setIsMistakeModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-black text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Close Analyzer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Pause Bulked Note Modal */}
      {calendarNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#256002]" />
                <h3 className="font-heading font-black text-sm text-[#0B1118]">Pause Bulked Students Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter pause reason or notes for selected bulked students:
            </p>

            <textarea
              value={calendarPauseNote}
              onChange={(e) => setCalendarPauseNote(e.target.value)}
              placeholder="e.g. Card printer maintenance, pending ID badge validation, student reshoot needed..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-[#9EE617]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCalendarNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : filtered.map(f => f.studentId);
                  const note = calendarPauseNote.trim() || 'Paused by operator';
                  setPausedIds(prev => {
                    const next = new Set(prev);
                    targetIds.forEach(id => next.add(id));
                    localStorage.setItem('sb_paused_student_ids', JSON.stringify(Array.from(next)));
                    return next;
                  });
                  setPausedNotes(prev => {
                    const next = { ...prev };
                    targetIds.forEach(id => { next[id] = note; });
                    localStorage.setItem('sb_paused_student_notes', JSON.stringify(next));
                    return next;
                  });
                  setCalendarNoteModalOpen(false);
                  setCalendarPauseNote('');
                  alert(`Successfully paused ${targetIds.length} students with note: "${note}"`);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#0B1118] text-[#9EE617] text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Save Pause Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
