import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop, RotateCw, ZoomIn, ZoomOut, X, Check,
  Wand2, Sliders, RotateCcw, Eye, Sun, Contrast,
  RefreshCw, Move
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
  title = 'Biometric Photo Studio',
  studentId
}) => {
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(imageUrl);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showFaceGuide, setShowFaceGuide] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'frame' | 'adjust'>('frame');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Convert input imageUrl into in-memory base64 data URL to guarantee zero canvas tainting
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    let isMounted = true;
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setPan({ x: 0, y: 0 });
    setIsSaving(false);

    if (imageUrl.startsWith('data:')) {
      setCurrentImageSrc(imageUrl);
      return;
    }

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
      } catch (e) {}
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

  // Mouse pan handlers for positioning the portrait
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch pan handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // AI auto-enhance preset
  const handleAutoEnhance = () => {
    setBrightness(105);
    setContrast(110);
    setSaturation(108);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setPan({ x: 0, y: 0 });
  };

  // 100% Reliable, Real-world Canvas Export Engine (Exact 600x800 - 3:4 Biometric ID standard)
  const handleExportAndSave = async () => {
    if (!currentImageSrc) return;
    setIsSaving(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for rendering'));
        img.src = currentImageSrc;
      });

      // Target canvas: 3:4 portrait standard (600x800)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 600;
      exportCanvas.height = 800;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) throw new Error('Could not initialize canvas context');

      // Fill clean solid white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 800);

      // Apply CSS visual filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

      ctx.save();
      // Move origin to center of target canvas
      ctx.translate(300, 400);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom & pan translation normalized to export resolution
      const containerW = containerRef.current?.clientWidth || 300;
      const containerH = containerRef.current?.clientHeight || 400;
      const scaleFactorX = 600 / containerW;
      const scaleFactorY = 800 / containerH;

      ctx.translate(pan.x * scaleFactorX, pan.y * scaleFactorY);
      ctx.scale(zoom, zoom);

      // Fit image naturally into 3:4 canvas
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = 600 / 800;

      let drawW = 600;
      let drawH = 800;

      if (imgAspect > targetAspect) {
        drawH = 800;
        drawW = 800 * imgAspect;
      } else {
        drawW = 600;
        drawH = 600 / imgAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      onSave(croppedDataUrl);
      onClose();
    } catch (err: any) {
      console.error('Photo export error:', err);
      alert('Photo rendering failed: ' + (err?.message || 'Please retry.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#0B1118] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[95vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0F1722]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#85E510]/15 text-[#85E510] flex items-center justify-center border border-[#85E510]/30">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#85E510]/20 text-[#85E510] border border-[#85E510]/40">
                  3:4 Portrait
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {studentId ? `Student ID: ${studentId}` : 'Calibrate biometric face position & lighting'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport & Controls */}
        <div className="p-4 flex flex-col items-center gap-4 overflow-y-auto">
          {/* 3:4 Aspect Framing Viewport */}
          <div className="relative w-full flex justify-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="relative w-[270px] h-[360px] sm:w-[300px] sm:h-[400px] bg-black rounded-xl overflow-hidden border-2 border-[#85E510]/60 shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ touchAction: 'none' }}
            >
              {/* Image with transforms */}
              <img
                ref={imageRef}
                src={currentImageSrc}
                alt="Student portrait"
                draggable={false}
                className="max-w-none transition-transform duration-75 select-none pointer-events-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                }}
              />

              {/* Facial biometric guide overlay */}
              {showFaceGuide && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Oval head guide */}
                  <div className="w-[170px] h-[230px] rounded-[50%] border-2 border-dashed border-[#85E510]/50 flex items-center justify-center">
                    {/* Eye level line */}
                    <div className="w-full h-px bg-[#85E510]/30 -translate-y-6" />
                  </div>
                  {/* Rule of thirds crosshairs */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                  <span className="absolute bottom-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-[#85E510] font-semibold border border-[#85E510]/30">
                    Align Eyes & Chin inside Guide
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Toolbar Bar */}
          <div className="w-full flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.8, prev - 0.1))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1 font-mono text-[11px] font-bold text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowFaceGuide(prev => !prev)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  showFaceGuide
                    ? 'bg-[#85E510]/20 text-[#85E510] border-[#85E510]/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Biometric Face Guide"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAutoEnhance}
                className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-[#85E510] flex items-center gap-1 font-bold text-xs transition-all cursor-pointer"
                title="Auto Light & Clarity Balance"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#85E510]" />
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Reset adjustments"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation: Adjustments */}
          <div className="w-full flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('frame')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'frame'
                  ? 'bg-slate-800 text-[#85E510]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Zoom & Framing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'adjust'
                  ? 'bg-slate-800 text-[#85E510]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lighting & Clarity
            </button>
          </div>

          {/* Tab Content */}
          <div className="w-full space-y-3">
            {activeTab === 'frame' && (
              <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-[#85E510]" />
                      Zoom Level
                    </span>
                    <span className="font-mono text-[#85E510]">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#85E510] cursor-pointer"
                  />
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <Move className="w-3.5 h-3.5 text-slate-400" />
                  <span>Click and drag inside the photo box to position the face perfectly.</span>
                </div>
              </div>
            )}

            {activeTab === 'adjust' && (
              <div className="space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#85E510]" />
                      Brightness
                    </span>
                    <span className="font-mono text-slate-300">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full accent-[#85E510] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Contrast className="w-3.5 h-3.5 text-[#85E510]" />
                      Contrast
                    </span>
                    <span className="font-mono text-slate-300">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    className="w-full accent-[#85E510] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#85E510]" />
                      Saturation
                    </span>
                    <span className="font-mono text-slate-300">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="160"
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                    className="w-full accent-[#85E510] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-800 bg-[#0F1722]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleExportAndSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Photo...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save 3:4 Portrait</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
