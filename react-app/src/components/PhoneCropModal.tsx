import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop, RotateCw, ZoomIn, ZoomOut, Sliders, X, Check,
  Image as ImageIcon, RefreshCw, Upload, Sparkles, Sun, Eye, Wand2
} from 'lucide-react';

interface PhoneCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
  title?: string;
  studentId?: string;
}

export const PhoneCropModal: React.FC<PhoneCropModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  title = 'Photo Studio & Biometric Cropper',
  studentId
}) => {
  const [activeTab, setActiveTab] = useState<'Crop' | 'Enhance' | 'Rotate'>('Crop');
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageUrl);
  const [aspectRatio, setAspectRatio] = useState<'4:3' | '3:4' | '1:1' | 'free'>('4:3');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Photo Quality Enhancer States
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [sharpness, setSharpness] = useState<number>(0);

  // Crop Box normalized coordinates (0 to 1 relative to container)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.6
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: typeof cropBox }>({
    x: 0,
    y: 0,
    box: { x: 0.1, y: 0.1, width: 0.8, height: 0.6 }
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentImageSrc(imageUrl);
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
    adjustCropBoxForRatio('4:3');
  }, [imageUrl, isOpen]);

  const adjustCropBoxForRatio = (ratio: typeof aspectRatio) => {
    setAspectRatio(ratio);
    if (ratio === 'free') {
      setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      return;
    }

    let targetRatio = 4 / 3; // width / height
    if (ratio === '3:4') targetRatio = 3 / 4;
    else if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;

    // Viewport assumed roughly 4:3 container
    let w = 0.85;
    let h = w / targetRatio * 0.9;
    if (h > 0.85) {
      h = 0.85;
      w = h * targetRatio / 0.9;
    }
    w = Math.min(0.92, Math.max(0.2, w));
    h = Math.min(0.92, Math.max(0.2, h));

    const x = Math.max(0.02, (1 - w) / 2);
    const y = Math.max(0.02, (1 - h) / 2);
    setCropBox({ x, y, width: w, height: h });
  };

  // 1-Click Photo Quality Auto-Enhancer
  const handleAutoEnhance = () => {
    setBrightness(104);
    setContrast(112);
    setSaturation(108);
    setSharpness(35);
  };

  // Reset enhancements
  const handleResetEnhance = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
    setRotation(0);
    setZoom(1);
  };

  // Pointer Down on handles or move area
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

      // Corner Dragging
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

      // Edge Dragging (All 4 Sides)
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

  // File replacement upload
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

  // Convolution Sharpening Algorithm
  const applyConvolutionSharpen = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    level: number
  ) => {
    if (level <= 0) return;
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const copy = new Uint8ClampedArray(d);
      const mix = Math.min(1, level / 100);

      for (let py = 1; py < h - 1; py++) {
        for (let px = 1; px < w - 1; px++) {
          const idx = (py * w + px) * 4;
          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const up = copy[((py - 1) * w + px) * 4 + c];
            const down = copy[((py + 1) * w + px) * 4 + c];
            const left = copy[(py * w + (px - 1)) * 4 + c];
            const right = copy[(py * w + (px + 1)) * 4 + c];
            const sharpVal = 5 * center - up - down - left - right;
            d[idx + c] = Math.min(255, Math.max(0, (1 - mix) * center + mix * sharpVal));
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Canvas sharpen skipped due to cross-origin data', e);
    }
  };

  // Perform Final Crop & Enhancements on Canvas
  const handleSaveAndApply = () => {
    if (!currentImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Ratio calculation
      let targetRatio = 4 / 3;
      if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else if (aspectRatio === '3:4') targetRatio = 3 / 4;
      else if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === 'free') targetRatio = cropBox.width / cropBox.height;

      const outWidth = 800;
      const outHeight = Math.round(outWidth / targetRatio);

      canvas.width = outWidth;
      canvas.height = outHeight;

      // Source image bounding box
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
      // Apply Brightness, Contrast & Saturation
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);
      ctx.restore();

      // Apply Sharpness Enhancement
      if (sharpness > 0) {
        applyConvolutionSharpen(ctx, outWidth, outHeight, sharpness);
      }

      // Handle Rotation
      if (rotation !== 0) {
        const rotCanvas = document.createElement('canvas');
        rotCanvas.width = outWidth;
        rotCanvas.height = outHeight;
        const rctx = rotCanvas.getContext('2d');
        if (rctx) {
          rctx.save();
          rctx.translate(outWidth / 2, outHeight / 2);
          rctx.rotate((rotation * Math.PI) / 180);
          rctx.drawImage(canvas, -outWidth / 2, -outHeight / 2);
          rctx.restore();
          const finalDataUrl = rotCanvas.toDataURL('image/jpeg', 0.95);
          onSave(finalDataUrl);
          onClose();
          return;
        }
      }

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onSave(finalDataUrl);
      onClose();
    };
    img.src = currentImageSrc;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none">
      <div className="bg-white text-black border border-slate-200 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9EE617] flex items-center justify-center text-black font-black shadow-xs">
              <Crop className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-black flex items-center gap-2">
                <span>{title}</span>
                {studentId && (
                  <span className="font-mono text-[11px] text-black bg-[#9EE617] px-2 py-0.5 rounded-md font-bold shadow-xs">
                    {studentId}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                4:3 / 3:4 All-side cropping & photo quality enhancer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Tabs: Crop | Enhance | Rotate */}
        <div className="flex border-b border-slate-200 bg-[#F8FAF9] px-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('Crop')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'Crop'
                ? 'border-[#9EE617] text-black font-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Framing & Aspect (4:3)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Enhance')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'Enhance'
                ? 'border-[#9EE617] text-black font-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-[#74D600]" />
            <span>Quality Enhancer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Rotate')}
            className={`py-2.5 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'Rotate'
                ? 'border-[#9EE617] text-black font-black'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate & Zoom</span>
          </button>
        </div>

        {/* Viewport Workspace */}
        <div className="relative flex-1 bg-slate-900 min-h-[320px] max-h-[460px] flex items-center justify-center overflow-hidden p-4">
          <div
            ref={containerRef}
            className="relative max-w-full max-h-full flex items-center justify-center select-none"
            style={{ touchAction: 'none' }}
          >
            <img
              src={currentImageSrc}
              alt="Crop Preview"
              crossOrigin="anonymous"
              className="max-h-[380px] max-w-full object-contain pointer-events-none rounded-lg"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
              }}
            />

            {/* Framing Box with All 4 Edges and 4 Corners Handles */}
            {activeTab === 'Crop' && (
              <div
                className="absolute border-2 border-[#9EE617] shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move select-none"
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
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-r border-b border-[#9EE617]/50" />
                  <div className="border-b border-[#9EE617]/50" />
                  <div className="border-r border-[#9EE617]/50" />
                  <div className="border-r border-[#9EE617]/50" />
                  <div />
                </div>

                {/* 4 Corner Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-[#9EE617] border-2 border-black cursor-nwse-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#9EE617] border-2 border-black cursor-nesw-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#9EE617] border-2 border-black cursor-nwse-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 rounded-full bg-[#9EE617] border-2 border-black cursor-nesw-resize shadow-md flex items-center justify-center"
                />

                {/* 4 Edge Handles (Cropping from ALL sides) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'n')}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 rounded-full bg-[#9EE617] border-2 border-black cursor-ns-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 's')}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-4 rounded-full bg-[#9EE617] border-2 border-black cursor-ns-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'w')}
                  className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-10 rounded-full bg-[#9EE617] border-2 border-black cursor-ew-resize shadow-md flex items-center justify-center"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'e')}
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-10 rounded-full bg-[#9EE617] border-2 border-black cursor-ew-resize shadow-md flex items-center justify-center"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab Controls Footer Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          {activeTab === 'Crop' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Select Aspect Ratio Standard:</span>
                <span className="text-[10px] text-[#5CA800] font-black">All sides & corners resizable</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => adjustCropBoxForRatio('4:3')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aspectRatio === '4:3'
                      ? 'bg-[#9EE617] text-black shadow-xs'
                      : 'bg-[#F8FAF9] text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  4:3 Ratio
                </button>
                <button
                  type="button"
                  onClick={() => adjustCropBoxForRatio('3:4')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aspectRatio === '3:4'
                      ? 'bg-[#9EE617] text-black shadow-xs'
                      : 'bg-[#F8FAF9] text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  3:4 Portrait
                </button>
                <button
                  type="button"
                  onClick={() => adjustCropBoxForRatio('1:1')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aspectRatio === '1:1'
                      ? 'bg-[#9EE617] text-black shadow-xs'
                      : 'bg-[#F8FAF9] text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  1:1 Square
                </button>
                <button
                  type="button"
                  onClick={() => adjustCropBoxForRatio('free')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    aspectRatio === 'free'
                      ? 'bg-[#9EE617] text-black shadow-xs'
                      : 'bg-[#F8FAF9] text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  Free Crop
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Enhance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Photo Quality Enhancer:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoEnhance}
                    className="py-1 px-3 rounded-lg bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Auto-Enhance</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetEnhance}
                    className="py-1 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-black text-xs font-bold cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                {/* Brightness */}
                <div className="bg-[#F8FAF9] border border-slate-200 p-2 rounded-xl">
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#9EE617]"
                  />
                </div>

                {/* Contrast */}
                <div className="bg-[#F8FAF9] border border-slate-200 p-2 rounded-xl">
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#9EE617]"
                  />
                </div>

                {/* Saturation */}
                <div className="bg-[#F8FAF9] border border-slate-200 p-2 rounded-xl">
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Saturation</span>
                    <span>{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-[#9EE617]"
                  />
                </div>

                {/* Sharpness */}
                <div className="bg-[#F8FAF9] border border-slate-200 p-2 rounded-xl">
                  <div className="flex justify-between font-bold text-slate-700 mb-1">
                    <span>Sharpness</span>
                    <span>{sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="w-full accent-[#9EE617]"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Rotate' && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="py-2 px-3.5 rounded-xl border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 font-bold text-xs flex items-center gap-2 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90° ({rotation}°)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold w-12 text-center">
                  {(zoom * 100).toFixed(0)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:text-black hover:bg-slate-50 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadNewPhoto}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:text-black text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className="py-2 px-5 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-black font-black text-xs shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Apply & Save Photo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
