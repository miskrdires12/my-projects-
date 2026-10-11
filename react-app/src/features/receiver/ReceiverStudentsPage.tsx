import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Eye, Edit2, Trash2, X, Download, CheckCircle2,
  AlertTriangle, ChevronLeft, ChevronRight, Phone, School as SchoolIcon,
  UserCheck, Shield, ExternalLink, Calendar, HeartPulse, QrCode, FileText,
  Clock, ArrowUpRight, Check, Printer, FileSpreadsheet, CreditCard,
  RotateCcw, EyeOff, AlertOctagon
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  getStudents, addStudent, updateStudent, deleteStudent, restoreStudent,
  getPhotoUrl, getPhotoEncodeClass, subscribeToStudentSync
} from '@/lib/store';
import { Student } from '@/types';

export const ReceiverStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [photoFilter, setPhotoFilter] = useState('ALL');
  const [encodeFilter, setEncodeFilter] = useState<'ALL' | 'ENCODED' | 'UNENCODED'>('ALL');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HIDDEN' | 'ALL'>('ACTIVE');

  // Deletion Modal States
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-selection for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination (supports 100, 250, 500 per master prompt)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Selected Student for Details Slide-Over Drawer
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'Record History' | 'Photo History' | 'Correction Form'>('Record History');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Correction Form States
  const [editFullName, setEditFullName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSaved, setCorrectionSaved] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

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
          setStudents([...localOnly, ...json.students]);
          return;
        }
      }
    } catch (e) {
      console.warn('Syncing with local storage:', e);
    } finally {
      setIsLoading(false);
    }
    setStudents([...getStudents()]);
  };

  useEffect(() => {
    // 1. Instant 0ms memory mount to prevent blank screen
    const initial = getStudents();
    if (initial.length > 0) {
      setStudents(initial);
    }

    // 2. Authoritative background sync
    loadData();

    // 3. React to local store mutations and background loads
    const handleDataChange = () => {
      const current = getStudents();
      if (current.length > 0) {
        setStudents([...current]);
      }
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);

    // 4. Dual-channel real-time subscription (BroadcastChannel + ntfy Cloud SSE + DOM)
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

  // Update correction form and QR whenever selected student changes
  useEffect(() => {
    if (selectedStudent) {
      setEditFullName(selectedStudent.fullName);
      setEditGrade(selectedStudent.grade || '');
      setEditPhone(selectedStudent.phone || '');
      setCorrectionReason('');
      setCorrectionSaved(false);

      const qrPayload = selectedStudent.qrCodeData || JSON.stringify({
        id: selectedStudent.studentId,
        name: selectedStudent.fullName,
        school: selectedStudent.school || 'YMS',
        grade: selectedStudent.grade || '9C',
        status: selectedStudent.status || 'Accepted',
        verified: true,
        issuer: 'Silicon Labs StudentBridge'
      });

      QRCode.toDataURL(qrPayload, { width: 140, margin: 1, color: { dark: '#062404', light: '#85E510' } })
        .then(url => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(null));
    }
  }, [selectedStudent]);

  const distinctSchools = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.school) set.add(s.school); });
    return Array.from(set).sort();
  }, [students]);

  const activeCount = useMemo(() => students.filter(s => !s.receiverHidden).length, [students]);
  const hiddenCount = useMemo(() => students.filter(s => s.receiverHidden === true).length, [students]);
  const totalCount = students.length;

  // Filtered dataset including Encode status and Directory View Mode
  const filtered = useMemo(() => {
    return students.filter(s => {
      // View Mode Filter
      if (viewMode === 'ACTIVE' && s.receiverHidden) return false;
      if (viewMode === 'HIDDEN' && !s.receiverHidden) return false;

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q));

      const matchSchool = schoolFilter === 'ALL' || s.school === schoolFilter;
      const matchGrade = gradeFilter === 'ALL' || s.grade === gradeFilter;
      const st = (s.status || 'Accepted').toUpperCase();
      const isAccepted = st === 'ACCEPTED' || st === 'ACTIVE' || st === 'VERIFIED';
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACCEPTED' && isAccepted) ||
        (statusFilter === 'PENDING' && st === 'PENDING') ||
        (statusFilter === 'REJECTED' && st === 'REJECTED');
      const hasPhoto = !!(s.photoPath || s.previewPath || s.thumbnailPath);
      const matchPhoto = photoFilter === 'ALL' || (photoFilter === 'YES' && hasPhoto) || (photoFilter === 'NO' && !hasPhoto);

      const isEncoded = getPhotoEncodeClass(s) === 'Encoded';
      const matchEncode =
        encodeFilter === 'ALL' ||
        (encodeFilter === 'ENCODED' && isEncoded) ||
        (encodeFilter === 'UNENCODED' && !isEncoded);

      return matchSearch && matchSchool && matchGrade && matchStatus && matchPhoto && matchEncode;
    });
  }, [students, search, schoolFilter, gradeFilter, statusFilter, photoFilter, encodeFilter, viewMode]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedStudents = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedStudents.length && pagedStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedStudents.map(s => s.studentId)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!correctionReason.trim()) {
      alert('Please provide a reason for this audit correction.');
      return;
    }

    updateStudent(selectedStudent.studentId, {
      fullName: editFullName.trim(),
      grade: editGrade.trim(),
      phone: editPhone.trim()
    });

    loadData();
    setCorrectionSaved(true);
    setTimeout(() => {
      setCorrectionSaved(false);
      setSelectedStudent(null);
    }, 1500);
  };

  const executeDelete = async (permanent: boolean) => {
    setIsDeleting(true);
    try {
      if (isBatchDeleting) {
        const batchIds = Array.from(selectedIds);
        // Optimistic instant UI update
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
        setSelectedIds(new Set());
        setIsBatchDeleting(false);

        for (const id of batchIds) {
          await deleteStudent(id, permanent);
        }
      } else if (deleteTarget) {
        const targetSid = deleteTarget.studentId;
        const targetId = deleteTarget.id;

        // Optimistic instant UI update
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
          setSelectedStudent(null);
        }
        setDeleteTarget(null);

        await deleteStudent(targetSid, permanent);
      }
      await loadData();
    } catch (err) {
      console.error('Delete execution error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (studentId: string) => {
    // Optimistic instant UI update
    setStudents(prev => prev.map(s => {
      if (s.studentId === studentId || s.id === studentId) {
        return { ...s, receiverHidden: false, hiddenAt: null as any };
      }
      return s;
    }));
    await restoreStudent(studentId);
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-black text-[#202833] tracking-tight">
              Student Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 font-mono">
              {students.length.toLocaleString()} Authoritative Records
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            High-density student directory with real-time biometric verification, inspection drawer, and exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-[#F4F7F5] rounded-xl border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => { setViewMode('ACTIVE'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'ACTIVE'
                  ? 'bg-white text-[#202833] shadow-xs'
                  : 'text-[#64748B] hover:text-[#202833]'
              }`}
            >
              <span>Active</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#85E510]/30 text-[#366804]">
                {activeCount.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('HIDDEN'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'HIDDEN'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-[#64748B] hover:text-amber-800'
              }`}
            >
              <span>Hidden / Trash</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-100 text-amber-800">
                {hiddenCount.toLocaleString()}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('ALL'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'ALL'
                  ? 'bg-white text-[#202833] shadow-xs'
                  : 'text-[#64748B] hover:text-[#202833]'
              }`}
            >
              <span>All</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                {totalCount.toLocaleString()}
              </span>
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#366804] bg-[#85E510]/20 px-3 py-1.5 rounded-xl border border-[#85E510]/40">
                {selectedIds.size} Selected
              </span>
              <button
                type="button"
                onClick={() => setIsBatchDeleting(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          )}

          <Link
            to="/receiver/exports"
            className="px-3.5 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export Registry & Photos</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
          {/* Search by ID, Name, Phone */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search ID, name, or phone..."
              className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#202833] placeholder-[#94A3B8] focus:outline-none focus:border-[#85E510]"
            />
          </div>

          {/* School filter */}
          <select
            value={schoolFilter}
            onChange={(e) => { setSchoolFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">School: All</option>
            {distinctSchools.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Grade filter */}
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Grade: All</option>
            {['9C', '9A', '9B', '10A', '10B', '11A', '12A', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Photo filter */}
          <select
            value={photoFilter}
            onChange={(e) => { setPhotoFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Photo: All</option>
            <option value="YES">Has Photo</option>
            <option value="NO">Missing Photo</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Status: All</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Encode Class filter */}
          <select
            value={encodeFilter}
            onChange={(e) => { setEncodeFilter(e.target.value as any); setPage(1); }}
            className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#202833] focus:outline-none focus:border-[#85E510]"
          >
            <option value="ALL">Encode Class: All</option>
            <option value="ENCODED">Encoded (Photo Verified)</option>
            <option value="UNENCODED">Unencoded (Missing Photo)</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Page Size Selector (Supports 100, 250, 500) */}
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-[#F8FAF9] border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs font-bold text-[#202833]"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => { setSearch(''); setSchoolFilter('ALL'); setGradeFilter('ALL'); setStatusFilter('ALL'); setPhotoFilter('ALL'); setEncodeFilter('ALL'); setPage(1); }}
            className="px-3 py-1.5 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-xs font-bold text-[#202833] transition-all"
          >
            Reset
          </button>
          <span className="text-xs font-mono text-[#366804] font-bold">
            {filtered.length.toLocaleString()} Found
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E2E8F0] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedStudents.length && pagedStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                  />
                </th>
                <th className="py-3.5 pl-2">Photo</th>
                <th className="py-3.5">Student ID</th>
                <th className="py-3.5">Full Name</th>
                <th className="py-3.5">Sex</th>
                <th className="py-3.5">Grade</th>
                <th className="py-3.5">School</th>
                <th className="py-3.5">Phone Number</th>
                <th className="py-3.5">Sender</th>
                <th className="py-3.5">Encode Class</th>
                <th className="py-3.5">Review Status</th>
                <th className="py-3.5">ID Card Status</th>
                <th className="py-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pagedStudents.map((s) => {
                const photoSrc = getPhotoUrl(s.thumbnailPath || s.previewPath || s.photoPath);
                const isEncoded = getPhotoEncodeClass(s) === 'Encoded';
                const status = s.status || 'Accepted';
                const isSelected = selectedIds.has(s.studentId);

                return (
                  <tr
                    key={s.id || s.studentId}
                    className={`hover:bg-[#F8FAF9] transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#85E510]/5' : ''
                    }`}
                    onClick={() => setSelectedStudent(s)}
                  >
                    <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(s.studentId)}
                        className="rounded border-[#CBD5E1] text-[#85E510] focus:ring-[#85E510]"
                      />
                    </td>

                    {/* Photo Thumbnail */}
                    <td className="py-3 pl-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#F4F7F5] border border-[#CBD5E1] shrink-0 flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={s.fullName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 w-full h-full flex items-center justify-center">
                            NO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3 font-mono text-[#366804] font-bold">{s.studentId}</td>

                    {/* Full Name */}
                    <td className="py-3 font-bold text-[#202833] text-xs">{s.fullName}</td>

                    {/* Sex */}
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.sex === 'Female' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {s.sex || 'Female'}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-[#F4F7F5] border border-[#E2E8F0] font-bold text-[#202833] text-[11px]">
                        {s.grade || '9C'}
                      </span>
                    </td>

                    {/* School */}
                    <td className="py-3 text-[#202833] font-semibold">{s.school || 'YMS'}</td>

                    {/* Phone */}
                    <td className="py-3 font-mono text-[#64748B]">{s.phone || '+2519...'}</td>

                    {/* Sender */}
                    <td className="py-3 text-[#64748B]">{s.senderName || 'Field Operator'}</td>

                    {/* Encode Class Badge */}
                    <td className="py-3">
                      {isEncoded ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit shadow-xs">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Encoded</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Unencoded</span>
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        status === 'Accepted' || status === 'VERIFIED'
                          ? 'badge-accepted'
                          : status === 'Pending'
                          ? 'badge-pending'
                          : 'badge-rejected'
                      }`}>
                        {status === 'VERIFIED' ? 'Accepted' : status}
                      </span>
                    </td>

                    {/* ID Production Status */}
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                        s.idProductionStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        s.idProductionStatus === 'IN_PRODUCTION' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-sky-100 text-sky-800 border-sky-200'
                      }`}>
                        {s.idProductionStatus || (status === 'Accepted' || status === 'VERIFIED' ? 'READY' : 'QUEUED')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right pr-4 space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      {s.receiverHidden ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRestore(s.studentId)}
                            className="p-1.5 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all border border-emerald-300"
                            title="Restore to System"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 inline-flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition-all border border-rose-300"
                            title="Permanent Delete (Purge Everywhere)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/receiver/id-production"
                            className="p-1.5 inline-flex items-center justify-center rounded-lg bg-[#F4F7F5] hover:bg-[#85E510] hover:text-[#062404] text-[#64748B] transition-all border border-[#CBD5E1]"
                            title="Produce ID Card"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className="p-1.5 inline-flex items-center justify-center rounded-lg bg-[#F4F7F5] hover:bg-[#85E510] hover:text-[#062404] text-[#64748B] transition-all border border-[#CBD5E1]"
                            title="View Full Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 inline-flex items-center justify-center rounded-lg bg-[#F4F7F5] hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-all border border-[#CBD5E1]"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}

              {pagedStudents.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#64748B]">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-[#85E510] border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-bold text-xs text-[#202833]">Syncing with Cloudflare R2 & Database...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm text-[#202833]">No student records found</span>
                        <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                          {search || schoolFilter !== 'ALL' || gradeFilter !== 'ALL' || statusFilter !== 'ALL'
                            ? 'No students match your current search or filter criteria. Click "Reset" above to clear filters.'
                            : viewMode === 'HIDDEN'
                            ? 'No hidden students in trash. Students temporarily deleted will appear here.'
                            : 'No student records currently available.'}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#F8FAF9] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
          <div>
            Showing <strong className="text-[#202833]">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-[#202833]">{Math.min(page * pageSize, filtered.length)}</strong> of{' '}
            <strong className="text-[#202833]">{filtered.length.toLocaleString()}</strong> records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 text-[#202833] hover:bg-[#F4F7F5]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-[#202833]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-[#CBD5E1] bg-white disabled:opacity-40 text-[#202833] hover:bg-[#F4F7F5]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Dossier Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#85E510]/20 flex items-center justify-center text-[#4D8A07]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#202833]">
                    {selectedStudent.fullName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#366804]">
                    <span>{selectedStudent.studentId}</span>
                    <span>&bull;</span>
                    <span className="text-[#64748B] font-sans font-medium">{selectedStudent.school}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg hover:bg-[#F4F7F5] text-[#64748B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Photo & Identity Quick Card */}
              <div className="p-4 bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className="w-24 h-28 rounded-xl bg-white border border-[#CBD5E1] overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                  {getPhotoUrl(selectedStudent.previewPath || selectedStudent.thumbnailPath || selectedStudent.photoPath) ? (
                    <img
                      src={getPhotoUrl(selectedStudent.previewPath || selectedStudent.thumbnailPath || selectedStudent.photoPath)!}
                      alt={selectedStudent.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-amber-600">No Photo</span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs flex-1">
                  <div className="flex justify-between items-center pb-1 border-b border-[#E2E8F0]">
                    <span className="text-[#64748B]">Encode Class:</span>
                    {getPhotoEncodeClass(selectedStudent) === 'Encoded' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Encoded
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Unencoded
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Grade & Section:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.grade || '9C'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Blood Type:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.bloodType || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Sex:</span>
                    <span className="font-bold text-[#202833]">{selectedStudent.sex || 'Female'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Phone:</span>
                    <span className="font-mono text-[#202833]">{selectedStudent.phone || '+251...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Origin Sender:</span>
                    <span className="font-semibold text-[#202833]">{selectedStudent.senderName || 'Field Operator'}</span>
                  </div>
                </div>
              </div>

              {/* QR Auto-Encoded Payload Card */}
              <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#4D8A07]" />
                    <h4 className="text-xs font-black text-[#202833]">Auto-Encoded QR Payload</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const payload = selectedStudent.qrCodeData || JSON.stringify({
                        id: selectedStudent.studentId,
                        name: selectedStudent.fullName,
                        school: selectedStudent.school || 'YMS',
                        grade: selectedStudent.grade || '9C',
                        status: selectedStudent.status || 'Accepted',
                        verified: true,
                        issuer: 'Silicon Labs StudentBridge'
                      });
                      navigator.clipboard.writeText(payload);
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    className="text-[11px] font-bold text-[#4D8A07] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPayload ? <span className="text-emerald-600">✓ Copied</span> : <span>Copy Raw Encoded</span>}
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {qrCodeDataUrl && (
                    <img
                      src={qrCodeDataUrl}
                      alt="Student QR Code"
                      className="w-20 h-20 rounded-lg border border-[#E2E8F0] p-1 bg-white shrink-0"
                    />
                  )}
                  <div className="flex-1 bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E2E8F0] overflow-hidden">
                    <div className="text-[10px] text-[#64748B] font-bold mb-1 uppercase tracking-wider">Canonical Payload</div>
                    <code className="text-[10px] font-mono text-[#366804] break-all block leading-relaxed line-clamp-3">
                      {selectedStudent.qrCodeData || JSON.stringify({
                        id: selectedStudent.studentId,
                        name: selectedStudent.fullName,
                        school: selectedStudent.school || 'YMS',
                        grade: selectedStudent.grade || '9C',
                        status: selectedStudent.status || 'Accepted',
                        verified: true,
                        issuer: 'Silicon Labs StudentBridge'
                      })}
                    </code>
                  </div>
                </div>
              </div>

              {/* ID Production Action CTA */}
              <div className="p-3.5 bg-[#85E510]/15 rounded-2xl border border-[#85E510]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-[#366804]" />
                  <div>
                    <div className="text-xs font-bold text-[#202833]">Official CR80 Student ID</div>
                    <div className="text-[10px] text-[#64748B]">Status: {selectedStudent.idProductionStatus || (selectedStudent.status === 'Accepted' ? 'READY FOR PRINT' : 'QUEUED')}</div>
                  </div>
                </div>
                <Link
                  to="/receiver/id-production"
                  className="px-3.5 py-1.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm flex items-center gap-1 transition-all"
                >
                  <span>Produce ID</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-bold text-[#64748B]">
                {(['Record History', 'Photo History', 'Correction Form'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-[#85E510] text-[#202833] font-black'
                        : 'hover:text-[#202833]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1: Record History */}
              {activeTab === 'Record History' && (
                <div className="space-y-3">
                  {selectedStudent.recordHistory && selectedStudent.recordHistory.length > 0 ? (
                    selectedStudent.recordHistory.map((h, i) => (
                      <div key={i} className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] text-xs space-y-1">
                        <div className="flex justify-between font-bold text-[#202833]">
                          <span>{h.action}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">{h.date}</span>
                        </div>
                        <div className="text-[#64748B]">
                          By: <strong className="text-[#202833]">{h.user}</strong> ({h.role})
                        </div>
                        {h.notes && <p className="text-[11px] text-[#475569] italic">{h.notes}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-[#F8FAF9] rounded-xl text-center text-xs text-[#64748B]">
                      Initial registration record from Sender Station.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Photo History */}
              {activeTab === 'Photo History' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                    <div className="font-bold text-[#202833] mb-1">R2 Object Reference</div>
                    <div className="font-mono text-[11px] text-[#366804] break-all">
                      {selectedStudent.photoPath || 'No R2 key registered'}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Integrity Status:</span>
                      <span className="font-bold text-[#366804]">PHOTO_VERIFIED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Public CDN URL:</span>
                      <span className="text-[#202833]">pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Record Correction Form */}
              {activeTab === 'Correction Form' && (
                <form onSubmit={handleSaveCorrection} className="space-y-3 text-xs">
                  {correctionSaved && (
                    <div className="p-3 rounded-xl bg-[#85E510]/20 border border-[#85E510]/40 text-[#366804] font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Correction applied and audited successfully!</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Grade / Class</label>
                    <input
                      type="text"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#202833] font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[#202833] font-bold mb-1">Reason for Correction (Audited)</label>
                    <textarea
                      required
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Corrected spelling of father's name as requested by school registrar"
                      rows={2}
                      className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl p-2.5 text-xs text-[#202833]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm transition-all"
                  >
                    Save & Record in Audit Trail
                  </button>
                </form>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteTarget(selectedStudent)}
                className="px-3.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 rounded-xl bg-[#202833] text-white text-xs font-bold hover:bg-[#161D26]"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Mode Deletion Modal (Permanent vs Temporary System Removal) */}
      {(deleteTarget || isBatchDeleting) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#202833]">
                    {isBatchDeleting ? `Delete ${selectedIds.size} Selected Students` : 'Delete Student Record'}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Choose between temporary system removal or permanent cloud erasure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setIsBatchDeleting(false); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#64748B] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Preview */}
            {deleteTarget && (
              <div className="p-4 mx-6 mt-5 bg-[#F8FAF9] rounded-2xl border border-[#E2E8F0] flex items-center gap-3.5">
                <div className="w-12 h-14 rounded-xl bg-white border border-[#CBD5E1] overflow-hidden shrink-0 flex items-center justify-center">
                  {getPhotoUrl(deleteTarget.previewPath || deleteTarget.thumbnailPath || deleteTarget.photoPath) ? (
                    <img
                      src={getPhotoUrl(deleteTarget.previewPath || deleteTarget.thumbnailPath || deleteTarget.photoPath)!}
                      alt={deleteTarget.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">No Photo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-[#202833] truncate">{deleteTarget.fullName}</h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#366804] mt-0.5">
                    <span>{deleteTarget.studentId}</span>
                    <span className="text-[#94A3B8] font-sans">&bull;</span>
                    <span className="text-[#64748B] font-sans">{deleteTarget.grade} - {deleteTarget.school}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Deletion Choice Cards */}
            <div className="p-6 space-y-4">
              {/* Option 1: Temporary Delete */}
              <div className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                      Temporary Delete
                    </span>
                    <span className="text-xs font-bold text-amber-900">Hide from My System</span>
                  </div>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    Hides this record from your active station directory. Biometric photos and records remain securely preserved in Cloudflare and can be restored at any time.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(false)}
                  className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>{isDeleting ? 'Updating System...' : 'Temporary Delete (Hide Only)'}</span>
                </button>
              </div>

              {/* Option 2: Permanent Delete */}
              <div className="p-4 rounded-2xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900">
                      Permanent Delete
                    </span>
                    <span className="text-xs font-bold text-rose-900">Erase from Everywhere</span>
                  </div>
                  <p className="text-xs text-rose-800/80 leading-relaxed">
                    Irreversibly destroys this record from Supabase PostgreSQL database, purges biometric portrait from Cloudflare R2 bucket ('siliconlabs'), and deletes across all devices.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => executeDelete(true)}
                  className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Erasing Everywhere...' : 'Permanent Delete (Purge Everywhere)'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] flex justify-end">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setIsBatchDeleting(false); }}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
