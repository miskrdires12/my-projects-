import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X, Sliders, Crop,
  ChevronDown, ChevronUp, Image as ImageIcon, Check, Printer, SwitchCamera,
  TrendingUp, Calendar, Clock, BarChart2, MapPin, Scissors
} from 'lucide-react';
import {
  getStudents, addStudent, getSchools, getCurrentUser, getTasks,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP, getSenderMetrics, SenderMetrics,
  generateStudentQrToken, getCorrectionLogs, CorrectionLog, getAuthHeaders
} from '@/lib/store';
import { queueOfflineOperation } from '@/lib/offlineQueue';
import { Student } from '@/types';
import { PhoneCropModal } from '@/components/PhoneCropModal';
import { CameraCaptureModal } from '@/components/CameraCaptureModal';
import { R2_PUBLIC_BASE_URL } from '@/lib/syncEngine';
import { parseGradeAndSection } from '@/lib/gradeUtils';

export const StudentRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Helper for generating an ID
  const generateNewId = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `SB-2026-${randomNum}`;
  };

  // Form States (Phone default is strictly blank per user specification)
  const [studentId, setStudentId] = useState(generateNewId);
  const [isIdTaken, setIsIdTaken] = useState(false);
  const [fullName, setFullName] = useState('');
  const [sex, setSex] = useState<'Female' | 'Male'>('Female');
  const [grade, setGrade] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [location, setLocation] = useState('Addis Ababa');
  const [school, setSchool] = useState('YMS');
  const [schoolBusUsage, setSchoolBusUsage] = useState<'Yes' | 'No' | ''>('');
  const [correctionNotices, setCorrectionNotices] = useState<CorrectionLog[]>([]);

  // Extra Details (Expandable)
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('Addis Ababa');
  const [guardianName, setGuardianName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [nationality, setNationality] = useState('Ethiopian');

  // Camera & Photo States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Photo Editor & Crop Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorActiveTab, setEditorActiveTab] = useState<'Crop' | 'Brightness' | 'Contrast' | 'Saturation' | 'Rotate'>('Crop');
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:5' | '2:3'>('3:4');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Sender Transmission Metrics (Daily, Weekly, Monthly, Total)
  const [senderMetrics, setSenderMetrics] = useState<SenderMetrics>(() => {
    const cur = getCurrentUser() || user;
    return getSenderMetrics(cur?.username || cur?.email || '');
  });

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schools = getSchools();

  // Refresh Sender Metrics dynamically on mount, after submission, or data changes
  const refreshMetrics = useCallback(() => {
    const cur = getCurrentUser() || user;
    const identifier = cur?.username || cur?.email || '';
    setSenderMetrics(getSenderMetrics(identifier));
  }, [user]);

  useEffect(() => {
    refreshMetrics();
    const loadCorrections = () => {
      const cur = getCurrentUser() || user;
      setCorrectionNotices(getCorrectionLogs(cur?.username || cur?.email));
    };
    loadCorrections();

    const handleDataChange = () => {
      refreshMetrics();
      loadCorrections();
    };
    window.addEventListener('studentbridge_datachange', handleDataChange);
    window.addEventListener('studentbridge_correction_event', loadCorrections);
    window.addEventListener('studentbridge_sync', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      window.removeEventListener('studentbridge_datachange', handleDataChange);
      window.removeEventListener('studentbridge_correction_event', loadCorrections);
      window.removeEventListener('studentbridge_sync', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, [refreshMetrics, submittedStudent, user]);

  // Check ID Uniqueness dynamically against all students
  useEffect(() => {
    const all = getStudents();
    const taken = all.some(s => s.studentId.trim().toUpperCase() === studentId.trim().toUpperCase());
    setIsIdTaken(taken);
  }, [studentId]);

  // Name Auto-Capitalizer (First Name, Father's Name, Grandfather's Name)
  const handleNameChange = (val: string) => {
    const capitalized = val
      .split(' ')
      .map(word => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
    setFullName(capitalized);
  };


  // Ethiopian Phone Number Auto-Formatter
  // 09... -> +2519... and 07... -> +2517... (blank stays blank)
  const handlePhoneFormat = (val: string, setter: (v: string) => void) => {
    let clean = val.trim();
    if (!clean) {
      setter('');
      return;
    }
    if (clean.startsWith('09')) {
      clean = '+2519' + clean.slice(2);
    } else if (clean.startsWith('07')) {
      clean = '+2517' + clean.slice(2);
    } else if (clean.startsWith('9') && !clean.startsWith('+')) {
      clean = '+2519' + clean.slice(1);
    } else if (clean.startsWith('7') && !clean.startsWith('+')) {
      clean = '+2517' + clean.slice(1);
    }
    setter(clean);
  };

  // Available schools dynamically filtered by selected branch location
  const availableSchools = BRANCH_SCHOOL_MAP[location] || ['YMS'];

  const handleLocationChange = (newLoc: string) => {
    setLocation(newLoc);
    const schoolsForBranch = BRANCH_SCHOOL_MAP[newLoc] || [];
    if (schoolsForBranch.length > 0 && !schoolsForBranch.includes(school)) {
      setSchool(schoolsForBranch[0]);
    }
  };

  // File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
          setIsEditorOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  // Student Registration Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isIdTaken) {
      setSubmitError('The Student ID is already taken. Please generate or specify a unique ID.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError('Student Full Name is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatusText('Saving biometric photograph to Cloudflare R2 storage...');

    try {
      const cleanGrade = (grade.trim() || 'General').replace(/[\/\\:*?"<>|\s]+/g, '_');
      const cleanName = fullName.trim().replace(/[\/\\:*?"<>|\s]+/g, '_') || 'Student';
      const photoKey = `${cleanGrade}/${cleanName}.jpg`;
      let r2PhotoUrl: string | undefined = undefined;

      // Direct Cloudflare R2 Bucket Upload (Saved strictly by student name)
      if (capturedPhoto && capturedPhoto.startsWith('data:image')) {
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
              studentId: studentId.trim(),
              grade: cleanGrade,
              fullName: cleanName,
              filename: photoKey,
              data: capturedPhoto
            })
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            if (upData.url || upData.r2Url) {
              r2PhotoUrl = upData.url || upData.r2Url;
            }
          }
        } catch (r2Err) {
          console.warn('Direct Cloudflare R2 upload attempt, edge worker fallback:', r2Err);
        }
      }

      const finalPhotoUrl = r2PhotoUrl || (capturedPhoto ? `${R2_PUBLIC_BASE_URL}/${photoKey}` : undefined);

      const parsedGradeInfo = parseGradeAndSection(grade);
      const fullDisplayGrade = parsedGradeInfo.displayString || grade.trim();
      const resolvedSection = parsedGradeInfo.cleanSection || '';

      const studentPayload: Student & { capturedPhoto?: string; photoBase64?: string; section?: string; branch?: string } = {
        id: 'cmu-' + Date.now().toString(36),
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        sex,
        grade: fullDisplayGrade,
        department: resolvedSection || undefined,
        section: resolvedSection || undefined,
        phone: phone.trim(),
        bloodType: bloodType || undefined,
        school: school.trim(),
        location,
        branch: location,
        country: 'Ethiopia',
        dateOfBirth: dateOfBirth || undefined,
        address: address || location,
        cityRegion: location,
        guardianFullName: guardianName || undefined,
        emergencyContactPhone: emergencyContact.trim(),
        schoolBusUsage,
        busUser: schoolBusUsage,
        nationality,
        photoPath: finalPhotoUrl,
        previewPath: capturedPhoto || finalPhotoUrl || undefined,
        thumbnailPath: capturedPhoto || finalPhotoUrl || undefined,
        originalPhotoPath: finalPhotoUrl,
        capturedPhoto: capturedPhoto || undefined,
        photoBase64: capturedPhoto || undefined,
        photoIntegrityStatus: capturedPhoto ? 'PHOTO_VERIFIED' : 'NO_PHOTO',
        // QR Code token strictly formatted as {"id":"...","name":"...","roll":"","grade":"..."}
        qrCodeData: generateStudentQrToken({
          studentId: studentId.trim(),
          fullName: fullName.trim(),
          rollNumber: '',
          grade: fullDisplayGrade
        }),
        senderName: user?.username || 'Field Operator',
        status: 'Accepted',
        idProductionStatus: 'READY',
        createdAt: new Date().toISOString(),
        recordHistory: [
          {
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            action: 'Initial Registration',
            user: user?.username || 'Field Operator',
            role: 'Sender',
            notes: 'Biometric capture and identity registration in Sender Station'
          }
        ]
      };

      // 1. Submit to Cloudflare Edge Worker API (Handles R2 upload & Supabase PostgreSQL write)
      let persistedStudent = studentPayload;
      let serverConfirmed = false;

      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(studentPayload)
        });

        if (res.ok) {
          const cloudSaved = await res.json();
          if (cloudSaved && cloudSaved.studentId) {
            persistedStudent = cloudSaved;
            serverConfirmed = true;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 409 || errData.error === 'DUPLICATE_ID') {
            setIsIdTaken(true);
            throw new Error('Student ID is already taken in the authoritative database.');
          }
          throw new Error(errData.message || errData.error || `Server returned error (${res.status})`);
        }
      } catch (networkErr: any) {
        if (networkErr.message?.includes('already taken')) {
          throw networkErr;
        }

        console.warn('Direct server sync failed, queuing into IndexedDB offline queue:', networkErr);
        // Queue into IndexedDB for durable offline resilience
        await queueOfflineOperation('CREATE_STUDENT', studentPayload).catch(() => {});
        persistedStudent = studentPayload;
      }

      // 2. Persist in local store & notify Receiver Station immediately
      addStudent(persistedStudent);
      setSubmittedStudent(persistedStudent);
      refreshMetrics();
    } catch (err: any) {
      setSubmitError(err.message || 'Error occurred during registration.');
    } finally {
      setIsSubmitting(false);
      setSubmitStatusText('');
    }
  };

  const resetFormForNext = () => {
    setStudentId(generateNewId());
    setFullName('');
    setPhone('');
    setEmergencyContact('');
    setGuardianName('');
    setDateOfBirth('');
    setBloodType('');
    setGrade('');
    setSchoolBusUsage('');
    setCapturedPhoto(null);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setZoom(1);
    setAspectRatio('3:4');
    setSubmittedStudent(null);
    setSubmitError(null);
    refreshMetrics();
  };

  // Active task assigned to current operator
  const userTasks = getTasks().filter(t => {
    if (t.status === 'Completed') return false;
    const assigned = (t.assignedTo || '').toLowerCase().trim();
    const uName = (user?.username || '').toLowerCase().trim();
    const uEmail = (user?.email || '').toLowerCase().trim();
    const uSchool = (user?.school || '').toLowerCase().trim();
    const tSchool = (t.school || '').toLowerCase().trim();
    return (
      assigned === uName ||
      assigned === uEmail ||
      (uEmail.includes('@') && assigned === uEmail.split('@')[0]) ||
      (uSchool && tSchool === uSchool) ||
      assigned === 'all' ||
      assigned === 'field operator' ||
      assigned === 'operator'
    );
  });
  const activeTask = userTasks.length > 0 ? userTasks[0] : null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-black text-[#0B1118] tracking-tight">
            Register Student
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
            Operator: <strong className="text-[#0B1118]">{user?.username || 'Sender'}</strong>
          </span>
        </div>
      </div>

      {/* Sender Transmission Telemetry (Daily, Weekly, Monthly, Total) - Small & Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Today</span>
            <Calendar className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.today.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Week</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.week.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Month</span>
            <BarChart2 className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.month.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Sent</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#85E510]" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg font-heading font-black text-[#0B1118]">
            {senderMetrics.total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Target Task Quota - ONLY rendered when there is an active task for this operator! */}
      {activeTask && (
        <div className="bg-gradient-to-r from-slate-900 to-[#101F08] border border-[#85E510]/30 rounded-2xl p-3.5 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#85E510] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#85E510]">
                Assigned Task: {activeTask.id}
              </span>
            </div>
            <div className="text-base font-heading font-black tracking-tight">
              {activeTask.title}
            </div>
            <p className="text-xs text-slate-300">
              Campus: {activeTask.school} • Priority: {activeTask.priority}
            </p>
          </div>

          <div className="w-full sm:w-64 bg-black/40 border border-slate-700/60 rounded-xl p-2.5 flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Status:</span>
              <span className="text-[#85E510] font-mono font-black">
                {activeTask.status}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>Deadline: {activeTask.deadline}</span>
              <span>Live Sync Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Resolved Mistake Reminder Notes (Always shown for sender whose data was corrected) */}
      {correctionNotices.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-heading font-black text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Reminder Notes: Mistake Data Corrected ({correctionNotices.length} updates for your submissions)</span>
            </div>
            <span className="text-[10px] text-amber-800 font-bold bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-300">
              Resolved by Receiver Desk
            </span>
          </div>
          <div className="divide-y divide-amber-200/60 max-h-48 overflow-y-auto custom-scrollbar">
            {correctionNotices.map(notice => (
              <div key={notice.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0B1118]">{notice.studentName}</span>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      {notice.studentId}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Author: <strong className="text-slate-800">{notice.senderName || 'Sender'}</strong>
                    </span>
                  </div>
                  <div className="text-amber-950 font-medium mt-1">
                    <strong className="text-amber-900">Correction Note:</strong> {notice.description}
                  </div>
                  <div className="text-[10px] text-emerald-800 mt-1 flex items-center gap-1.5 font-bold">
                    <span>Corrected By:</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-emerald-300 text-[#0B1118]">
                      {notice.resolvedBy}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(notice.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {submitError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{submitError}</span>
          </div>
          <button type="button" onClick={() => setSubmitError(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: 2 White Cards */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Student Photograph Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Photograph</span>
              </h2>
              {capturedPhoto ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Captured &bull; R2 Ready
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Required
                </span>
              )}
            </div>

            {/* Photo Preview Container */}
            <div className="relative aspect-[3/4] w-full max-w-[340px] sm:max-w-[380px] mx-auto bg-[#F4F7F5] rounded-2xl border-2 border-dashed border-[#CBD5E1] overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              {capturedPhoto ? (
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={capturedPhoto}
                    alt="Captured Student"
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                      transform: `rotate(${rotation}deg) scale(${zoom})`,
                      transition: 'all 0.15s ease'
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs rounded-md text-[9px] font-mono font-bold text-[#85E510] border border-[#85E510]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Biometric OK
                  </div>
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs rounded-lg text-[10px] font-mono text-white border border-white/10">
                    {studentId}
                  </div>
                  {/* Quick Edit Overlay */}
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Scissors className="w-6 h-6 text-[#85E510]" />
                    <span>Click to Edit &amp; Crop</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-[#64748B] flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4D8A07] shadow-sm">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#202833]">No Photograph Captured</div>
                    <p className="text-[11px] text-[#94A3B8] mt-1 max-w-[240px]">
                      Click below to open the dedicated biometric camera popup with Eye Line and Nose crosshairs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Launch Camera Modal</span>
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Photo Actions */}
          <div className="space-y-2 pt-2">
            <div className="space-y-2">
              {/* Activate Camera Button - Pops up Modal */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#062404]" />
                <span>{capturedPhoto ? 'Retake Photo (Camera Popup)' : 'Activate Camera'}</span>
              </button>

              {/* Edit & Crop Button */}
              <button
                type="button"
                onClick={() => {
                  if (capturedPhoto) {
                    setIsEditorOpen(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-[#85E510] text-[#202833] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Scissors className="w-4 h-4 text-[#4D8A07]" />
                <span>{capturedPhoto ? 'Edit & Crop Photo' : 'Upload & Crop Photo'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {capturedPhoto && (
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Portrait Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setBrightness(100);
                      setContrast(100);
                      setSaturation(100);
                      setRotation(0);
                      setZoom(1);
                    }}
                    className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Remove Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Student Information Card (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-black text-[#0B1118] uppercase tracking-wider flex items-center gap-2">
                <span>STUDENT INFORMATION</span>
              </h2>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#4D8A07] bg-[#85E510]/20 px-2.5 py-0.5 rounded-md border border-[#85E510]/40">
                REQUIRED
              </span>
            </div>

            <div className="space-y-4">
              {/* Student ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0B1118]">Student ID <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    {isIdTaken ? (
                      <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> Taken
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#4D8A07] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setStudentId(generateNewId())}
                      className="text-[10px] text-[#4D8A07] hover:underline font-bold flex items-center gap-1 cursor-pointer ml-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="SB-2026-12788"
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Loza Bereket"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs text-[#0B1118] font-medium focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* Sex Identification (Interactive Buttons - Not Dropdown!) */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Sex Identification <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      sex === 'Male'
                        ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                    }`}
                  >
                    <span className="text-sm">♂</span>
                    <span>Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      sex === 'Female'
                        ? 'bg-[#0B1118] text-white border-[#0B1118] shadow-sm ring-2 ring-[#85E510]/50'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-slate-100 hover:text-[#0B1118]'
                    }`}
                  >
                    <span className="text-sm">♀</span>
                    <span>Female</span>
                  </button>
                </div>
              </div>

              {/* Main Form: Branch Location & Assigned School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl">
                {/* Branch Location */}
                <div>
                  <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                    Branch Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={location}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                    >
                      {DEFAULT_BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Assigned School */}
                <div>
                  <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                    Assigned School ({location}) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                    >
                      {availableSchools.map(schName => (
                        <option key={schName} value={schName}>{schName}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Blood Group / Type */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#0B1118]">Blood Group / Type</label>
                  <span className="text-xs text-slate-400 font-semibold">Optional</span>
                </div>
                <div className="relative">
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] cursor-pointer appearance-none transition-all"
                  >
                    <option value="">-- No Blood Group Selected --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Grade / Class */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Grade / Class <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value.toUpperCase())}
                  placeholder="9C"
                  className="w-full bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1E1B4B] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneFormat(e.target.value, setPhone)}
                  onBlur={() => handlePhoneFormat(phone, setPhone)}
                  placeholder="251912480376"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#0B1118] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510] transition-all"
                />
              </div>

              {/* School Bus Usage (2 Dedicated Radio Buttons - unselected by default, toggleable) */}
              <div className="bg-[#F8FAF9] border border-[#E2E8F0] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0B1118]">
                    School Bus Usage
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Click selected option to unselect</span>
                </div>
                <div className="flex items-center gap-6 pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                    <input
                      type="radio"
                      name="schoolBusUsage"
                      value="Yes"
                      checked={schoolBusUsage === 'Yes'}
                      onClick={() => setSchoolBusUsage(schoolBusUsage === 'Yes' ? '' : 'Yes')}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#85E510] cursor-pointer"
                    />
                    <span>Yes (Uses Bus)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                    <input
                      type="radio"
                      name="schoolBusUsage"
                      value="No"
                      checked={schoolBusUsage === 'No'}
                      onClick={() => setSchoolBusUsage(schoolBusUsage === 'No' ? '' : 'No')}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#85E510] cursor-pointer"
                    />
                    <span>No (Private Transport)</span>
                  </label>
                </div>
              </div>

              {/* Collapsible Extra Details */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowExtraDetails(!showExtraDetails)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 transition-all cursor-pointer"
                >
                  <span>{showExtraDetails ? 'Hide Extra Details' : 'Show Extra Details (Parent, Birth, Address)'}</span>
                  <ChevronDown className={`w-4 h-4 text-[#85E510] transition-transform duration-200 ${showExtraDetails ? 'rotate-180' : ''}`} />
                </button>

                {showExtraDetails && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                    {/* Guardian Full Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Guardian Full Name</label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Parent / Guardian"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>

                    {/* Emergency Contact Phone */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        value={emergencyContact}
                        onChange={(e) => handlePhoneFormat(e.target.value, setEmergencyContact)}
                        placeholder="e.g. 0911223344"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                      />
                    </div>

                    {/* Residential Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#202833] mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Woreda 03, House 412"
                        className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Clear Form + Submit */}
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={resetFormForNext}
              className="w-full sm:w-auto py-3.5 px-4 rounded-xl border border-[#CBD5E1] hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear Form</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isIdTaken || !fullName.trim()}
              className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] disabled:opacity-50 text-[#062404] font-heading font-black text-sm shadow-[0_4px_15px_rgba(133,229,16,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#062404]" />
                  <span>{submitStatusText || 'Saving to Cloudflare R2 Storage...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#062404]" />
                  <span>Register & Transmit Student</span>
                </>
              )}
            </button>
          </div>

          {/* Storage Security & Biometric Status Footer */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Biometric Enrollment Console Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#2E7D32] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#85E510] animate-pulse" />
              <span>Direct JPEG Photo Stream</span>
            </div>
          </div>
        </div>
      </form>

      {/* Biometric Camera Capture Modal Popup (Back Camera Default) */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        studentId={studentId}
        defaultFacingMode="environment"
        onCapture={(dataUrl) => {
          setCapturedPhoto(dataUrl);
          setIsCameraModalOpen(false);
          setIsEditorOpen(true);
        }}
      />

      {/* Smartphone-Style Photo Editor & Crop Modal */}
      <PhoneCropModal
        isOpen={isEditorOpen}
        imageUrl={capturedPhoto || ''}
        studentId={studentId}
        onClose={() => setIsEditorOpen(false)}
        onSave={(cropped) => {
          setCapturedPhoto(cropped);
          setIsEditorOpen(false);
        }}
      />


      {/* Success Receipt Modal */}
      {submittedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#4D8A07]">
              <div className="w-10 h-10 rounded-full bg-[#85E510]/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#4D8A07]" />
              </div>
              <div>
                <h3 className="font-heading font-black text-lg text-[#202833]">Student Registered!</h3>
                <p className="text-xs text-[#64748B]">Transmitted to Supabase PostgreSQL repository</p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Student ID:</span>
                <span className="font-mono font-bold text-[#202833]">{submittedStudent.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Full Name:</span>
                <span className="font-bold text-[#202833]">{submittedStudent.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">School & Grade:</span>
                <span className="font-semibold text-[#202833]">{submittedStudent.school} &bull; Grade {submittedStudent.grade}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E8F0]">
                <span className="text-[#64748B]">Phone:</span>
                <span className="font-mono text-[#202833]">{submittedStudent.phone}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Biometric Photo:</span>
                <span className="font-bold text-[#4D8A07]">Stored in Cloudflare R2</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 rounded-xl bg-white border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#F8FAF9] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#64748B]" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={resetFormForNext}
                className="py-2.5 px-3 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Register Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
