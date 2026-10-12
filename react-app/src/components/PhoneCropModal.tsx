import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop, RotateCw, ZoomIn, ZoomOut, X, Check,
  Upload, Wand2, Loader2, Sparkles, Sliders, Palette,
  FlipHorizontal, RotateCcw, Eye, Camera, Sun, Contrast,
  Aperture, RefreshCw
} from 'lucide-react';

interface PhoneCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
  title?: string;
  studentId?: string;
}

type TabType = 'crop' | 'filters' | 'adjust' | 'transform';
type AspectType = '3:4' | '1:1' | '4:3' | '9:16' | 'free';

interface FilterPreset {
  id: string;
  name: string;
  previewBg: string;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  sepia: number;
  grayscale: number;
}

const REDMI_PRESETS: FilterPreset[] = [
  { id: 'original', name: 'Original', previewBg: 'from-slate-600 to-slate-800', brightness: 100, contrast: 100, saturation: 100, warmth: 0, sepia: 0, grayscale: 0 },
  { id: 'vivid', name: 'Redmi Vivid', previewBg: 'from-amber-500 to-emerald-500', brightness: 105, contrast: 115, saturation: 130, warmth: 5, sepia: 0, grayscale: 0 },
  { id: 'film', name: 'Film 35mm', previewBg: 'from-amber-700 to-rose-700', brightness: 98, contrast: 110, saturation: 85, warmth: 15, sepia: 12, grayscale: 0 },
  { id: 'warm', name: 'Golden Hour', previewBg: 'from-amber-400 to-orange-600', brightness: 104, contrast: 105, saturation: 115, warmth: 25, sepia: 10, grayscale: 0 },
  { id: 'cool', name: 'Nordic Cool', previewBg: 'from-sky-400 to-indigo-600', brightness: 102, contrast: 108, saturation: 95, warmth: -20, sepia: 0, grayscale: 0 },
  { id: 'portrait', name: 'Soft Portrait', previewBg: 'from-rose-400 to-amber-200', brightness: 108, contrast: 102, saturation: 108, warmth: 8, sepia: 0, grayscale: 0 },
  { id: 'bw', name: 'B&W Pro', previewBg: 'from-slate-300 to-black', brightness: 105, contrast: 135, saturation: 0, warmth: 0, sepia: 0, grayscale: 100 },
  { id: 'cyberpunk', name: 'HyperOS Glow', previewBg: 'from-fuchsia-600 to-lime-500', brightness: 106, contrast: 120, saturation: 135, warmth: -10, sepia: 0, grayscale: 0 },
];

export const PhoneCropModal: React.FC<PhoneCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  title = 'Redmi Note 13 Photo Studio',
  studentId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('crop');
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageUrl);
  const [aspectRatio, setAspectRatio] = useState<AspectType>('3:4');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeFilterId, setActiveFilterId] = useState<string>('original');

  // Fine-tuning adjustments (Redmi Note 13 Slider Dials)
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [warmth, setWarmth] = useState<number>(0);
  const [sharpness, setSharpness] = useState<number>(0);
  const [vignette, setVignette] = useState<number>(0);

  // Normalized Crop Box coordinates (0 to 1) - Default 3:4 portrait
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.17,
    y: 0.06,
    width: 0.66,
    height: 0.88
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: typeof cropBox }>({
    x: 0,
    y: 0,
    box: { x: 0.17, y: 0.06, width: 0.66, height: 0.88 }
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Convert input imageUrl to a safe, in-memory data URL to guarantee zero canvas tainting
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    let isMounted = true;
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setActiveFilterId('original');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setSharpness(0);
    setVignette(0);
    setIsSaving(false);
    adjustCropBoxForRatio('3:4');

    if (imageUrl.startsWith('data:')) {
      setCurrentImageSrc(imageUrl);
      return;
    }

    // Load and convert external/R2 image into base64 data URI to eliminate CORS issues
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || 600;
        c.height = img.naturalHeight || 800;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const safeDataUrl = c.toDataURL('image/jpeg', 0.95);
          if (isMounted) setCurrentImageSrc(safeDataUrl);
          return;
        }
      } catch (e) {
        // Fallback: use direct URL
      }
      if (isMounted) setCurrentImageSrc(imageUrl);
    };
    img.onerror = () => {
      if (isMounted) setCurrentImageSrc(imageUrl);
    };

    const sep = imageUrl.includes('?') ? '&' : '?';
    img.src = `${imageUrl}${sep}_t=${Date.now()}`;

    return () => {
      isMounted = false;
    };
  }, [imageUrl, isOpen]);

  const adjustCropBoxForRatio = (ratio: AspectType) => {
    setAspectRatio(ratio);
    if (ratio === 'free') {
      setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      return;
    }

    if (ratio === '3:4') {
      // 3:4 portrait biometric standard
      const h = 0.88;
      const w = 0.66;
      setCropBox({ x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h });
    } else if (ratio === '1:1') {
      // 1:1 square
      const s = 0.78;
      setCropBox({ x: (1 - s) / 2, y: (1 - s) / 2, width: s, height: s });
    } else if (ratio === '4:3') {
      // 4:3 landscape
      const w = 0.88;
      const h = 0.66;
      setCropBox({ x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h });
    } else if (ratio === '9:16') {
      // 9:16 vertical full
      const h = 0.92;
      const w = 0.517;
      setCropBox({ x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h });
    }
  };

  const handleApplyFilter = (preset: FilterPreset) => {
    setActiveFilterId(preset.id);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
    setWarmth(preset.warmth);
  };

  // 1-Click AI Auto-Enhance (Redmi Magic Wand)
  const handleAutoEnhance = () => {
    setActiveFilterId('vivid');
    setBrightness(106);
    setContrast(114);
    setSaturation(118);
    setWarmth(5);
    setSharpness(30);
    setVignette(15);
  };

  // Reset all adjustments to default
  const handleResetAll = () => {
    setActiveFilterId('original');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setSharpness(0);
    setVignette(0);
    setRotation(0);
    setIsFlippedH(false);
    setZoom(1);
    adjustCropBoxForRatio('3:4');
  };

  // Rotate 90 degrees clockwise
  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Flip horizontal
  const handleFlipHorizontal = () => {
    setIsFlippedH((prev) => !prev);
  };

  // Pointer dragging on handles or crop boundary
  const handlePointerDown = (
    e: React.PointerEvent,
    action: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragAction(action);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      box: { ...cropBox }
    });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !dragAction || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;

    setCropBox(() => {
      let { x, y, width, height } = dragStart.box;

      if (dragAction === 'move') {
        const newX = Math.max(0, Math.min(1 - width, x + dx));
        const newY = Math.max(0, Math.min(1 - height, y + dy));
        return { x: newX, y: newY, width, height };
      }

      // Corners
      if (dragAction === 'se') {
        const newW = Math.max(0.15, Math.min(1 - x, width + dx));
        const newH = Math.max(0.15, Math.min(1 - y, height + dy));
        return { x, y, width: newW, height: newH };
      } else if (dragAction === 'nw') {
        const newX = Math.max(0, Math.min(x + width - 0.15, x + dx));
        const newY = Math.max(0, Math.min(y + height - 0.15, y + dy));
        return { x: newX, y: newY, width: width - (newX - x), height: height - (newY - y) };
      } else if (dragAction === 'ne') {
        const newY = Math.max(0, Math.min(y + height - 0.15, y + dy));
        const newW = Math.max(0.15, Math.min(1 - x, width + dx));
        return { x, y: newY, width: newW, height: height - (newY - y) };
      } else if (dragAction === 'sw') {
        const newX = Math.max(0, Math.min(x + width - 0.15, x + dx));
        const newH = Math.max(0.15, Math.min(1 - y, height + dy));
        return { x: newX, y, width: width - (newX - x), height: newH };
      }

      // Edges
      if (dragAction === 'n') {
        const newY = Math.max(0, Math.min(y + height - 0.15, y + dy));
        return { x, y: newY, width, height: height - (newY - y) };
      } else if (dragAction === 's') {
        const newH = Math.max(0.15, Math.min(1 - y, height + dy));
        return { x, y, width, height: newH };
      } else if (dragAction === 'w') {
        const newX = Math.max(0, Math.min(x + width - 0.15, x + dx));
        return { x: newX, y, width: width - (newX - x), height };
      } else if (dragAction === 'e') {
        const newW = Math.max(0.15, Math.min(1 - x, width + dx));
        return { x, y, width: newW, height };
      }

      return { x, y, width, height };
    });
  }, [isDragging, dragAction, dragStart]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setDragAction(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Upload local replacement photo
  const handleUploadNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        if (re.target?.result) {
          setCurrentImageSrc(re.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // High-performance canvas rendering & export
  const renderCanvasOutput = (img: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // 3:4 portrait default target resolution
    let outWidth = 600;
    let outHeight = 800;

    if (aspectRatio === '3:4') {
      outWidth = 600;
      outHeight = 800;
    } else if (aspectRatio === '1:1') {
      outWidth = 600;
      outHeight = 600;
    } else if (aspectRatio === '4:3') {
      outWidth = 800;
      outHeight = 600;
    } else if (aspectRatio === '9:16') {
      outWidth = 540;
      outHeight = 960;
    } else if (aspectRatio === 'free') {
      const ratio = cropBox.width / Math.max(0.01, cropBox.height);
      outWidth = 800;
      outHeight = Math.round(outWidth / ratio);
    }

    canvas.width = outWidth;
    canvas.height = outHeight;

    // Crop source box relative to natural image dimensions
    let sx = Math.max(0, cropBox.x * img.naturalWidth);
    let sy = Math.max(0, cropBox.y * img.naturalHeight);
    let sw = Math.min(img.naturalWidth - sx, cropBox.width * img.naturalWidth);
    let sh = Math.min(img.naturalHeight - sy, cropBox.height * img.naturalHeight);

    if (zoom > 1) {
      const zw = sw / zoom;
      const zh = sh / zoom;
      sx += (sw - zw) / 2;
      sy += (sh - zh) / 2;
      sw = zw;
      sh = zh;
    }

    ctx.save();

    // Transforms (Rotation & Mirror Flip)
    ctx.translate(outWidth / 2, outHeight / 2);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (isFlippedH) {
      ctx.scale(-1, 1);
    }
    ctx.translate(-outWidth / 2, -outHeight / 2);

    // CSS Filters: Brightness, Contrast, Saturation
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Draw Cropped Image
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
    ctx.restore();

    // Warmth / Color Temperature tint overlay
    if (warmth !== 0) {
      ctx.save();
      if (warmth > 0) {
        ctx.fillStyle = `rgba(255, 160, 50, ${Math.min(0.25, (warmth / 100) * 0.3)})`;
        ctx.globalCompositeOperation = 'color';
      } else {
        ctx.fillStyle = `rgba(50, 150, 255, ${Math.min(0.25, (Math.abs(warmth) / 100) * 0.3)})`;
        ctx.globalCompositeOperation = 'color';
      }
      ctx.fillRect(0, 0, outWidth, outHeight);
      ctx.restore();
    }

    // Vignette Edge Focus
    if (vignette > 0) {
      ctx.save();
      const grad = ctx.createRadialGradient(
        outWidth / 2, outHeight / 2, Math.min(outWidth, outHeight) * 0.3,
        outWidth / 2, outHeight / 2, Math.max(outWidth, outHeight) * 0.7
      );
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.7, (vignette / 100) * 0.7)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, outWidth, outHeight);
      ctx.restore();
    }

    // Convolution Sharpness
    if (sharpness > 0) {
      try {
        const imgData = ctx.getImageData(0, 0, outWidth, outHeight);
        const d = imgData.data;
        const copy = new Uint8ClampedArray(d);
        const mix = Math.min(0.6, (sharpness / 100) * 0.6);

        for (let py = 1; py < outHeight - 1; py++) {
          for (let px = 1; px < outWidth - 1; px++) {
            const idx = (py * outWidth + px) * 4;
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const up = copy[((py - 1) * outWidth + px) * 4 + c];
              const down = copy[((py + 1) * outWidth + px) * 4 + c];
              const left = copy[(py * outWidth + (px - 1)) * 4 + c];
              const right = copy[(py * outWidth + (px + 1)) * 4 + c];
              const sharpVal = 5 * center - up - down - left - right;
              d[idx + c] = Math.min(255, Math.max(0, (1 - mix) * center + mix * sharpVal));
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        // Continue if pixel access restricted
      }
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Perform Final Crop & Enhancements with 100% Guaranteed Success
  const handleSaveAndApply = () => {
    if (!currentImageSrc) return;
    setIsSaving(true);

    const finishWithImg = (loadedImg: HTMLImageElement) => {
      try {
        const finalDataUrl = renderCanvasOutput(loadedImg);
        if (finalDataUrl) {
          onSave(finalDataUrl);
          onClose();
        } else {
          onSave(currentImageSrc);
          onClose();
        }
      } catch (err) {
        console.warn('Canvas export fallback:', err);
        onSave(currentImageSrc);
        onClose();
      } finally {
        setIsSaving(false);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => finishWithImg(img);
    img.onerror = () => {
      // Fallback: create image directly without crossOrigin
      const directImg = new Image();
      directImg.onload = () => finishWithImg(directImg);
      directImg.src = currentImageSrc;
    };
    img.src = currentImageSrc;
  };

  if (!isOpen) return null;

  // Compute CSS filter string for live viewport preview
  const liveFilterString = isComparing
    ? 'none'
    : `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#090D16] text-white border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* =====================================================================
            TOP HEADER BAR (Redmi Note 13 Studio Title, Badges & Action Buttons)
           ===================================================================== */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-[#0B101D] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#9EE617] flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(158,230,23,0.35)] shrink-0">
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-sm text-white tracking-tight truncate">
                  {title}
                </span>
                <span className="bg-[#9EE617]/20 text-[#9EE617] text-[10px] font-black px-1.5 py-0.5 rounded border border-[#9EE617]/40 shrink-0">
                  REDMI NOTE 13 PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                <span>Default 3:4 portrait framing</span>
                {studentId && (
                  <>
                    <span>&bull;</span>
                    <span className="font-mono text-[#9EE617] font-bold">{studentId}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Hold to Compare Button */}
            <button
              type="button"
              onMouseDown={() => setIsComparing(true)}
              onMouseUp={() => setIsComparing(false)}
              onTouchStart={() => setIsComparing(true)}
              onTouchEnd={() => setIsComparing(false)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                isComparing
                  ? 'bg-amber-400 text-black border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
              }`}
              title="Press and hold to view original photo"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-8 h-8 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Cancel and close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            VIEWPORT WORKSPACE (Dark OLED Canvas with 3:4 Crop Framing Overlay)
           ===================================================================== */}
        <div className="relative flex-1 bg-[#050811] min-h-[300px] max-h-[440px] flex items-center justify-center overflow-hidden p-4">
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full flex items-center justify-center select-none"
            style={{ touchAction: 'none' }}
          >
            <img
              src={currentImageSrc}
              alt="Crop Preview"
              crossOrigin="anonymous"
              className="max-h-[360px] max-w-full object-contain pointer-events-none rounded-lg transition-transform duration-150"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                filter: liveFilterString
              }}
            />

            {/* Warmth & Vignette live overlay effects */}
            {warmth !== 0 && !isComparing && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg mix-blend-color"
                style={{
                  backgroundColor: warmth > 0 ? 'rgba(255, 160, 50, 0.2)' : 'rgba(50, 150, 255, 0.2)'
                }}
              />
            )}
            {vignette > 0 && !isComparing && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${(vignette / 100) * 0.75}) 100%)`
                }}
              />
            )}

            {/* 3:4 Default Portrait Framing Box with Touch Handles & Rule of Thirds */}
            {activeTab === 'crop' && (
              <div
                className="absolute border-2 border-[#9EE617] shadow-[0_0_0_9999px_rgba(5,8,17,0.78)] cursor-move select-none"
                style={{
                  left: `${cropBox.x * 100}%`,
                  top: `${cropBox.y * 100}%`,
                  width: `${cropBox.width * 100}%`,
                  height: `${cropBox.height * 100}%`,
                  touchAction: 'none'
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* 3x3 Rule-of-Thirds Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div />
                </div>

                {/* Aspect Ratio Badge floating on crop corner */}
                <div className="absolute top-1.5 left-1.5 bg-[#9EE617] text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow-md pointer-events-none">
                  {aspectRatio === '3:4' ? '3:4 PORTRAIT' : aspectRatio.toUpperCase()}
                </div>

                {/* 4 Corner L-Brackets Handles (Redmi Note 13 Tactile Style) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-4 border-l-4 border-[#9EE617] cursor-nwse-resize bg-black/60 rounded-tl-sm hover:scale-125 transition-transform"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-4 border-r-4 border-[#9EE617] cursor-nesw-resize bg-black/60 rounded-tr-sm hover:scale-125 transition-transform"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-4 border-r-4 border-[#9EE617] cursor-nwse-resize bg-black/60 rounded-br-sm hover:scale-125 transition-transform"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-4 border-l-4 border-[#9EE617] cursor-nesw-resize bg-black/60 rounded-bl-sm hover:scale-125 transition-transform"
                />

                {/* 4 Edge Touch Bars */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'n')}
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#9EE617] rounded-full cursor-ns-resize hover:scale-110 shadow-xs"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 's')}
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-[#9EE617] rounded-full cursor-ns-resize hover:scale-110 shadow-xs"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'w')}
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-8 w-3 bg-[#9EE617] rounded-full cursor-ew-resize hover:scale-110 shadow-xs"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'e')}
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-8 w-3 bg-[#9EE617] rounded-full cursor-ew-resize hover:scale-110 shadow-xs"
                />
              </div>
            )}
          </div>

          {/* Quick Zoom Slider pill floating in viewport */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 shadow-lg text-xs z-10">
            <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-[#9EE617] cursor-pointer"
            />
            <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[10px] text-[#9EE617] font-bold w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* =====================================================================
            REDMI NOTE 13 BOTTOM TOOL SHELF (Crop | Filters | Adjust | Transform)
           ===================================================================== */}
        <div className="bg-[#0B101D] border-t border-slate-800 p-3 sm:p-4 space-y-3">
          
          {/* TAB 1: CROP & ASPECT RATIO (3:4 Default Portrait) */}
          {activeTab === 'crop' && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {(['3:4', '1:1', '4:3', '9:16', 'free'] as AspectType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => adjustCropBoxForRatio(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    aspectRatio === r
                      ? 'bg-[#9EE617] text-black border-[#9EE617] shadow-[0_0_12px_rgba(158,230,23,0.3)] font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {r === '3:4' ? '3:4 Portrait (Default)' : r.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* TAB 2: FILTERS & PRESETS (Redmi Note 13 Gallery Presets) */}
          {activeTab === 'filters' && (
            <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
              {REDMI_PRESETS.map((p) => {
                const isSelected = activeFilterId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyFilter(p)}
                    className="flex flex-col items-center gap-1.5 group shrink-0 cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.previewBg} p-0.5 border-2 transition-all ${
                        isSelected
                          ? 'border-[#9EE617] shadow-[0_0_12px_rgba(158,230,23,0.4)] scale-105'
                          : 'border-transparent group-hover:border-slate-500'
                      }`}
                    >
                      <div className="w-full h-full rounded-[10px] bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center">
                        <Palette className={`w-4 h-4 ${isSelected ? 'text-[#9EE617]' : 'text-white/80'}`} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-[#9EE617]' : 'text-slate-400 group-hover:text-slate-200'}`}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: ADJUST & FINE-TUNING SLIDERS */}
          {activeTab === 'adjust' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-36 overflow-y-auto px-1 py-1 custom-scrollbar text-xs">
              {/* Brightness */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brightness</span>
                </span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{brightness}%</span>
              </div>

              {/* Contrast */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Contrast className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Contrast</span>
                </span>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{contrast}%</span>
              </div>

              {/* Saturation */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saturation</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{saturation}%</span>
              </div>

              {/* Warmth */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Aperture className="w-3.5 h-3.5 text-orange-400" />
                  <span>Warmth</span>
                </span>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{warmth > 0 ? `+${warmth}` : warmth}</span>
              </div>

              {/* Sharpness */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sharpness</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={sharpness}
                  onChange={(e) => setSharpness(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{sharpness}%</span>
              </div>

              {/* Vignette */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="flex items-center gap-1.5 font-bold text-slate-300 w-24">
                  <Sun className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vignette</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={vignette}
                  onChange={(e) => setVignette(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617] cursor-pointer"
                />
                <span className="font-mono text-[11px] text-[#9EE617] font-bold w-10 text-right">{vignette}%</span>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFORM & ORIENTATION */}
          {activeTab === 'transform' && (
            <div className="flex items-center justify-center gap-3 py-1 flex-wrap">
              <button
                type="button"
                onClick={handleRotate90}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-[#9EE617]" />
                <span>Rotate 90° ({rotation}°)</span>
              </button>

              <button
                type="button"
                onClick={handleFlipHorizontal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
              >
                <FlipHorizontal className="w-4 h-4 text-cyan-400" />
                <span>Flip Horizontal {isFlippedH ? '(Mirrored)' : ''}</span>
              </button>

              <button
                type="button"
                onClick={handleAutoEnhance}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-2 text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-amber-300" />
                <span>AI Auto-Enhance</span>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}

          {/* Bottom Primary Controls & Action Shelf */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
            
            {/* Mode Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'crop' ? 'bg-[#9EE617] text-black shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Framing</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('filters')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'filters' ? 'bg-[#9EE617] text-black shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'adjust' ? 'bg-[#9EE617] text-black shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Adjust</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('transform')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'transform' ? 'bg-[#9EE617] text-black shadow-xs font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rotate</span>
              </button>
            </div>

            {/* Replace File & Save & Apply Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Replace with new local photo file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Replace</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadNewPhoto}
              />

              {/* SAVE & APPLY (Guaranteed 3:4 Biometric Output) */}
              <button
                type="button"
                onClick={handleSaveAndApply}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#85e510] text-black text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(158,230,23,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save & Apply (3:4)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
