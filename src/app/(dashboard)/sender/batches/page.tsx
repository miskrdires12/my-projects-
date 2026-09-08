"use client";

// ============================================================================
// STUDENT BRIDGE — SENDER BATCH SYSTEM & TRANSFER DISPATCH
// Group students into transfer batches, run pre-dispatch validation,
// track lifecycle: Draft -> Validating -> Ready -> Sent, view history.
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  Send,
  AlertCircle,
  FileCheck,
  Users,
  Camera,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  createBatchAction,
  validateBatchAction,
  sendBatchAction,
  getBatchesAction,
} from "@/actions/batches";
import { getStudentsAction } from "@/actions/students";

interface BatchItem {
  id: string;
  batchNumber: string;
  title: string;
  description?: string | null;
  totalStudents: number;
  totalPhotos: number;
  status: string;
  sentAt?: Date | string | null;
  receivedAt?: Date | string | null;
  createdAt: Date | string;
  errorsJson?: string | null;
}

interface StudentOption {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  photoPath: string | null;
  batchId: string | null;
}

export default function SenderBatchesPage() {
  const [isPending, startTransition] = useTransition();

  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);

  // Modal State for New Batch
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [batchTitle, setBatchTitle] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected batch for detail/error view
  const [inspectedBatch, setInspectedBatch] = useState<BatchItem | null>(null);

  useEffect(() => {
    loadBatches();
    loadUnbatchedStudents();
  }, []);

  const loadBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const data = await getBatchesAction();
      setBatches(data as unknown as BatchItem[]);
    } catch {
      // ignore
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const loadUnbatchedStudents = async () => {
    try {
      const res = await getStudentsAction({ pageSize: 5000 });
      if (res.students) {
        setAvailableStudents(
          res.students.map((s) => ({
            id: s.id,
            studentId: s.studentId,
            fullName: s.fullName,
            grade: s.grade,
            photoPath: s.photoPath,
            batchId: s.batchId,
          }))
        );
      }
    } catch {
      // ignore
    }
  };

  // Toggle student selection for new batch
  const handleToggleSelectAllUnbatched = () => {
    const unbatched = availableStudents.filter((s) => !s.batchId).map((s) => s.id);
    if (selectedStudentIds.length === unbatched.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(unbatched);
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Create Batch
  const handleCreateBatch = () => {
    if (!batchTitle.trim()) {
      setErrorMessage("Batch title is required.");
      return;
    }
    if (selectedStudentIds.length === 0) {
      setErrorMessage("Please select at least one student to group into this batch.");
      return;
    }

    startTransition(async () => {
      const res = await createBatchAction(batchTitle, batchDescription, selectedStudentIds);
      if (res.success) {
        setIsNewBatchOpen(false);
        setBatchTitle("");
        setBatchDescription("");
        setSelectedStudentIds([]);
        loadBatches();
        loadUnbatchedStudents();
      } else {
        setErrorMessage(res.error || "Failed to create batch.");
      }
    });
  };

  // Validate Batch
  const handleValidateBatch = (batchId: string) => {
    startTransition(async () => {
      await validateBatchAction(batchId);
      loadBatches();
    });
  };

  // Dispatch / Send Batch to Receiver
  const handleSendBatch = (batchId: string) => {
    if (!confirm("Are you ready to dispatch this student batch to the Receiver?")) return;
    startTransition(async () => {
      await sendBatchAction(batchId);
      loadBatches();
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-mono text-zinc-300">DRAFT</span>;
      case "VALIDATING":
        return <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono text-amber-400">VALIDATING</span>;
      case "READY":
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-mono text-blue-400">READY TO SEND</span>;
      case "SENT":
        return <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-mono text-purple-400">SENT</span>;
      case "RECEIVED":
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono text-emerald-400">RECEIVED</span>;
      case "PROCESSED":
        return <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-mono text-emerald-300 font-bold">PROCESSED</span>;
      case "FAILED":
        return <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-mono text-rose-400">FAILED</span>;
      default:
        return <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-mono text-zinc-400">{status}</span>;
    }
  };

  const unbatchedStudents = availableStudents.filter((s) => !s.batchId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back</span>
            </Link>
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              SENDER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">DISPATCH BATCHES</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Boxes className="h-6 w-6 text-accent" />
            <span>Student Transfer Batches</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Package registered students and verified portraits into production transfer batches
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage(null);
            setIsNewBatchOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Assemble New Batch</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-foreground-muted">Total Batches</div>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">{batches.length}</div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-foreground-muted">Unbatched Students</div>
          <div className="text-2xl font-bold font-mono text-accent mt-1">
            {unbatchedStudents.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-foreground-muted">Dispatched / Sent</div>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {batches.filter((b) => b.status === "SENT").length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs text-foreground-muted">Receiver Ingested</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {batches.filter((b) => b.status === "PROCESSED" || b.status === "RECEIVED").length}
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border bg-surface-secondary/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Transfer Batches & Dispatch History
          </h2>
          <span className="text-[10px] font-mono text-foreground-muted">
            {batches.length} BATCHES
          </span>
        </div>

        {isLoadingBatches ? (
          <div className="p-12 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Loading batch history...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-xs text-foreground-muted">
            No transfer batches created yet. Click &quot;Assemble New Batch&quot; to package students.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-secondary/40 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {batch.batchNumber}
                    </span>
                    {getStatusBadge(batch.status)}
                  </div>
                  <div className="text-xs font-medium text-foreground">{batch.title}</div>
                  {batch.description && (
                    <div className="text-[11px] text-foreground-muted">{batch.description}</div>
                  )}
                  <div className="flex items-center gap-4 text-[11px] font-mono text-foreground-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-accent" />
                      {batch.totalStudents} Students
                    </span>
                    <span className="flex items-center gap-1">
                      <Camera className="h-3 w-3 text-emerald-400" />
                      {batch.totalPhotos} Photos
                    </span>
                    <span>
                      Created: {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                    {batch.sentAt && (
                      <span className="text-purple-400">
                        Sent: {new Date(batch.sentAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Batch Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {batch.errorsJson && (
                    <button
                      onClick={() => setInspectedBatch(batch)}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Review Issues</span>
                    </button>
                  )}

                  {batch.status === "DRAFT" && (
                    <button
                      onClick={() => handleValidateBatch(batch.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-secondary transition-colors"
                    >
                      <FileCheck className="h-3.5 w-3.5 text-accent" />
                      <span>Validate Records</span>
                    </button>
                  )}

                  {(batch.status === "READY" || batch.status === "VALIDATING") && (
                    <button
                      onClick={() => handleSendBatch(batch.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch to Receiver</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assemble New Batch Modal */}
      {isNewBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex flex-col h-[85vh] w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-6 py-4">
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-accent" />
                <h3 className="text-sm font-semibold text-foreground">Assemble New Transfer Batch</h3>
              </div>
              <button
                onClick={() => setIsNewBatchOpen(false)}
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Batch Title <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  placeholder="e.g. Batch 2026-001 Grade 10 Spring Enrollment"
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Optional transfer notes for the Receiver production team..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-foreground">
                    Select Students ({selectedStudentIds.length} of {unbatchedStudents.length}{" "}
                    unbatched selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllUnbatched}
                    className="text-[11px] text-accent hover:underline"
                  >
                    {selectedStudentIds.length === unbatchedStudents.length
                      ? "Deselect All"
                      : "Select All Unbatched"}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-xl">
                  {unbatchedStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-foreground-muted">
                      No unbatched students available. Register students first.
                    </div>
                  ) : (
                    unbatchedStudents.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center justify-between p-3 text-xs hover:bg-surface-secondary cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={() => handleToggleStudent(s.id)}
                            className="accent-accent h-4 w-4 rounded"
                          />
                          <div>
                            <div className="font-semibold text-foreground">{s.fullName}</div>
                            <div className="text-[10px] font-mono text-accent">{s.studentId}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-foreground-muted">{s.grade}</span>
                          {s.photoPath ? (
                            <span className="text-[10px] text-emerald-400 font-mono">PHOTO OK</span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-mono">NO PHOTO</span>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-3">
              <button
                type="button"
                onClick={() => setIsNewBatchOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs text-foreground-muted hover:bg-surface-tertiary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={isPending || selectedStudentIds.length === 0}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Create Batch ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issues Review Modal */}
      {inspectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex flex-col max-h-[80vh] w-full max-w-lg rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-sm font-semibold text-foreground">
                  Validation Gaps — {inspectedBatch.batchNumber}
                </h3>
              </div>
              <button
                onClick={() => setInspectedBatch(null)}
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-96">
              {inspectedBatch.errorsJson && (
                <div className="space-y-2 text-xs">
                  {JSON.parse(inspectedBatch.errorsJson).map((err: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3"
                    >
                      <div className="font-mono font-bold text-rose-300">{err.studentId}</div>
                      <div className="text-foreground-muted mt-0.5">
                        {err.issues?.join(", ") || err.issue}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedBatch(null)}
                className="rounded-lg bg-surface-secondary border border-border px-4 py-2 text-xs text-foreground hover:bg-surface-tertiary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
