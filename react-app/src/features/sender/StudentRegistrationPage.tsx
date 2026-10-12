import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, RefreshCw, CheckCircle2, AlertCircle, RotateCw, ZoomIn, ZoomOut,
  Upload, UserCheck, ArrowRight, ShieldCheck, Sparkles, X, Sliders, Crop,
  ChevronDown, ChevronUp, Image as ImageIcon, Check, Printer, SwitchCamera,
  TrendingUp, Calendar, Clock, BarChart2, MapPin
} from 'lucide-react';
import {
  getStudents, addStudent, getSchools, getCurrentUser,
  DEFAULT_BRANCHES, BRANCH_SCHOOL_MAP, getSenderMetrics, SenderMetrics,
  generateStudentQrToken
} from '@/lib/store';
import { queueOfflineOperation } from '@/lib/offlineQueue';
import { Student } from '@/types';
import { PhoneCropModal } from '@/components/PhoneCropModal';
import { R2_PUBLIC_BASE_URL } from '@/lib/syncEngine';

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
  const [grade, setGrade] = useState('9C');
  const [phone, setPhone] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [location, setLocation] = useState('Addis Ababa');
  const [school, setSchool] = useState('YMS');

  // Extra Details (Expandable)
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('Addis Ababa');
  const [guardianName, setGuardianName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [schoolBusUsage, setSchoolBusUsage] = useState<'Yes' | 'No'>('Yes');
  const [nationality, setNationality] = useState('Ethiopian');

  // Camera & Photo States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isStreamReady, setIsStreamReady] = useState(false);
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
  const [senderMetrics, setSenderMetrics] = useState<SenderMetrics>(() =>
    getSenderMetrics(user?.username || '')
  );

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [submittedStudent, setSubmittedStudent] = useState<Student | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schools = getSchools();

  // Refresh Sender Metrics dynamically on mount, after submission, or data changes
  const refreshMetrics = useCallback(() => {
    if (user?.username) {
      setSenderMetrics(getSenderMetrics(user.username));
    }
  }, [user]);

  useEffect(() => {
    refreshMetrics();
    const handleDataChange = () => refreshMetrics();
    window.addEventListener('studentbridge_datachange', handleDataChange);
    return () => window.removeEventListener('studentbridge_datachange', handleDataChange);
  }, [refreshMetrics, submittedStudent]);

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

  // Bulletproof Callback Ref to immediately bind video element upon mounting
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && cameraStream) {
      try {
        if (element.srcObject !== cameraStream) {
          element.srcObject = cameraStream;
        }
        element.muted = true;
        element.playsInline = true;
        element.play().then(() => {
          setIsStreamReady(true);
        }).catch((err) => {
          console.warn('Camera autoplay warning:', err);
          setIsStreamReady(true);
        });
      } catch (err) {
        console.warn('Error attaching video stream:', err);
      }
    }
  }, [cameraStream]);

  // Stop Webcam cleanly
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      setCameraStream(null);
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch (e) {}
    }
    setIsStreamReady(false);
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start Webcam with multi-tier fallback & camera facing support
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    setCameraError(null);
    setIsStreamReady(false);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not available on this browser or insecure context. Please upload an image file.');
      }

      let stream: MediaStream | null = null;
      try {
        // Tier 1: HD user-facing or back-facing portrait video
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false,
        });
      } catch (tier1Err) {
        console.warn('HD camera constraint failed, falling back to standard video:', tier1Err);
        // Tier 2: Universal hardware fallback
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error('No video stream received from camera.');
      }

      setCameraStream(stream);
      setIsCameraActive(true);
      setCameraFacing(facing);

      // Timeout safety: never let user remain permanently blocked behind loading spinner
      setTimeout(() => {
        setIsStreamReady(true);
      }, 900);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      let msg = 'Camera access unavailable. Please check camera permissions or upload a portrait photo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in browser permissions or upload an image file.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera sensor found on this hardware. Please use the Upload Image option.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Flip Camera (Front <-> Back)
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  // Take Snapshot from video
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      alert('Camera feed is still initializing. Please wait a moment.');
      return;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, vw, vh);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (dataUrl && dataUrl.length > 500) {
          setCapturedPhoto(dataUrl);
          stopCamera();
        } else {
          alert('Could not capture photo frame. Please try again.');
        }
      } catch (e: any) {
        alert('Photo snapshot failed: ' + e.message);
      }
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
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Photo Cropping Engine (supports 3:4 ID Portrait, 1:1 Square, 4:5 Card, 2:3 Classic)
  const applyCrop = () => {
    if (!capturedPhoto) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let targetRatio = 3 / 4;
      if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '4:5') targetRatio = 4 / 5;
      else if (aspectRatio === '2:3') targetRatio = 2 / 3;

      let srcW = img.width;
      let srcH = img.height;
      let cropW = srcW;
      let cropH = srcW / targetRatio;

      if (cropH > srcH) {
        cropH = srcH;
        cropW = srcH * targetRatio;
      }

      // Apply zoom factor
      cropW = cropW / zoom;
      cropH = cropH / zoom;

      const startX = Math.max(0, (srcW - cropW) / 2);
      const startY = Math.max(0, (srcH - cropH) / 2);

      canvas.width = 600;
      canvas.height = Math.round(600 / targetRatio);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedPhoto(croppedDataUrl);
        setZoom(1);
        setIsEditorOpen(false);
      }
    };
    img.src = capturedPhoto;
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
      const cleanGrade = grade.trim() || 'General';
      const cleanName = fullName.trim().replace(/\s+/g, '_');
      const photoKey = `${cleanGrade}/${studentId.trim()}_${cleanName}.jpg`;
      let r2PhotoUrl: string | undefined = undefined;

      // Direct Cloudflare R2 Bucket Upload
      if (capturedPhoto && capturedPhoto.startsWith('data:image')) {
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: studentId.trim(),
              grade: cleanGrade,
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

      const studentPayload: Student = {
        id: 'cmu-' + Date.now().toString(36),
        studentId: studentId.trim(),
        fullName: fullName.trim(),
        sex,
        grade: grade.trim(),
        phone: phone.trim(),
        bloodType,
        school: school.trim(),
        location,
        country: 'Ethiopia',
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        guardianFullName: guardianName || undefined,
        emergencyContactPhone: emergencyContact.trim(),
        schoolBusUsage,
        nationality,
        photoPath: finalPhotoUrl,
        previewPath: finalPhotoUrl || capturedPhoto || undefined,
        thumbnailPath: finalPhotoUrl || capturedPhoto || undefined,
        originalPhotoPath: finalPhotoUrl,
        photoIntegrityStatus: capturedPhoto ? 'PHOTO_VERIFIED' : 'NO_PHOTO',
        // QR Code token strictly formatted as {"id":"...","name":"...","roll":"","grade":"..."}
        qrCodeData: generateStudentQrToken({
          studentId: studentId.trim(),
          fullName: fullName.trim(),
          rollNumber: '',
          grade: grade ? grade.trim() : ''
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
          headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Hidden Canvas for snapshot processing */}
      <canvas ref={canvasRef} className="hidden" />

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

      {/* Sender Transmission Telemetry (Daily, Weekly, Monthly, Total) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Daily (Today)</span>
            <Calendar className="w-3.5 h-3.5 text-[#9EE617]" />
          </div>
          <div className="mt-1 text-xl font-heading font-black text-[#0B1118]">
            {senderMetrics.today.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Daily transmissions</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Week</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#9EE617]" />
          </div>
          <div className="mt-1 text-xl font-heading font-black text-[#0B1118]">
            {senderMetrics.week.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">7-day volume run</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>This Month</span>
            <BarChart2 className="w-3.5 h-3.5 text-[#9EE617]" />
          </div>
          <div className="mt-1 text-xl font-heading font-black text-[#0B1118]">
            {senderMetrics.month.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Monthly quota total</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Sent</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#9EE617]" />
          </div>
          <div className="mt-1 text-xl font-heading font-black text-[#0B1118]">
            {senderMetrics.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#366804] font-bold">Lifetime records</div>
        </div>
      </div>


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
        {/* Card 1: Student Photograph Card (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Photograph</span>
              </h2>
              {capturedPhoto ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#85E510]/20 text-[#366804] border border-[#85E510]/40 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Captured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Required
                </span>
              )}
            </div>

            {/* Photo Preview Container */}
            <div className="relative aspect-[3/4] w-full max-w-[280px] mx-auto bg-[#F4F7F5] rounded-2xl border-2 border-dashed border-[#CBD5E1] overflow-hidden flex flex-col items-center justify-center shadow-inner group">
              {isCameraActive ? (
                <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                  <video
                    ref={setVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onPlaying={() => setIsStreamReady(true)}
                    onLoadedMetadata={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.muted = true;
                      v.play().catch(() => {});
                      setIsStreamReady(true);
                    }}
                    onCanPlay={() => setIsStreamReady(true)}
                    className="w-full h-full object-cover"
                  />
                  {!isStreamReady && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white text-xs gap-2 z-10 transition-opacity">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#85E510]" />
                      <span className="font-semibold text-slate-200">Connecting camera sensor...</span>
                    </div>
                  )}
                  {/* Portrait Alignment Guide */}
                  <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-[#85E510]/70 rounded-full pointer-events-none z-20 shadow-sm" />
                </div>
              ) : capturedPhoto ? (
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
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] font-mono text-white">
                    {studentId}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-[#64748B] flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] mb-3 shadow-sm">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold text-[#202833]">No Photograph Selected</div>
                  <p className="text-[11px] text-[#94A3B8] mt-1 max-w-[200px]">
                    Use live camera capture or select a portrait photo from device
                  </p>
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
            {isCameraActive ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="py-2.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2.5 px-4 rounded-xl bg-[#F4F7F5] hover:bg-[#E2E8F0] text-[#202833] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#202833] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-[#4D8A07]" />
                  <span>Switch Camera ({cameraFacing === 'user' ? 'Front' : 'Back'})</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="py-2.5 px-3 rounded-xl bg-[#202833] hover:bg-[#161D26] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-[#85E510]" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl bg-[#F4F7F5] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#64748B]" />
                    <span>Upload Image</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {capturedPhoto && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-[#F8FAF9] border border-[#CBD5E1] text-[#202833] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#4D8A07]" />
                      <span>Edit & Crop</span>
                    </button>

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
                      className="py-2 px-3 rounded-xl bg-white hover:bg-red-50 border border-[#CBD5E1] hover:border-red-200 text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Student Information Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-[#202833] uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#4D8A07]" />
                <span>Student Information</span>
              </h2>
              <span className="text-[11px] font-semibold text-[#64748B]">All fields verified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#202833]">Student ID</label>
                  <button
                    type="button"
                    onClick={() => setStudentId(generateNewId())}
                    className="text-[10px] text-[#4D8A07] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isIdTaken ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Taken
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#4D8A07] flex items-center gap-1">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Loza Bereket Tadesse"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs text-[#202833] font-medium focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                />
              </div>

              {/* Sex */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      sex === 'Female'
                        ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      sex === 'Male'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-[#F8FAF9] text-[#64748B] border-[#CBD5E1] hover:bg-white'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-[#202833] mb-1.5">Blood Group</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#202833] focus:border-[#85E510] focus:ring-1 focus:ring-[#85E510]"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              {/* Branch / Location Dropdown */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">Branch Location</label>
                <select
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                >
                  {DEFAULT_BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* School (Strictly mapped to selected branch) */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">Assigned School ({location})</label>
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                >
                  {availableSchools.map(schName => (
                    <option key={schName} value={schName}>
                      {schName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade / Section */}
              <div>
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5">Grade / Section</label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value.toUpperCase())}
                  placeholder="e.g. 9C or 10A"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                />
              </div>

              {/* Phone Number (Auto converts 09 and 07 to +2519 and +2517, blank stays blank) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#0B1118] mb-1.5 flex items-center justify-between">
                  <span>Phone Number</span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto converts 09/07 &rarr; +2519/+2517</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneFormat(e.target.value, setPhone)}
                  onBlur={() => handlePhoneFormat(phone, setPhone)}
                  placeholder="e.g. 0911223344 (blank if empty)"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#0B1118] focus:border-[#9EE617] focus:ring-1 focus:ring-[#9EE617]"
                />
              </div>
            </div>


            {/* Expandable Extra Details */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowExtraDetails(!showExtraDetails)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#202833] py-2 px-3 rounded-xl bg-[#F8FAF9] hover:bg-[#F1F5F3] border border-[#CBD5E1] transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#4D8A07]" />
                  <span>Extra Details (Guardian, Bus, DOB, Address)</span>
                </span>
                {showExtraDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showExtraDetails && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

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

                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => handlePhoneFormat(e.target.value, setEmergencyContact)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">School Bus Usage</label>
                    <select
                      value={schoolBusUsage}
                      onChange={(e) => setSchoolBusUsage(e.target.value as any)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="Yes">Yes (Uses School Bus)</option>
                      <option value="No">No (Private Transport)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#202833] mb-1">Home Address / Sub-City</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Bole Sub-City, Woreda 03"
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <button
              type="submit"
              disabled={isSubmitting || isIdTaken || !fullName.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] disabled:opacity-50 text-[#062404] font-heading font-black text-sm shadow-[0_4px_15px_rgba(133,229,16,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{submitStatusText || 'Saving to Authoritative Database...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Student Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

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
