import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop, RotateCw, ZoomIn, ZoomOut, Sliders, X, Check,
  Image as ImageIcon, RefreshCw, Upload, Sparkles, Sun, Eye
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
  title = 'Photo Studio & Phone Crop',
  studentId
}) => {
  const [activeTab, setActiveTab] = useState<'Crop' | 'Adjust' | 'Rotate'>('Crop');
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageUrl);
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '1:1' | '4:5' | '2:3' | 'free'>('3:4');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Filters
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);

  // Crop Box normalized coordinates (0 to 1 relative to container)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.05,
    width: 0.8,
    height: 0.9
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragAction, setDragAction] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: typeof cropBox }>({
    x: 0,
    y: 0,
    box: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 }
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentImageSrc(imageUrl);
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    adjustCropBoxForRatio('3:4');
  }, [imageUrl, isOpen]);

  const adjustCropBoxForRatio = (ratio: typeof aspectRatio) => {
    setAspectRatio(ratio);
    let targetRatio = 3 / 4;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:5') targetRatio = 4 / 5;
    else if (ratio === '2:3') targetRatio = 2 / 3;
    else if (ratio === 'free') {
      setCropBox({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
      return;
    }

    // Default height 85% of container, calculate width
    let h = 0.85;
    let w = h * targetRatio * (4 / 3); // normalized view ratio
    if (w > 0.9) {
      w = 0.9;
      h = w / (targetRatio * (4 / 3));
    }
    const x = Math.max(0.02, (1 - w) / 2);
    const y = Math.max(0.02, (1 - h) / 2);
    setCropBox({ x, y, width: w, height: h });
  };

  // Drag Handling for Smartphone-style Framing
  const handlePointerDown = (e: React.PointerEvent, action: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
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

    setCropBox(prev => {
      let { x, y, width, height } = dragStart.box;
      if (dragAction === 'move') {
        const newX = Math.max(0, Math.min(1 - width, x + dx));
        const newY = Math.max(0, Math.min(1 - height, y + dy));
        return { ...prev, x: newX, y: newY };
      } else if (dragAction === 'se') {
        const newW = Math.max(0.2, Math.min(1 - x, width + dx));
        const newH = Math.max(0.2, Math.min(1 - y, height + dy));
        return { ...prev, width: newW, height: newH };
      } else if (dragAction === 'nw') {
        const newX = Math.max(0, Math.min(x + width - 0.2, x + dx));
        const newY = Math.max(0, Math.min(y + height - 0.2, y + dy));
        const newW = width - (newX - x);
        const newH = height - (newY - y);
        return { x: newX, y: newY, width: newW, height: newH };
      } else if (dragAction === 'ne') {
        const newY = Math.max(0, Math.min(y + height - 0.2, y + dy));
        const newW = Math.max(0.2, Math.min(1 - x, width + dx));
        const newH = height - (newY - y);
        return { ...prev, y: newY, width: newW, height: newH };
      } else if (dragAction === 'sw') {
        const newX = Math.max(0, Math.min(x + width - 0.2, x + dx));
        const newW = width - (newX - x);
        const newH = Math.max(0.2, Math.min(1 - y, height + dy));
        return { ...prev, x: newX, width: newW, height: newH };
      }
      return prev;
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

  // Handle local file selection to replace photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Perform Final Crop on Canvas
  const handleSaveAndApply = () => {
    if (!currentImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Desired export dimensions (high-res standard ID: 600x800)
      let targetRatio = 3 / 4;
      if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '4:5') targetRatio = 4 / 5;
      else if (aspectRatio === '2:3') targetRatio = 2 / 3;
      else if (aspectRatio === 'free') targetRatio = cropBox.width / cropBox.height;

      const outWidth = 600;
      const outHeight = Math.round(outWidth / targetRatio);

      canvas.width = outWidth;
      canvas.height = outHeight;

      // Calculate source bounding box from normalized cropBox
      let sx = cropBox.x * img.naturalWidth;
      let sy = cropBox.y * img.naturalHeight;
      let sw = cropBox.width * img.naturalWidth;
      let sh = cropBox.height * img.naturalHeight;

      // Adjust for zoom
      if (zoom > 1) {
        const zw = sw / zoom;
        const zh = sh / zoom;
        sx += (sw - zw) / 2;
        sy += (sh - zh) / 2;
        sw = zw;
        sh = zh;
      }

      ctx.save();
      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      // Draw cropped slice
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight);

      // Handle rotation if any
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

      ctx.restore();
      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onSave(finalDataUrl);
      onClose();
    };
    img.src = currentImageSrc;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#0B1118] text-white border border-[#2D3748] rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#111927]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#9EE617]/20 border border-[#9EE617]/40 flex items-center justify-center text-[#9EE617]">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
                <span>{title}</span>
                {studentId && (
                  <span className="font-mono text-[11px] text-[#9EE617] bg-[#9EE617]/10 px-2 py-0.5 rounded">
                    {studentId}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Mobile-style viewport cropping, filters & rotation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Frame (Smartphone Style Dark Canvas) */}
        <div className="flex-1 min-h-[300px] max-h-[440px] bg-slate-950 p-4 flex items-center justify-center relative overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative w-full max-w-[340px] aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center"
          >
            {/* The Image */}
            <img
              ref={imgRef}
              src={currentImageSrc}
              alt="Crop target"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease'
              }}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Dark Mask around crop box */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`
              }}
            />

            {/* Interactive Crop Frame */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-[#9EE617] cursor-move touch-none"
              style={{
                left: `${cropBox.x * 100}%`,
                top: `${cropBox.y * 100}%`,
                width: `${cropBox.width * 100}%`,
                height: `${cropBox.height * 100}%`,
                boxShadow: '0 0 15px rgba(158, 230, 23, 0.4)'
              }}
            >
              {/* Rule of Thirds Grid Lines (Like iPhone Camera / Android Photos) */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-white/60" />
                <div className="border-r border-white/60" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-white cursor-nwse-resize z-20 touch-none shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-white cursor-nesw-resize z-20 touch-none shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-white cursor-nesw-resize z-20 touch-none shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-white cursor-nwse-resize z-20 touch-none shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Toolbar Tabs & Adjustments */}
        <div className="p-4 bg-[#111927] border-t border-[#1E293B] space-y-3">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <div className="flex items-center gap-1">
              {(['Crop', 'Adjust', 'Rotate'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-[#9EE617] text-[#062404] shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#9EE617]" />
              <span>Replace Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Active Tab Controls */}
          {activeTab === 'Crop' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Preset Framing:</span>
                <span className="text-[11px] text-[#9EE617] font-mono">Active: {aspectRatio}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: '3:4 Portrait', val: '3:4' },
                  { label: '1:1 Square', val: '1:1' },
                  { label: '4:5 Dossier', val: '4:5' },
                  { label: '2:3 Classic', val: '2:3' },
                  { label: 'Custom', val: 'free' }
                ].map(r => (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => adjustCropBoxForRatio(r.val as any)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                      aspectRatio === r.val
                        ? 'bg-[#9EE617]/20 border-[#9EE617] text-[#BEF264]'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Zoom Slider */}
              <div className="pt-1 flex items-center gap-3">
                <ZoomOut className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-[#9EE617]"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-mono text-slate-300 w-10 text-right">{zoom.toFixed(1)}x</span>
              </div>
            </div>
          )}

          {activeTab === 'Adjust' && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Brightness</span>
                  <span className="font-mono text-slate-300">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#9EE617]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Contrast</span>
                  <span className="font-mono text-slate-300">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#9EE617]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Saturation</span>
                  <span className="font-mono text-slate-300">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full accent-[#9EE617]"
                />
              </div>
            </div>
          )}

          {activeTab === 'Rotate' && (
            <div className="flex items-center justify-center gap-3 py-1">
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-[#9EE617]" />
                <span>Rotate 90&deg; CW</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation(r => (r + 270) % 360)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-[#9EE617] scale-x-[-1]" />
                <span>Rotate 90&deg; CCW</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[#1E293B]">
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
                adjustCropBoxForRatio('3:4');
              }}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Reset Original
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className="px-5 py-2 rounded-xl bg-[#9EE617] hover:bg-[#8FE617] text-[#062404] text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Replace Photo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
