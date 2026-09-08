"use client";

// ============================================================================
// STUDENT BRIDGE — 8-UP A4 PRINT ENGINE & DRAGGABLE PHYSICAL IMPOSITION
// 90% White, 10% Black Monochrome Print Shop Design
// Features:
// - Interactive A4 Sheet (210 × 297mm) 8-Up Physical Imposition
// - Pick & Drag from Queue Selection directly into ANY slot on the A4 Sheet
// - Free movement: Drag cards between slots on the sheet to swap/reorder positions
// - Move controls, slot swapping, slot clearing, and auto-fill
// - Vector PDF output generation
// ============================================================================

import React, { useState, useEffect } from "react";
import {
  Printer,
  Sliders,
  FileText,
  Loader2,
  Download,
  AlertCircle,
  Eye,
  Layers,
  GripVertical,
  Trash2,
  Plus,
} from "lucide-react";
import { generateStudentPdfAction } from "@/actions/print";
import {
  VisualCardDesigner,
  DEFAULT_FIELD_CONFIG,
} from "@/components/print-engine/VisualCardDesigner";
import type { CardFieldConfig } from "@/types/print";

export interface StudentProjection {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  department?: string | null;
  school?: string | null;
  phone: string;
  sex: string;
  rollNumber?: string | null;
  photoPath?: string | null;
  qrCodeData?: string | null;
}

interface PrintEngineClientProps {
  students: StudentProjection[];
  totalCount?: number;
}

export const PrintEngineClient: React.FC<PrintEngineClientProps> = ({ students, totalCount }) => {
  const [activeTab, setActiveTab] = useState<"imposition" | "designer">("imposition");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(students.map((s) => s.id))
  );

  // 8 Physical Imposition Slots on the A4 Sheet
  const [impositionSlots, setImpositionSlots] = useState<(StudentProjection | null)[]>(
    Array.from({ length: 8 }).map((_, idx) => students[idx] || null)
  );
  const [draggedStudent, setDraggedStudent] = useState<StudentProjection | null>(null);
  const [draggedFromSlotIndex, setDraggedFromSlotIndex] = useState<number | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [organizationName, setOrganizationName] = useState("STUDENT BRIDGE");
  const [customConfig, setCustomConfig] = useState<CardFieldConfig>(DEFAULT_FIELD_CONFIG);
  const [templateSvg, setTemplateSvg] = useState<string | null>(null);
  const [cardBgColor, setCardBgColor] = useState<string>("#FFFFFF");
  const [cardBorderColor, setCardBorderColor] = useState<string>("#000000");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize first 8 slots when students cohort arrives if slots are empty
  useEffect(() => {
    if (students.length > 0) {
      setImpositionSlots((prev) => {
        if (prev.some(Boolean)) return prev;
        return Array.from({ length: 8 }).map((_, idx) => students[idx] || null);
      });
    }
  }, [students]);

  const selectedCount = selectedIds.size;
  const cardsPerPage = 8;
  const calculatedPages = Math.max(1, Math.ceil(selectedCount / cardsPerPage));

  const sampleStudent = students[0]
    ? {
        studentId: students[0].studentId,
        fullName: students[0].fullName,
        grade: students[0].grade,
        rollNumber: students[0].rollNumber || students[0].studentId,
        phone: students[0].phone,
        sex: students[0].sex,
        photoPath: students[0].photoPath,
      }
    : undefined;

  // ──────────────────────────────────────────────────────────────────────────
  // DRAG & DROP IMPOSITION HANDLERS (FAIL-SAFE JSON TRANSFER)
  // ──────────────────────────────────────────────────────────────────────────
  const handleQueueDragStart = (e: React.DragEvent, student: StudentProjection) => {
    setDraggedStudent(student);
    setDraggedFromSlotIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(student));
  };

  const handleSlotDragStart = (e: React.DragEvent, slotIdx: number) => {
    const student = impositionSlots[slotIdx];
    if (!student) return;
    setDraggedStudent(student);
    setDraggedFromSlotIndex(slotIdx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(student));
  };

  const handleSlotDragOver = (e: React.DragEvent, slotIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (hoveredSlotIndex !== slotIdx) {
      setHoveredSlotIndex(slotIdx);
    }
  };

  const handleSlotDrop = (targetSlotIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    setHoveredSlotIndex(null);

    let studentToPlace: StudentProjection | null = draggedStudent;
    if (!studentToPlace) {
      try {
        const raw = e.dataTransfer.getData("application/json");
        if (raw) studentToPlace = JSON.parse(raw);
      } catch {}
    }

    if (!studentToPlace) return;

    setImpositionSlots((prev) => {
      const next = [...prev];
      if (draggedFromSlotIndex !== null) {
        // Swap or move from another slot on the A4 sheet
        const existingAtTarget = next[targetSlotIdx];
        next[targetSlotIdx] = studentToPlace!;
        next[draggedFromSlotIndex] = existingAtTarget;
      } else {
        // Drop from Queue Selection
        next[targetSlotIdx] = studentToPlace!;
        setSelectedIds((s) => new Set(s).add(studentToPlace!.id));
      }
      return next;
    });

    setDraggedStudent(null);
    setDraggedFromSlotIndex(null);
  };

  const handleClearSlot = (slotIdx: number) => {
    setImpositionSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  };

  const handleAutoFillSlots = () => {
    setImpositionSlots((prev) => {
      const next = [...prev];
      let stuIdx = 0;
      for (let i = 0; i < 8; i++) {
        if (!next[i] && stuIdx < students.length) {
          next[i] = students[stuIdx];
          stuIdx++;
        }
      }
      return next;
    });
  };

  const handleClearAllSlots = () => {
    setImpositionSlots(Array(8).fill(null));
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(students.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Generate Vector PDF
  const handleGeneratePdf = async () => {
    // If slots are occupied, prioritize slots
    const activeSlotStudents = impositionSlots.filter(Boolean) as StudentProjection[];
    const idsToPrint =
      activeSlotStudents.length > 0
        ? activeSlotStudents.map((s) => s.id)
        : Array.from(selectedIds);

    if (idsToPrint.length === 0) {
      setErrorMessage("Please place at least one student onto the A4 sheet or select from queue.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await generateStudentPdfAction(idsToPrint, {
        includeCutMarks: includeCropMarks,
        organizationName,
        fieldConfig: customConfig,
        cardBackgroundColor: cardBgColor,
        cardBorderColor: cardBorderColor,
        templateSvg: templateSvg || undefined,
      });

      if (!res.success || !res.pdfBase64) {
        setErrorMessage(res.error ?? "Failed to generate ID PDF");
      } else {
        const binaryString = atob(res.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setGeneratedPdfUrl(url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PDF generation failed";
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 bg-white text-black min-h-screen">
      {/* View Switcher Tabs (90% White, 10% Black) */}
      <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("imposition")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "imposition"
              ? "bg-black text-white shadow-sm"
              : "border border-neutral-300 bg-white text-neutral-700 hover:text-black hover:border-black"
          }`}
        >
          <Printer className="h-4 w-4" />
          <span>8-Up A4 Imposition & PDF Generation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("designer")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "designer"
              ? "bg-black text-white shadow-sm"
              : "border border-neutral-300 bg-white text-neutral-700 hover:text-black hover:border-black"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Interactive Visual Template Designer</span>
        </button>
      </div>

      {/* TAB 1: VISUAL DESIGNER */}
      {activeTab === "designer" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-3.5 text-xs text-black flex items-center justify-between">
            <span>
              <strong>Visual Layout Customizer:</strong> Move and resize photo, QR, and text coordinates for the print engine.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("imposition")}
              className="font-bold text-black hover:underline text-xs"
            >
              Return to 8-Up Print Queue →
            </button>
          </div>

          <VisualCardDesigner
            initialConfig={customConfig}
            onConfigChange={(newCfg) => setCustomConfig(newCfg)}
            onTemplateChange={(svg, bg, border) => {
              setTemplateSvg(svg);
              setCardBgColor(bg);
              setCardBorderColor(border);
            }}
            sampleStudent={sampleStudent}
          />
        </div>
      )}

      {/* TAB 2: 8-UP A4 IMPOSITION WITH DRAG & DROP */}
      {activeTab === "imposition" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Interactive A4 Imposition Sheet */}
          <div className="lg:col-span-2 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-300 bg-red-50 p-4 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Imposition Metric Banner */}
            <div className="grid grid-cols-4 gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs text-xs">
              <div>
                <span className="font-mono text-neutral-500 uppercase text-[10px]">
                  Card Standard
                </span>
                <p className="font-bold text-black font-mono mt-0.5">CR80 (85.6 × 54mm)</p>
              </div>
              <div>
                <span className="font-mono text-neutral-500 uppercase text-[10px]">
                  Sheet Format
                </span>
                <p className="font-bold text-black font-mono mt-0.5">ISO A4 (210 × 297mm)</p>
              </div>
              <div>
                <span className="font-mono text-neutral-500 uppercase text-[10px]">
                  Active Sheet Slots
                </span>
                <p className="font-bold text-black font-mono mt-0.5">
                  {impositionSlots.filter(Boolean).length} / 8 Placed
                </p>
              </div>
              <div>
                <span className="font-mono text-neutral-500 uppercase text-[10px]">
                  Est. Sheet Pages
                </span>
                <p className="font-bold text-black font-mono mt-0.5">
                  {calculatedPages} {calculatedPages === 1 ? "page" : "pages"} ({(totalCount ?? students.length).toLocaleString()} total)
                </p>
              </div>
            </div>

            {/* Visual A4 Sheet Simulation Canvas with Interactive Drag & Drop Slots */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-wider text-black font-bold">
                    A4 SHEET (210 × 297mm) — 8-UP PHYSICAL IMPOSITION
                  </h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Drag any student card from the Queue to a slot, or drag cards between slots to rearrange positions
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFillSlots}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded border border-neutral-300 bg-white text-black hover:bg-neutral-100 transition-colors"
                  >
                    Auto-Fill 8 Slots
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllSlots}
                    className="px-2.5 py-1 text-[11px] font-mono rounded border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 transition-colors"
                  >
                    Clear Sheet
                  </button>
                </div>
              </div>

              {/* Scaled A4 Sheet representation */}
              <div className="mx-auto aspect-[210/297] max-w-md rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-4 shadow-lg relative flex flex-col justify-between">
                <div className="text-[9px] font-mono text-neutral-500 font-bold text-center">
                  A4 SHEET (210 × 297mm) — 8-UP PHYSICAL IMPOSITION
                </div>

                {/* 2 × 4 Card Grid Drop Zones */}
                <div className="grid grid-cols-2 grid-rows-4 gap-2.5 h-full my-2">
                  {impositionSlots.map((student, idx) => {
                    const isOccupied = !!student;
                    const isHovered = hoveredSlotIndex === idx;

                    return (
                      <div
                        key={idx}
                        draggable={isOccupied}
                        onDragStart={(e) => handleSlotDragStart(e, idx)}
                        onDragOver={(e) => handleSlotDragOver(e, idx)}
                        onDragLeave={() => setHoveredSlotIndex(null)}
                        onDrop={(e) => handleSlotDrop(idx, e)}
                        className={`rounded-lg border text-[8px] p-2 flex flex-col justify-between transition-all relative select-none ${
                          isHovered
                            ? "border-black ring-4 ring-black/20 bg-neutral-100 scale-[1.02]"
                            : isOccupied
                            ? "border-black bg-white text-black shadow-sm cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-black"
                            : "border-dashed border-neutral-300 bg-white/60 text-neutral-400 hover:border-black hover:bg-white"
                        }`}
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                          <span className="font-mono font-bold text-black flex items-center gap-1">
                            {isOccupied && <GripVertical className="h-3 w-3 text-neutral-400" />}
                            SLOT #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[6px] text-neutral-500">85.6mm</span>
                            {isOccupied && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearSlot(idx);
                                }}
                                className="h-3 w-3 text-neutral-400 hover:text-red-600 ml-1"
                                title="Remove from slot"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Content or Empty Dropzone */}
                        {isOccupied && student ? (
                          <div className="flex gap-2 items-center my-auto py-1">
                            <div className="h-8 w-6 shrink-0 rounded bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[7px] font-mono overflow-hidden">
                              {student.photoPath ? (
                                <img
                                  src={student.photoPath}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                "ID"
                              )}
                            </div>
                            <div className="min-w-0 truncate">
                              <div className="font-bold truncate text-[8px] text-black">
                                {student.fullName}
                              </div>
                              <div className="font-mono text-[7px] text-neutral-600">
                                {student.studentId} • {student.grade}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-neutral-400 text-[7px] font-mono py-3">
                            <span>Drop Card Here</span>
                            <span className="text-[6px] text-neutral-300">(From Queue)</span>
                          </div>
                        )}

                        {/* Slot Footer & Crop Marks */}
                        <div className="flex items-center justify-between text-[6px] text-neutral-400 border-t border-neutral-100 pt-0.5 font-mono">
                          <span>CR80</span>
                          <span>54.0mm</span>
                        </div>

                        {/* Guillotine Crop Marks */}
                        {includeCropMarks && (
                          <>
                            <span className="absolute top-0 left-0 h-1.5 w-1.5 border-t border-l border-black" />
                            <span className="absolute top-0 right-0 h-1.5 w-1.5 border-t border-r border-black" />
                            <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-black" />
                            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-black" />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[8px] font-mono text-neutral-500 text-center">
                  Drag cards to swap slots • Precision corner crop marks rendered for trimming
                </div>
              </div>
            </div>

            {/* Generated PDF Download Banner */}
            {generatedPdfUrl && (
              <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-5 shadow-sm flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white font-bold">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-black">
                      8-Up A4 Print Sheet Ready
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Vector PDF ready with {impositionSlots.filter(Boolean).length || selectedCount} cards
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href={generatedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-100"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </a>

                  <a
                    href={generatedPdfUrl}
                    download={`student-id-cards-8up-${Date.now()}.pdf`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Parameters & Draggable Student Queue Selector */}
          <div className="space-y-6">
            {/* Parameters Box */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-black font-bold">
                <Sliders className="h-4 w-4" />
                <span>Imposition Parameters</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-neutral-600 font-mono mb-1">Organization Header</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs text-black focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div>
                    <div className="font-semibold text-black">Guillotine Cutting Marks</div>
                    <div className="text-[10px] text-neutral-500">
                      Corner crop marks for physical trimming
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCropMarks}
                    onChange={(e) => setIncludeCropMarks(e.target.checked)}
                    className="rounded border-neutral-300 accent-black h-4 w-4"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={isGenerating}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black py-2.5 px-4 text-xs font-bold text-white uppercase tracking-wider hover:bg-neutral-800 shadow-sm disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Rendering Vector PDF...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>Generate A4 PDF ({impositionSlots.filter(Boolean).length || selectedCount})</span>
                  </>
                )}
              </button>
            </div>

            {/* Draggable Queue Selection (500/500) */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-black font-bold">
                    Queue Selection ({selectedCount}/{students.length})
                  </span>
                  <p className="text-[10px] text-neutral-500">
                    Drag any card from below into the A4 Sheet
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-black hover:underline font-mono font-semibold"
                  >
                    All
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-neutral-500 hover:underline font-mono"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Student draggable list */}
              <div className="max-h-96 overflow-y-auto space-y-1.5 divide-y divide-neutral-100 text-xs pr-1">
                {students.length === 0 ? (
                  <div className="text-center py-6 text-neutral-500 font-mono text-xs">
                    No student records in queue. Import students or enroll via sender.
                  </div>
                ) : (
                  students.map((s) => {
                    const checked = selectedIds.has(s.id);
                    const isPlaced = impositionSlots.some((slot) => slot?.id === s.id);

                    return (
                      <div
                        key={s.id}
                        draggable={true}
                        onDragStart={(e) => handleQueueDragStart(e, s)}
                        className={`flex items-center justify-between p-2 rounded cursor-grab active:cursor-grabbing transition-colors ${
                          isPlaced
                            ? "bg-neutral-100 border border-neutral-300"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleStudent(s.id)}
                            className="rounded h-3.5 w-3.5 text-black accent-black cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <GripVertical className="h-4 w-4 text-neutral-400 shrink-0" />
                          <div className="h-6 w-6 rounded bg-neutral-200 border border-neutral-300 flex items-center justify-center shrink-0 text-[8px] font-mono">
                            {s.photoPath ? (
                              <img
                                src={s.photoPath}
                                alt=""
                                className="h-full w-full object-cover rounded"
                              />
                            ) : (
                              "ID"
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-semibold text-black truncate">{s.fullName}</div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              {s.studentId} • {s.grade}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPlaced && (
                            <span className="text-[9px] font-mono font-bold text-black bg-white px-1.5 py-0.5 rounded border border-neutral-300">
                              ON SHEET
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              // Find first empty slot or swap first
                              const emptyIdx = impositionSlots.findIndex((slot) => slot === null);
                              if (emptyIdx !== -1) {
                                setImpositionSlots((prev) => {
                                  const next = [...prev];
                                  next[emptyIdx] = s;
                                  return next;
                                });
                              } else {
                                alert("All 8 slots on this sheet are occupied. Drag this card directly over any slot to swap or replace it.");
                              }
                            }}
                            className="px-2 py-1 text-[10px] font-mono font-semibold rounded border border-neutral-300 bg-white hover:bg-neutral-100 hover:border-black text-black flex items-center gap-1 transition-colors shadow-xs"
                            title="Place into next available sheet slot"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Slot</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
