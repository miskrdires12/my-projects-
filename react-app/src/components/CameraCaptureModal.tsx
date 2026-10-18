import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, X, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  studentId?: string;
  defaultFacingMode?: 'user' | 'environment';
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  studentId = 'STUDENT',
  defaultFacingMode = 'user',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreamReady, setIsStreamReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>(defaultFacingMode);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  // Stop camera stream safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamReady(false);
  }, []);

  // Start camera with chosen facing mode
  const startCameraStream = useCallback(
    async (facing: 'user' | 'environment') => {
      stopCameraStream();
      setCameraError(null);
      setIsStreamReady(false);

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
          setIsStreamReady(true);
        }
      } catch (err: any) {
        console.warn('Camera stream failed for facing mode, retrying basic video:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.muted = true;
            await videoRef.current.play().catch(() => {});
            setIsStreamReady(true);
          }
        } catch (fallbackErr: any) {
          setCameraError(
            fallbackErr?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings.'
              : 'Unable to connect to camera device. Please check hardware connection.'
          );
        }
      }
    },
    [stopCameraStream]
  );

  // When modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startCameraStream(cameraFacing);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, cameraFacing, startCameraStream, stopCameraStream]);

  // Toggle front/back camera
  const handleToggleFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCameraStream(nextFacing);
  };

  // Capture snapshot to Data URL
  const handleCapture = () => {
    if (!videoRef.current || !isStreamReady) return;

    setIsCapturing(true);
    setFlashEffect(true);

    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // If front camera, horizontal flip for intuitive mirror representation
        if (cameraFacing === 'user') {
          ctx.translate(vWidth, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, vWidth, vHeight);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Quick shutter flash feedback
        setTimeout(() => {
          stopCameraStream();
          setIsCapturing(false);
          setFlashEffect(false);
          onCapture(dataUrl);
        }, 150);
      }
    } catch (e: any) {
      console.error('Snapshot capture error:', e);
      setIsCapturing(false);
      setFlashEffect(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#10171e] border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#141d26]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#85E510]/20 border border-[#85E510]/40 flex items-center justify-center text-[#85E510]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-white flex items-center gap-2">
                <span>Biometric Camera Capture</span>
                <span className="text-[10px] font-mono font-bold bg-[#85E510]/20 text-[#85E510] border border-[#85E510]/40 px-2 py-0.2 rounded-md">
                  {studentId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Align eyes on the green guide &bull; High resolution 3:4 portrait
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFacing}
              title="Flip Camera (Front / Back)"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              title="Close Camera"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Viewfinder Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[380px] sm:min-h-[440px]">
          {/* Shutter Flash Animation */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-150 pointer-events-none" />
          )}

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover max-h-[65vh] ${
              cameraFacing === 'user' ? 'scale-x-[-1]' : ''
            }`}
          />

          {/* Biometric HUD Overlay */}
          {isStreamReady && (
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-between p-4">
              {/* Top Instruction Pill */}
              <div className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-medium text-white/90 border border-white/10 shadow-lg text-center">
                Keep head upright &bull; Align eyes with the{' '}
                <span className="text-[#85E510] font-bold">Eye Line</span>
              </div>

              {/* Viewfinder Center Frame (3:4 Portrait Ratio) */}
              <div className="relative w-[78%] max-w-[320px] aspect-[3/4] border-2 border-dashed border-[#85E510]/60 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.6)]">
                {/* Horizontal Eye Line */}
                <div className="absolute top-[38%] inset-x-0 border-b-2 border-dashed border-[#85E510]/90 flex items-center justify-between px-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-black/70 px-1.5 py-0.5 rounded text-[#85E510] -mt-5">
                    Eye Line
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-black/70 px-1.5 py-0.5 rounded text-[#85E510] -mt-5">
                    Eye Line
                  </span>
                </div>

                {/* Vertical Center Line & Nose Crosshair */}
                <div className="absolute top-[28%] bottom-[30%] left-1/2 -translate-x-1/2 border-l-2 border-dashed border-[#85E510]/70" />
                <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full border-2 border-[#85E510] bg-black/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#85E510] animate-ping" />
                  </div>
                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest bg-black/70 px-1.5 py-0.5 rounded text-[#85E510] mt-0.5">
                    Nose
                  </span>
                </div>

                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#85E510] rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#85E510] rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#85E510] rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#85E510] rounded-br" />
              </div>

              {/* Status Badge */}
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#85E510] animate-pulse" />
                <span>Biometric Sensor Active &bull; Ready to Snap</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {!isStreamReady && !cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white text-xs gap-3 z-30">
              <RefreshCw className="w-8 h-8 animate-spin text-[#85E510]" />
              <div className="font-bold text-slate-200">Initializing camera feed...</div>
              <div className="text-[11px] text-slate-400">Requesting sensor permissions</div>
            </div>
          )}

          {/* Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Camera Connection Failed</h4>
              <p className="text-xs text-rose-300 max-w-sm">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCameraStream(cameraFacing)}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#141d26] border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleFacing}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <SwitchCamera className="w-4 h-4 text-[#85E510]" />
            <span className="hidden sm:inline">Flip ({cameraFacing === 'user' ? 'Front' : 'Back'})</span>
          </button>

          {/* Primary Big Capture Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!isStreamReady || isCapturing}
            className="flex-1 max-w-xs py-3.5 px-6 rounded-2xl bg-[#85E510] hover:bg-[#76CF0C] active:scale-95 text-[#062404] font-heading font-black text-sm shadow-lg shadow-[#85E510]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5 text-[#062404]" />
            <span>Capture Snapshot</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
