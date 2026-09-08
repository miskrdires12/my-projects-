"use client";

// ============================================================================
// STUDENT BRIDGE — RECEIVER INBOUND BATCH INGESTION & REVIEW
// Production receiving dashboard: Accept, Reject, Review, Process, Archive
// ============================================================================

import React, { useState, useEffect, useTransition } from "react";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Users,
  Camera,
  Loader2,
} from "lucide-react";
import {
  getBatchesAction,
  acceptBatchAction,
  rejectBatchAction,
  processBatchAction,
} from "@/actions/batches";

interface BatchItem {
  id: string;
  batchNumber: string;
  senderName: string;
  title: string;
  description?: string | null;
  totalStudents: number;
  totalPhotos: number;
  status: string;
  sentAt?: Date | string | null;
  receivedAt?: Date | string | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
  errorsJson?: string | null;
}

export default function ReceiverBatchesPage() {
  const [isPending, startTransition] = useTransition();
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Rejection modal
  const [rejectModalBatchId, setRejectModalBatchId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadBatches();
  }, [filterStatus]);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await getBatchesAction(filterStatus);
      setBatches(data as unknown as BatchItem[]);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (id: string) => {
    startTransition(async () => {
      await acceptBatchAction(id);
      loadBatches();
    });
  };

  const handleProcess = (id: string) => {
    startTransition(async () => {
      await processBatchAction(id);
      loadBatches();
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectModalBatchId || !rejectReason.trim()) return;
    startTransition(async () => {
      await rejectBatchAction(rejectModalBatchId, rejectReason);
      setRejectModalBatchId(null);
      setRejectReason("");
      loadBatches();
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-accent font-semibold tracking-wider uppercase">
              RECEIVER PLATFORM
            </span>
            <span className="text-xs text-foreground-muted">/</span>
            <span className="text-xs text-foreground-muted">INBOUND BATCHES</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <Inbox className="h-6 w-6 text-accent" />
            <span>Inbound Student Batches</span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Review, accept, ingest, and process verified student records dispatched from Senders
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface p-1">
          {["ALL", "SENT", "RECEIVED", "PROCESSED", "FAILED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === status
                  ? "bg-accent text-white shadow-glow"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Feed */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border bg-surface-secondary/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Inbound Pipeline Queue
          </h2>
          <span className="text-[10px] font-mono text-foreground-muted">
            {batches.length} BATCHES
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Fetching incoming batches...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-xs text-foreground-muted">
            No incoming batches in this status.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-surface-secondary/30 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {batch.batchNumber}
                    </span>
                    <span className="text-xs text-foreground-muted font-mono">
                      from: <strong className="text-accent">{batch.senderName}</strong>
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold ${
                        batch.status === "SENT"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-pulse"
                          : batch.status === "RECEIVED"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          : batch.status === "PROCESSED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-foreground">{batch.title}</div>
                  {batch.description && (
                    <div className="text-xs text-foreground-muted">{batch.description}</div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono text-foreground-muted pt-1">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      <strong>{batch.totalStudents}</strong> Students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-emerald-400" />
                      <strong>{batch.totalPhotos}</strong> Photos
                    </span>
                    {batch.sentAt && (
                      <span>
                        Sent: {new Date(batch.sentAt).toLocaleDateString()}
                      </span>
                    )}
                    {batch.receivedAt && (
                      <span>
                        Accepted: {new Date(batch.receivedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Receiver Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {batch.status === "SENT" && (
                    <>
                      <button
                        onClick={() => handleAccept(batch.id)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-emerald-500 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Accept Batch</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectModalBatchId(batch.id);
                          setRejectReason("");
                        }}
                        disabled={isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {batch.status === "RECEIVED" && (
                    <button
                      onClick={() => handleProcess(batch.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>Process into Directory</span>
                    </button>
                  )}

                  {batch.status === "PROCESSED" && (
                    <span className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Ingested in Production
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="flex flex-col w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Reject Inbound Batch</h3>
            <p className="text-xs text-foreground-muted">
              Provide feedback reason for the Sender explaining why this batch was rejected:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing 14 portraits for Grade 10-A, invalid names..."
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-secondary px-3 py-2 text-xs text-foreground focus:border-rose-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalBatchId(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs text-foreground-muted hover:bg-surface-tertiary"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isPending || !rejectReason.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
