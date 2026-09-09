"use client";

// ============================================================================
// STUDENT BRIDGE — SMARTPHONE-STYLE ID PHOTO STUDIO & CROPPER
//
// Built to look and feel exactly like a native smartphone photo editor:
// - Full-screen immersive dark interface
// - Interactive crop box with draggable L-shaped corner brackets & edge handles
// - 3:4 aspect ratio portrait lock (with 1:1 and Free modes)
// - Rule-of-thirds alignment grid during drag
// - Pan and zoom gestures / slider
// - 90° instant rotation & flip horizontal
// - Phone-style lighting controls (Brightness, Contrast, Saturation)
// - High-DPI output: extracts exact 3:4 portrait (900×1200) with 300 DPI JFIF
// - Supports both touch (mobile/tablet) and mouse pointer events with capture
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Crop,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Sun,
  Check,
  X,
  RotateCcw,
} from "lucide-react";
import { convertBlobTo300Dpi } from "@/lib/jpeg-dpi";

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

type AspectRatioMode = "3:4" | "1:1" | "free";
type ActiveTab = "crop" | "rotate" | "light";
type DragHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move" | null;

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PhotoEditorModal: React.FC<PhotoEditorProps> = ({
  isOpen,
  onClose,
  originalImageSrc,
  originalFile,
  onSave,
  onRetake,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("crop");

  // Transform States
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [fineAngle, setFineAngle] = useState<number>(0); // -45 to +45
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>("3:4");

  // Lighting & Detail Filters
  const [brightness, setBrightness] = useState<number>(0); // -50 to +50
  const [contrast, setContrast] = useState<number>(0); // -50 to +50
  const [saturation, setSaturation] = useState<number>(0); // -50 to +50

  // Interactive Crop Box in Container Display Pixels
  const [cropBox, setCropBox] = useState<CropRect>({ x: 40, y: 30, width: 270, height: 360 });
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 480,
  });

  // Drag interaction state
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);

  // Initialize and load image
  useEffect(() => {
    if (!originalImageSrc) return;
    setIsImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalImageSrc;
    img.onload = () => {
      imageRef.current = img;
      setIsImageLoaded(true);
      resetToDefaultCrop(img);
    };
  }, [originalImageSrc]);

  // Measure container and set initial 3:4 crop box
  const resetToDefaultCrop = useCallback(
    (_img?: HTMLImageElement) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cW = Math.max(rect.width, 240);
      const cH = Math.max(rect.height, 320);
      setContainerSize({ width: cW, height: cH });

      // Calculate a centered 3:4 crop box that takes up ~75% of view
      let boxH = cH * 0.78;
      let boxW = boxH * (3 / 4);

      if (boxW > cW * 0.88) {
        boxW = cW * 0.88;
        boxH = boxW * (4 / 3);
      }

      const boxX = (cW - boxW) / 2;
      const boxY = (cH - boxH) / 2;

      setCropBox({
        x: Math.round(boxX),
        y: Math.round(boxY),
        width: Math.round(boxW),
        height: Math.round(boxH),
      });

      setZoom(1);
      setRotation(0);
      setFineAngle(0);
      setIsFlippedH(false);
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
    },
    []
  );

  // Recalculate on container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && imageRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set Aspect Ratio preset
  const handleSetAspectRatio = (mode: AspectRatioMode) => {
    setAspectRatio(mode);
    const cW = containerSize.width;
    const cH = containerSize.height;

    let targetRatio = 3 / 4;
    if (mode === "1:1") targetRatio = 1;
    if (mode === "free") return; // Keep existing dimensions

    let newW = cropBox.width;
    let newH = newW / targetRatio;

    if (newH > cH * 0.9) {
      newH = cH * 0.9;
      newW = newH * targetRatio;
    }
    if (newW > cW * 0.9) {
      newW = cW * 0.9;
      newH = newW / targetRatio;
    }

    const newX = Math.max(0, Math.min(cW - newW, cropBox.x));
    const newY = Math.max(0, Math.min(cH - newH, cropBox.y));

    setCropBox({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  // Rotate 90 degrees clockwise
  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // --------------------------------------------------------------------------
  // POINTER DRAG & RESIZE SYSTEM (Corner handles, Edge handles, Pan)
  // --------------------------------------------------------------------------
  const startDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsInteracting(true);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const { handle, startX, startY, startCrop } = dragRef.current;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const cW = containerSize.width;
    const cH = containerSize.height;
    const minSize = 60;

    let newBox: CropRect = { ...startCrop };

    if (handle === "move") {
      // Pan crop frame
      newBox.x = Math.max(0, Math.min(cW - startCrop.width, startCrop.x + deltaX));
      newBox.y = Math.max(0, Math.min(cH - startCrop.height, startCrop.y + deltaY));
    } else if (handle === "se") {
      // Bottom Right Corner
      let newW = Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX));
      let newH = startCrop.height + deltaY;

      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH * (3 / 4);
        }
      } else if (aspectRatio === "1:1") {
        newH = newW;
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH;
        }
      } else {
        newH = Math.max(minSize, Math.min(cH - startCrop.y, newH));
      }

      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    } else if (handle === "sw") {
      // Bottom Left Corner
      let newW = Math.max(minSize, startCrop.width - deltaX);
      let newX = startCrop.x + (startCrop.width - newW);

      if (newX < 0) {
        newW += newX;
        newX = 0;
      }

      let newH = startCrop.height + deltaY;
      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH * (3 / 4);
          newX = startCrop.x + (startCrop.width - newW);
        }
      } else if (aspectRatio === "1:1") {
        newH = newW;
        if (startCrop.y + newH > cH) {
          newH = cH - startCrop.y;
          newW = newH;
          newX = startCrop.x + (startCrop.width - newW);
        }
      } else {
        newH = Math.max(minSize, Math.min(cH - startCrop.y, newH));
      }

      newBox.x = Math.round(newX);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    } else if (handle === "ne") {
      // Top Right Corner
      let newW = Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX));
      let newH = startCrop.height - deltaY;
      let newY = startCrop.y + (startCrop.height - newH);

      if (newY < 0) {
        newH += newY;
        newY = 0;
      }

      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH * (3 / 4);
          newY = 0;
        }
      } else if (aspectRatio === "1:1") {
        newH = newW;
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH;
          newY = 0;
        }
      } else {
        if (newH < minSize) {
          newY = startCrop.y + startCrop.height - minSize;
          newH = minSize;
        }
      }

      newBox.y = Math.round(newY);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    } else if (handle === "nw") {
      // Top Left Corner
      let newW = Math.max(minSize, startCrop.width - deltaX);
      let newX = startCrop.x + (startCrop.width - newW);
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }

      let newH = startCrop.height - deltaY;
      let newY = startCrop.y + (startCrop.height - newH);
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }

      if (aspectRatio === "3:4") {
        newH = newW * (4 / 3);
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH * (3 / 4);
          newX = startCrop.x + (startCrop.width - newW);
          newY = 0;
        }
      } else if (aspectRatio === "1:1") {
        newH = newW;
        newY = startCrop.y + (startCrop.height - newH);
        if (newY < 0) {
          newH = startCrop.y + startCrop.height;
          newW = newH;
          newX = startCrop.x + (startCrop.width - newW);
          newY = 0;
        }
      } else {
        if (newH < minSize) {
          newY = startCrop.y + startCrop.height - minSize;
          newH = minSize;
        }
      }

      newBox.x = Math.round(newX);
      newBox.y = Math.round(newY);
      newBox.width = Math.round(newW);
      newBox.height = Math.round(newH);
    } else if (handle === "n") {
      // Top Edge - crop from the top
      let newH = startCrop.height - deltaY;
      let newY = startCrop.y + deltaY;
      if (newY < 0) {
        newH += newY;
        newY = 0;
      }
      if (newH < minSize) {
        newY = startCrop.y + startCrop.height - minSize;
        newH = minSize;
      }
      if (aspectRatio === "3:4") {
        let newW = newH * (3 / 4);
        if (newW > cW) {
          newW = cW;
          newH = newW * (4 / 3);
          newY = startCrop.y + startCrop.height - newH;
        }
        const centerX = startCrop.x + startCrop.width / 2;
        let newX = centerX - newW / 2;
        if (newX < 0) newX = 0;
        if (newX + newW > cW) newX = cW - newW;
        newBox.x = Math.round(newX);
        newBox.width = Math.round(newW);
      } else if (aspectRatio === "1:1") {
        let newW = newH;
        if (newW > cW) {
          newW = cW;
          newH = newW;
          newY = startCrop.y + startCrop.height - newH;
        }
        const centerX = startCrop.x + startCrop.width / 2;
        let newX = centerX - newW / 2;
        if (newX < 0) newX = 0;
        if (newX + newW > cW) newX = cW - newW;
        newBox.x = Math.round(newX);
        newBox.width = Math.round(newW);
      }
      newBox.y = Math.round(newY);
      newBox.height = Math.round(newH);
    } else if (handle === "s") {
      // Bottom Edge - crop from the bottom
      let newH = Math.max(minSize, Math.min(cH - startCrop.y, startCrop.height + deltaY));
      if (aspectRatio === "3:4") {
        let newW = newH * (3 / 4);
        if (newW > cW) {
          newW = cW;
          newH = newW * (4 / 3);
        }
        const centerX = startCrop.x + startCrop.width / 2;
        let newX = centerX - newW / 2;
        if (newX < 0) newX = 0;
        if (newX + newW > cW) newX = cW - newW;
        newBox.x = Math.round(newX);
        newBox.width = Math.round(newW);
      } else if (aspectRatio === "1:1") {
        let newW = newH;
        if (newW > cW) {
          newW = cW;
          newH = newW;
        }
        const centerX = startCrop.x + startCrop.width / 2;
        let newX = centerX - newW / 2;
        if (newX < 0) newX = 0;
        if (newX + newW > cW) newX = cW - newW;
        newBox.x = Math.round(newX);
        newBox.width = Math.round(newW);
      }
      newBox.height = Math.round(newH);
    } else if (handle === "w") {
      // Left Edge - crop from the left
      let newW = startCrop.width - deltaX;
      let newX = startCrop.x + deltaX;
      if (newX < 0) {
        newW += newX;
        newX = 0;
      }
      if (newW < minSize) {
        newX = startCrop.x + startCrop.width - minSize;
        newW = minSize;
      }
      if (aspectRatio === "3:4") {
        let newH = newW * (4 / 3);
        if (newH > cH) {
          newH = cH;
          newW = newH * (3 / 4);
          newX = startCrop.x + startCrop.width - newW;
        }
        const centerY = startCrop.y + startCrop.height / 2;
        let newY = centerY - newH / 2;
        if (newY < 0) newY = 0;
        if (newY + newH > cH) newY = cH - newH;
        newBox.y = Math.round(newY);
        newBox.height = Math.round(newH);
      } else if (aspectRatio === "1:1") {
        let newH = newW;
        if (newH > cH) {
          newH = cH;
          newW = newH;
          newX = startCrop.x + startCrop.width - newW;
        }
        const centerY = startCrop.y + startCrop.height / 2;
        let newY = centerY - newH / 2;
        if (newY < 0) newY = 0;
        if (newY + newH > cH) newY = cH - newH;
        newBox.y = Math.round(newY);
        newBox.height = Math.round(newH);
      }
      newBox.x = Math.round(newX);
      newBox.width = Math.round(newW);
    } else if (handle === "e") {
      // Right Edge - crop from the right
      let newW = Math.max(minSize, Math.min(cW - startCrop.x, startCrop.width + deltaX));
      if (aspectRatio === "3:4") {
        let newH = newW * (4 / 3);
        if (newH > cH) {
          newH = cH;
          newW = newH * (3 / 4);
        }
        const centerY = startCrop.y + startCrop.height / 2;
        let newY = centerY - newH / 2;
        if (newY < 0) newY = 0;
        if (newY + newH > cH) newY = cH - newH;
        newBox.y = Math.round(newY);
        newBox.height = Math.round(newH);
      } else if (aspectRatio === "1:1") {
        let newH = newW;
        if (newH > cH) {
          newH = cH;
          newW = newH;
        }
        const centerY = startCrop.y + startCrop.height / 2;
        let newY = centerY - newH / 2;
        if (newY < 0) newY = 0;
        if (newY + newH > cH) newY = cH - newH;
        newBox.y = Math.round(newY);
        newBox.height = Math.round(newH);
      }
      newBox.width = Math.round(newW);
    }

    setCropBox(newBox);
  };

  const stopDrag = () => {
    dragRef.current = null;
    setIsInteracting(false);
  };

  // --------------------------------------------------------------------------
  // SAVE & EXPORT CROP CANVAS (Standard 900 × 1200 at 300 DPI)
  // --------------------------------------------------------------------------
  const handleSave = async () => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    // Standardized 3:4 portrait dimensions: 900 × 1200 (exact 3in × 4in at 300 DPI)
    const exportWidth = 900;
    const exportHeight = 1200;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Compute transformation matrix
    const scaleFactor = exportWidth / cropBox.width;

    ctx.save();
    // Move origin to match crop box position
    ctx.translate(-cropBox.x * scaleFactor, -cropBox.y * scaleFactor);

    // Apply color filters
    const b = 100 + brightness;
    const c = 100 + contrast;
    const s = 100 + saturation;
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

    // Calculate where image is drawn inside container
    const cW = containerSize.width;
    const cH = containerSize.height;

    // Image center in container space
    const imgCenterX = cW / 2;
    const imgCenterY = cH / 2;

    ctx.translate(imgCenterX * scaleFactor, imgCenterY * scaleFactor);
    ctx.rotate(((rotation + fineAngle) * Math.PI) / 180);
    if (isFlippedH) ctx.scale(-1, 1);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const imgRatio = img.width / img.height;
    const cRatio = cW / cH;
    let drawW: number;
    let drawH: number;

    if (imgRatio > cRatio) {
      drawW = cW;
      drawH = cW / imgRatio;
    } else {
      drawH = cH;
      drawW = cH * imgRatio;
    }

    ctx.drawImage(
      img,
      (-drawW / 2) * scaleFactor,
      (-drawH / 2) * scaleFactor,
      drawW * scaleFactor,
      drawH * scaleFactor
    );

    ctx.restore();

    exportCanvas.toBlob(
      async (blob) => {
        if (!blob) return;
        // Inject authentic 300 DPI JFIF APP0 marker
        const blob300Dpi = await convertBlobTo300Dpi(blob);
        const originalBlob = originalFile
          ? new Blob([originalFile], { type: originalFile.type })
          : null;

        onSave(blob300Dpi, originalBlob, {
          crop: { ...cropBox },
          zoom,
          rotation,
          brightness,
          contrast,
          exposure: 0,
          saturation,
          sharpness: 0,
          backgroundColor: "#ffffff",
        });
        onClose();
      },
      "image/jpeg",
      0.92
    );
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none animate-in fade-in duration-150"
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {/* ────────────────────────────────────────────────────────────────────
          PHONE TOP BAR (Clean, Minimal, High-Contrast)
         ──────────────────────────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/10 bg-black/90 backdrop-blur-md shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-mono font-semibold tracking-wider text-neutral-200">
          <span className="h-1.5 w-1.5 rounded-full bg-[#02f52b] animate-pulse" />
          <span>3:4 PHONE CROP • 300 DPI</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full bg-[#02f52b] px-4 py-1.5 text-xs font-bold text-[#080808] hover:brightness-110 transition-all shadow-glow-sm active:scale-95 cursor-pointer"
        >
          <Check className="h-4 w-4 stroke-[2.5] text-[#080808]" />
          <span>Done</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          MAIN VIEWPORT & INTERACTIVE PHONE CROP CANVAS
         ──────────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden bg-neutral-950">
        <div
          ref={containerRef}
          className="relative aspect-[3/4] h-full max-h-[72vh] w-auto max-w-[95vw] bg-black/80 rounded-lg overflow-hidden flex items-center justify-center shadow-2xl"
          style={{ touchAction: "none" }}
        >
          {/* Underlying Transformed Image */}
          {isImageLoaded && originalImageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalImageSrc}
              alt="Photo for editing"
              draggable={false}
              className="h-full w-full object-contain pointer-events-none transition-transform duration-75"
              style={{
                transform: `scale(${zoom}) rotate(${rotation + fineAngle}deg) scaleX(${
                  isFlippedH ? -1 : 1
                })`,
                filter: `brightness(${100 + brightness}%) contrast(${
                  100 + contrast
                }%) saturate(${100 + saturation}%)`,
              }}
            />
          )}

          {/* Interactive Phone Crop Box */}
          <div
            className="absolute border-2 border-white pointer-events-auto select-none"
            style={{
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              // Shadow simulates dark overlay outside crop box
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            }}
          >
            {/* Center Draggable Area to Move/Pan Crop Box */}
            <div
              className="absolute inset-0 cursor-move flex items-center justify-center"
              onPointerDown={(e) => startDrag("move", e)}
            >
              {/* Rule of Thirds Grid (Active during interaction or crop mode) */}
              <div
                className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
                  isInteracting || activeTab === "crop" ? "opacity-75" : "opacity-30"
                }`}
              >
                {/* Horizontal grid lines */}
                <div className="absolute top-1/3 left-0 right-0 border-b border-white/40 border-dashed" />
                <div className="absolute top-2/3 left-0 right-0 border-b border-white/40 border-dashed" />
                {/* Vertical grid lines */}
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-white/40 border-dashed" />
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-white/40 border-dashed" />
              </div>
            </div>

            {/* 4 Heavy L-Shaped White Corner Brackets (Native Phone Style) */}
            {/* Top-Left Corner Handle */}
            <div
              className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-white cursor-nwse-resize rounded-tl-sm z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("nw", e)}
            >
              <div className="absolute w-11 h-11" /> {/* Extended touch target */}
            </div>

            {/* Top-Right Corner Handle */}
            <div
              className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-white cursor-nesw-resize rounded-tr-sm z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("ne", e)}
            >
              <div className="absolute w-11 h-11" />
            </div>

            {/* Bottom-Left Corner Handle */}
            <div
              className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-white cursor-nesw-resize rounded-bl-sm z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("sw", e)}
            >
              <div className="absolute w-11 h-11" />
            </div>

            {/* Bottom-Right Corner Handle */}
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-white cursor-nwse-resize rounded-br-sm z-30 touch-none flex items-center justify-center"
              onPointerDown={(e) => startDrag("se", e)}
            >
              <div className="absolute w-11 h-11" />
            </div>

            {/* 4 Phone-Style Side Edge Handles (Crop from all sides) */}
            {/* Top Edge Handle */}
            <div
              className="absolute top-0 left-1/4 right-1/4 -translate-y-1/2 h-8 z-20 cursor-ns-resize touch-none flex items-center justify-center group"
              onPointerDown={(e) => startDrag("n", e)}
              title="Drag down or up to crop top"
            >
              <div className="w-12 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:scale-110 group-active:scale-125 transition-transform" />
            </div>

            {/* Bottom Edge Handle */}
            <div
              className="absolute bottom-0 left-1/4 right-1/4 translate-y-1/2 h-8 z-20 cursor-ns-resize touch-none flex items-center justify-center group"
              onPointerDown={(e) => startDrag("s", e)}
              title="Drag up or down to crop bottom"
            >
              <div className="w-12 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:scale-110 group-active:scale-125 transition-transform" />
            </div>

            {/* Left Edge Handle */}
            <div
              className="absolute left-0 top-1/4 bottom-1/4 -translate-x-1/2 w-8 z-20 cursor-ew-resize touch-none flex items-center justify-center group"
              onPointerDown={(e) => startDrag("w", e)}
              title="Drag right or left to crop left side"
            >
              <div className="h-12 w-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:scale-110 group-active:scale-125 transition-transform" />
            </div>

            {/* Right Edge Handle */}
            <div
              className="absolute right-0 top-1/4 bottom-1/4 translate-x-1/2 w-8 z-20 cursor-ew-resize touch-none flex items-center justify-center group"
              onPointerDown={(e) => startDrag("e", e)}
              title="Drag left or right to crop right side"
            >
              <div className="h-12 w-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] group-hover:scale-110 group-active:scale-125 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          PHONE BOTTOM DOCK / CONTROLS TOOLBAR
         ──────────────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur-md p-3 space-y-3 shrink-0">
        {/* Sub-controls based on active tab */}
        <div className="max-w-md mx-auto">
          {/* TAB 1: CROP & ASPECT RATIO */}
          {activeTab === "crop" && (
            <div className="space-y-2.5">
              {/* Aspect Ratio Preset Selector */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAspectRatio("3:4")}
                  className={`rounded-full px-3.5 py-1 text-xs font-mono font-semibold transition-all ${
                    aspectRatio === "3:4"
                      ? "bg-white text-black shadow-md"
                      : "bg-white/10 text-neutral-300 hover:bg-white/20"
                  }`}
                >
                  3:4 ID Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAspectRatio("1:1")}
                  className={`rounded-full px-3.5 py-1 text-xs font-mono font-semibold transition-all ${
                    aspectRatio === "1:1"
                      ? "bg-white text-black shadow-md"
                      : "bg-white/10 text-neutral-300 hover:bg-white/20"
                  }`}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAspectRatio("free")}
                  className={`rounded-full px-3.5 py-1 text-xs font-mono font-semibold transition-all ${
                    aspectRatio === "free"
                      ? "bg-white text-black shadow-md"
                      : "bg-white/10 text-neutral-300 hover:bg-white/20"
                  }`}
                >
                  Free Crop
                </button>
                <button
                  type="button"
                  onClick={() => resetToDefaultCrop()}
                  className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors ml-2"
                  title="Reset to initial framing"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-3 px-3">
                <ZoomOut className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <ZoomIn className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span className="text-[10px] font-mono text-neutral-400 w-10 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: ROTATE & STRAIGHTEN */}
          {activeTab === "rotate" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleRotate90}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-mono text-white transition-all active:scale-95"
                >
                  <RotateCw className="h-4 w-4" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlippedH((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-all active:scale-95 ${
                    isFlippedH ? "bg-white text-black font-bold" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <FlipHorizontal className="h-4 w-4" />
                  <span>Flip</span>
                </button>
              </div>

              {/* Fine Straighten Angle Slider */}
              <div className="flex items-center gap-3 px-3">
                <span className="text-[10px] font-mono text-neutral-400 shrink-0">-45°</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={fineAngle}
                  onChange={(e) => setFineAngle(parseFloat(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 shrink-0">+45°</span>
                <button
                  type="button"
                  onClick={() => setFineAngle(0)}
                  className="text-[10px] font-mono text-white bg-white/10 px-2 py-0.5 rounded hover:bg-white/20"
                >
                  {fineAngle > 0 ? `+${fineAngle}°` : `${fineAngle}°`}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: LIGHTING & ADJUSTMENTS */}
          {activeTab === "light" && (
            <div className="space-y-2 px-2 text-xs">
              {/* Brightness */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Bright</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                  {brightness > 0 ? `+${brightness}` : brightness}
                </span>
              </div>

              {/* Contrast */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Contrast</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                  {contrast > 0 ? `+${contrast}` : contrast}
                </span>
              </div>

              {/* Saturation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 w-16">Color</span>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-white h-1.5 rounded-lg bg-neutral-800 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                  {saturation > 0 ? `+${saturation}` : saturation}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Phone Tool Navigation Tabs */}
        <div className="flex items-center justify-center gap-3 border-t border-white/10 pt-2 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("crop")}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors ${
              activeTab === "crop" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Crop className="h-4 w-4" />
            <span>Crop</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rotate")}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors ${
              activeTab === "rotate" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <RotateCw className="h-4 w-4" />
            <span>Rotate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("light")}
            className={`flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-mono transition-colors ${
              activeTab === "light" ? "text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </button>

          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retake</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorModal;
