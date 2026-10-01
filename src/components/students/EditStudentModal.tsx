"use client";

// ============================================================================
// STUDENT BRIDGE — COMPREHENSIVE STUDENT RECORD EDITOR
// Allows editing any student demographic details and saving updates immediately
// ============================================================================

import React, { useState, useTransition } from "react";
import {
  Save,
  X,
  AlertCircle,
  Loader2,
  School,
  MapPin,
  User,
} from "lucide-react";
import type { StudentExtended } from "@/types/student";
import { updateStudentAction } from "@/actions/students";
import { saveStudentToDB } from "@/lib/idb-storage";
import { publishStudentSync } from "@/lib/sync-client";

interface EditStudentModalProps {
  student: StudentExtended | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedStudent: StudentExtended) => void;
}

const SCHOOLS_BY_SECTION: Record<string, string[]> = {
  Adama: ["Sena Yerosen", "Debebech", "Yacine", "Odda"],
  "Addis Ababa": ["YMS", "Adika Youth", "School Of America"],
  Mojjo: ["Mojjo"],
};

export function capitalizeName(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

export default function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSaved,
}: EditStudentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(student?.fullName || "");
  const [studentId, setStudentId] = useState(student?.studentId || "");
  const [grade, setGrade] = useState(student?.grade || "10");
  const [sex, setSex] = useState(student?.sex || "Male");
  const [phone, setPhone] = useState(student?.phone || "");
  const [section, setSection] = useState(student?.address || "Adama");
  const [school, setSchool] = useState(student?.school || "Sena Yerosen");
  const [guardianFullName, setGuardianFullName] = useState(student?.guardianFullName || "");
  const [emergencyPhone, setEmergencyPhone] = useState(student?.emergencyContactPhone || "");
  const [bloodType, setBloodType] = useState(student?.bloodType || "");
  const [status, setStatus] = useState(student?.status || "ACTIVE");

  // Sync state whenever student prop changes
  React.useEffect(() => {
    if (student) {
      setFullName(student.fullName || "");
      setStudentId(student.studentId || "");
      setGrade(student.grade || "10");
      setSex(student.sex || "Male");
      setPhone(student.phone || "");
      setSection(student.address || "Adama");
      setSchool(student.school || "Sena Yerosen");
      setGuardianFullName(student.guardianFullName || "");
      setEmergencyPhone(student.emergencyContactPhone || "");
      setBloodType(student.bloodType || "");
      setStatus(student.status || "ACTIVE");
      setErrorMessage(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const availableSchools = SCHOOLS_BY_SECTION[section] || [];

  const handleSectionChange = (newSec: string) => {
    setSection(newSec);
    const schools = SCHOOLS_BY_SECTION[newSec] || [];
    if (schools.length > 0 && !schools.includes(school)) {
      setSchool(schools[0]);
    }
  };

  const handlePhoneChange = (val: string) => {
    let p = val;
    // Auto convert 07... to +2517...
    if (p.startsWith("07")) {
      p = "+2517" + p.substring(2);
    } else if (p.startsWith("09")) {
      p = "+2519" + p.substring(2);
    }
    setPhone(p);
  };

  const handleNameBlur = () => {
    if (fullName) {
      setFullName(capitalizeName(fullName));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict validation: Reject slashes '/' in name or student ID
    if (fullName.includes("/") || fullName.includes("\\")) {
      setErrorMessage("Please remove any mark like '/' from the Student Name before saving.");
      return;
    }
    if (studentId.includes("/") || studentId.includes("\\")) {
      setErrorMessage("Please remove any mark like '/' from the Student ID before saving.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }
    if (!studentId.trim()) {
      setErrorMessage("Student ID is required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          studentId: studentId.trim(),
          fullName: capitalizeName(fullName.trim()),
          grade: grade.trim(),
          sex,
          phone: phone.trim(),
          school: school.trim(),
          address: section.trim(),
          guardianFullName: guardianFullName ? capitalizeName(guardianFullName.trim()) : null,
          emergencyContactPhone: emergencyPhone ? emergencyPhone.trim() : null,
          bloodType: bloodType && bloodType.trim() !== "Unknown" ? bloodType.trim() : null,
          status: status as any,
        };

        const res = await updateStudentAction(student.id, payload);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to save updated student record.");
          return;
        }

        const updatedRecord: StudentExtended = {
          ...student,
          ...payload,
        };

        // Update IndexedDB
        await saveStudentToDB(updatedRecord as any).catch(() => {});

        // Broadcast to all connected devices
        publishStudentSync("UPSERT", updatedRecord as any).catch(() => {});

        onSaved(updatedRecord);
        onClose();
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to save changes.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111613] shadow-2xl text-neutral-900 dark:text-neutral-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#161e19]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#8fe617]/20 text-[#062404] dark:text-[#8fe617]">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base font-mono text-neutral-900 dark:text-neutral-100">
                Edit Student Information
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                Editing: <span className="font-bold text-[#8fe617]">{student.fullName}</span> ({student.studentId})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-mono font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student ID */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Student ID *
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Name (Auto-Capitalized) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={handleNameBlur}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Grade */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Grade / Class *
              </label>
              <input
                type="text"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none"
              />
            </div>

            {/* Sex */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Gender / Sex *
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Phone (+2517 / +2519) *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+2517... or +2519..."
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Section / Branch */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                <span>Section / Location *</span>
              </label>
              <select
                value={section}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none cursor-pointer"
              >
                <option value="Adama">Adama Section</option>
                <option value="Addis Ababa">Addis Ababa Section</option>
                <option value="Mojjo">Mojjo Section</option>
              </select>
            </div>

            {/* School */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                <School className="h-3.5 w-3.5 text-[#8fe617]" />
                <span>School Name *</span>
              </label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none cursor-pointer"
              >
                {availableSchools.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Guardian Name */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Father / Guardian Full Name
              </label>
              <input
                type="text"
                value={guardianFullName}
                onChange={(e) => setGuardianFullName(e.target.value)}
                onBlur={() => setGuardianFullName(capitalizeName(guardianFullName))}
                placeholder="Father's full name"
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none"
              />
            </div>

            {/* Emergency Phone */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Emergency Phone
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Emergency contact"
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 focus:border-[#8fe617] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Blood Type */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Blood Group / Type
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none cursor-pointer"
              >
                <option value="">No Blood Group</option>
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

            {/* Status */}
            <div>
              <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Enrollment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#161e19] px-3.5 py-2.5 font-bold focus:border-[#8fe617] focus:outline-none cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="GRADUATED">GRADUATED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="TRANSFERRED">TRANSFERRED</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-black text-xs hover:brightness-105 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 stroke-[2.5]" />
                  <span>SAVE EDITED DATA</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
