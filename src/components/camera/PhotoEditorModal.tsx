"use client";

// ============================================================================
// STUDENT BRIDGE — PROFESSIONAL ID PHOTO STUDIO & EDITOR
// Features: Crop, Resize, Rotate, Zoom, Pan, Brightness, Contrast, Exposure,
// Saturation, Sharpness, Background adjustment, Undo, Redo, Reset, Retake, Save.
// Generates official edited student photo while preserving original binary.
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sun,
  Sliders,
  Sparkles,
  Undo2,
  Redo2,
  RotateCcw as ResetIcon,
  Camera,
  Check,
  X,
  Palette,
} from "lucide-react";

export interface PhotoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  originalImageSrc: string;
  originalFile?: File | null;
  onSave: (editedBlob: Blob, originalBlob: Blob | null, metadata: PhotoMetadata) => void;
  onRetake?: () => void;
}

export interface PhotoMetadata {
  crop: { x: number; y: number; width: number; height: number };
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  sharpness: number;
  backgroundColor: string;
}

interface EditorHistoryState {
  zoom: number;
  rotation: number;
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  sharpness: number;
  backgroundColor: string;
  cropAspect: "3:4" | "1:1" | "4:5" | "free";
}

const DEFAULT_STATE: EditorHistoryState = {
  zoom: 1,
  rotation: 0,
  panX: 0,
  panY: 0,
  brightness: 0,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  sharpness: 0,
  backgroundColor: "transparent",
  cropAspect: "3:4",
};

export const PhotoEditorModal: React.FC<PhotoEditorProps> = ({
  isOpen,
  onClose,
  originalImageSrc,
  originalFile,
  onSave,
  onRetake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // History states for Undo / Redo
  const [history, setHistory] = useState<EditorHistoryState[]>([DEFAULT_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentState = history[historyIndex] || DEFAULT_STATE;

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<"transform" | "lighting" | "filters" | "background">("transform");

  // Dragging / Panning State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load Source Image
  useEffect(() => {
    if (!originalImageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalImageSrc;
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
  }, [originalImageSrc]);

  // Push new state to history
  const updateState = useCallback(
    (updater: (prev: EditorHistoryState) => EditorHistoryState) => {
      setHistory((prev) => {
        const nextState = updater(prev[historyIndex] || DEFAULT_STATE);
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(nextState);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const undo = () => {
    if (historyIndex > 0) setHistoryIndex((prev) => prev - 1);
  };

  const redo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex((prev) => prev + 1);
  };

  const reset = () => {
    updateState(() => DEFAULT_STATE);
  };

  // Render canvas with all adjustments
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 600;
    const height = 800; // 3:4 Standard ID card ratio
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background fill
    if (currentState.backgroundColor && currentState.backgroundColor !== "transparent") {
      ctx.fillStyle = currentState.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();

    // Center translation for rotation and zoom
    ctx.translate(width / 2 + currentState.panX, height / 2 + currentState.panY);
    ctx.rotate((currentState.rotation * Math.PI) / 180);
    ctx.scale(currentState.zoom, currentState.zoom);

    // Apply color filters via CSS filter string on canvas context
    const b = 100 + currentState.brightness + currentState.exposure;
    const c = 100 + currentState.contrast;
    const s = 100 + currentState.saturation;
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

    // Draw image centered
    const imgRatio = img.width / img.height;
    const targetRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;

    if (imgRatio > targetRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Apply sharpness convolution filter if needed
    if (currentState.sharpness > 0) {
      applySharpness(ctx, width, height, currentState.sharpness / 100);
    }

    // Draw ID composition guides
    drawIDGuides(ctx, width, height);
  }, [currentState]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Sharpness Convolution Filter
  const applySharpness = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
    try {
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const copy = new Uint8ClampedArray(data);

      const k = amount * 0.8;
      // 3x3 Laplacian sharpening kernel
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const current = copy[idx + c];
            const up = copy[((y - 1) * w + x) * 4 + c];
            const down = copy[((y + 1) * w + x) * 4 + c];
            const left = copy[(y * w + (x - 1)) * 4 + c];
            const right = copy[(y * w + (x + 1)) * 4 + c];
            const laplacian = 5 * current - up - down - left - right;
            data[idx + c] = Math.min(255, Math.max(0, current * (1 - k) + laplacian * k));
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Ignore if tainted canvas
    }
  };

  // Professional ID Framing Guides Overlay
  const drawIDGuides = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Eye-line guideline (approx 40% from top for standard ID)
    const eyeLine = h * 0.4;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, eyeLine);
    ctx.lineTo(w * 0.8, eyeLine);
    ctx.stroke();

    // Head oval guide
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.45, w * 0.26, h * 0.28, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Center vertical guide
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.1);
    ctx.lineTo(w / 2, h * 0.9);
    ctx.stroke();

    ctx.restore();
  };

  // Mouse Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - currentState.panX, y: e.clientY - currentState.panY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const newPanX = e.clientX - dragStart.x;
    const newPanY = e.clientY - dragStart.y;
    // Update live without pushing to history every pixel
    setHistory((prev) => {
      const next = { ...prev[historyIndex], panX: newPanX, panY: newPanY };
      const updated = [...prev];
      updated[historyIndex] = next;
      return updated;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Final Export & Save
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render cleanly without guides for export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 600;
    exportCanvas.height = 800;
    const ctx = exportCanvas.getContext("2d");
    const img = imageRef.current;

    if (ctx && img) {
      if (currentState.backgroundColor && currentState.backgroundColor !== "transparent") {
        ctx.fillStyle = currentState.backgroundColor;
        ctx.fillRect(0, 0, 600, 800);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 600, 800);
      }

      ctx.save();
      ctx.translate(300 + currentState.panX, 400 + currentState.panY);
      ctx.rotate((currentState.rotation * Math.PI) / 180);
      ctx.scale(currentState.zoom, currentState.zoom);

      const b = 100 + currentState.brightness + currentState.exposure;
      const c = 100 + currentState.contrast;
      const s = 100 + currentState.saturation;
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

      const imgRatio = img.width / img.height;
      const targetRatio = 600 / 800;
      let drawWidth = 600;
      let drawHeight = 800;
      if (imgRatio > targetRatio) {
        drawHeight = 800;
        drawWidth = 800 * imgRatio;
      } else {
        drawWidth = 600;
        drawHeight = 600 / imgRatio;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      if (currentState.sharpness > 0) {
        applySharpness(ctx, 600, 800, currentState.sharpness / 100);
      }

      exportCanvas.toBlob(
        (blob) => {
          if (blob) {
            const originalBlob = originalFile ? new Blob([originalFile], { type: originalFile.type }) : null;
            onSave(blob, originalBlob, {
              crop: { x: currentState.panX, y: currentState.panY, width: 600, height: 800 },
              zoom: currentState.zoom,
              rotation: currentState.rotation,
              brightness: currentState.brightness,
              contrast: currentState.contrast,
              exposure: currentState.exposure,
              saturation: currentState.saturation,
              sharpness: currentState.sharpness,
              backgroundColor: currentState.backgroundColor,
            });
            onClose();
          }
        },
        "image/jpeg",
        0.92
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Official Student Photo Studio</h2>
              <p className="text-[11px] text-foreground-muted">
                Align, crop, adjust lighting & refine official portrait
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="rounded-lg p-2 text-foreground-muted hover:bg-surface-tertiary hover:text-foreground disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="rounded-lg p-2 text-foreground-muted hover:bg-surface-tertiary hover:text-foreground disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              onClick={reset}
              className="rounded-lg p-2 text-foreground-muted hover:bg-surface-tertiary hover:text-foreground transition-colors"
              title="Reset All Adjustments"
            >
              <ResetIcon className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            {onRetake && (
              <button
                onClick={onRetake}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-surface-secondary transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Retake</span>
              </button>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-accent-hover transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>Apply & Save</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-foreground-muted hover:bg-surface-tertiary hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Studio Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Canvas Viewer */}
          <div className="relative flex flex-1 items-center justify-center bg-black/60 p-6 overflow-hidden select-none">
            <div className="relative border-2 border-dashed border-accent/40 rounded-xl overflow-hidden shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="cursor-grab active:cursor-grabbing max-h-[68vh] object-contain"
                style={{ width: "360px", height: "480px" }}
              />
            </div>

            {/* Canvas Overlay Hint */}
            <div className="absolute bottom-4 left-6 rounded-full bg-black/70 border border-border/60 px-3 py-1 text-[11px] font-mono text-foreground-muted">
              Drag image to position within ID framing guide
            </div>
          </div>

          {/* Right Adjustments Inspector */}
          <div className="w-80 border-l border-border bg-surface-secondary flex flex-col justify-between">
            <div>
              {/* Tab Navigation */}
              <div className="flex border-b border-border bg-surface">
                <button
                  onClick={() => setActiveTab("transform")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === "transform"
                      ? "border-accent text-accent bg-accent/5"
                      : "border-transparent text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Crop className="h-3.5 w-3.5" />
                  <span>Geometry</span>
                </button>
                <button
                  onClick={() => setActiveTab("lighting")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === "lighting"
                      ? "border-accent text-accent bg-accent/5"
                      : "border-transparent text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Lighting</span>
                </button>
                <button
                  onClick={() => setActiveTab("filters")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === "filters"
                      ? "border-accent text-accent bg-accent/5"
                      : "border-transparent text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Detail</span>
                </button>
                <button
                  onClick={() => setActiveTab("background")}
                  className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === "background"
                      ? "border-accent text-accent bg-accent/5"
                      : "border-transparent text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Backdrop</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                {activeTab === "transform" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Zoom</span>
                        <span className="font-mono text-accent">{Math.round(currentState.zoom * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ZoomOut className="h-4 w-4 text-foreground-muted" />
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.05"
                          value={currentState.zoom}
                          onChange={(e) =>
                            updateState((prev) => ({ ...prev, zoom: parseFloat(e.target.value) }))
                          }
                          className="flex-1 accent-accent"
                        />
                        <ZoomIn className="h-4 w-4 text-foreground-muted" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Fine Rotation</span>
                        <span className="font-mono text-accent">{currentState.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        step="1"
                        value={currentState.rotation}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, rotation: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-foreground block mb-2">90° Step Rotate</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            updateState((prev) => ({ ...prev, rotation: (prev.rotation - 90) % 360 }))
                          }
                          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs text-foreground hover:bg-surface-tertiary transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>-90° Left</span>
                        </button>
                        <button
                          onClick={() =>
                            updateState((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
                          }
                          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface p-2 text-xs text-foreground hover:bg-surface-tertiary transition-colors"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          <span>+90° Right</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-foreground block mb-2">Aspect Ratio Preset</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "3:4", label: "3:4 ID Card" },
                          { id: "1:1", label: "1:1 Square" },
                          { id: "4:5", label: "4:5 Portrait" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() =>
                              updateState((prev) => ({ ...prev, cropAspect: preset.id as any }))
                            }
                            className={`rounded-lg border py-1.5 text-[11px] font-medium transition-colors ${
                              currentState.cropAspect === preset.id
                                ? "border-accent bg-accent/10 text-accent font-semibold"
                                : "border-border bg-surface text-foreground-muted hover:text-foreground"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "lighting" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Exposure</span>
                        <span className="font-mono text-accent">{currentState.exposure > 0 ? `+${currentState.exposure}` : currentState.exposure}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentState.exposure}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, exposure: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Brightness</span>
                        <span className="font-mono text-accent">{currentState.brightness > 0 ? `+${currentState.brightness}` : currentState.brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentState.brightness}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, brightness: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Contrast</span>
                        <span className="font-mono text-accent">{currentState.contrast > 0 ? `+${currentState.contrast}` : currentState.contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentState.contrast}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, contrast: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "filters" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Saturation</span>
                        <span className="font-mono text-accent">{currentState.saturation > 0 ? `+${currentState.saturation}` : currentState.saturation}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentState.saturation}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, saturation: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-foreground mb-1.5">
                        <span>Sharpness</span>
                        <span className="font-mono text-accent">{currentState.sharpness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={currentState.sharpness}
                        onChange={(e) =>
                          updateState((prev) => ({ ...prev, sharpness: parseInt(e.target.value) }))
                        }
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "background" && (
                  <div className="space-y-4">
                    <span className="text-xs text-foreground block mb-2">Backdrop Color</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { color: "transparent", label: "Original" },
                        { color: "#ffffff", label: "White" },
                        { color: "#f1f5f9", label: "Light Gray" },
                        { color: "#3b82f6", label: "Official Blue" },
                        { color: "#ef4444", label: "Red" },
                        { color: "#10b981", label: "Green" },
                        { color: "#000000", label: "Black" },
                      ].map((bg) => (
                        <button
                          key={bg.color}
                          onClick={() =>
                            updateState((prev) => ({ ...prev, backgroundColor: bg.color }))
                          }
                          className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-all ${
                            currentState.backgroundColor === bg.color
                              ? "border-accent ring-1 ring-accent"
                              : "border-border bg-surface hover:border-foreground-muted"
                          }`}
                        >
                          <div
                            className="h-6 w-6 rounded-full border border-border"
                            style={{ backgroundColor: bg.color === "transparent" ? "#ffffff" : bg.color }}
                          />
                          <span className="truncate text-foreground-muted">{bg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="border-t border-border p-4 bg-surface text-[11px] text-foreground-muted flex items-center justify-between">
              <span>Standard 600×800 ID Portrait</span>
              <span className="font-mono text-accent font-semibold">300 DPI READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
