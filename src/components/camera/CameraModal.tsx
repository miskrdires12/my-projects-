"use client";

// ============================================================================
// STUDENT BRIDGE — HIGH-RES WEBRTC CAMERA CAPTURE STUDIO
// - Multi-tier hardware fallback: exact deviceId -> ideal constraints -> generic video:true
// - Camera device enumeration dropdown (switch between internal, USB, virtual cams)
// - ID Framing guides (3:4 ratio head/eyes/shoulders alignment)
// - Instant File Upload and Test Snapshot fallbacks if webcam hardware is missing
// - Strict White and Black high-contrast professional design
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  FlipHorizontal,
  Upload,
  Sparkles,
} from "lucide-react";

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  initialFacingMode?: "user" | "environment";
  maxDimensions?: { width: number; height: number }; // Default 600 × 800
  compressionQuality?: number; // Default 0.75
}

type CameraState = "idle" | "requesting" | "streaming" | "captured" | "error";

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  initialFacingMode = "user",
  maxDimensions = { width: 600, height: 800 },
  compressionQuality = 0.75,
}) => {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(initialFacingMode);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Safely stops and cleans up all active camera hardware tracks.
   */
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore cleanup errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Enumerate available video devices
   */
  const loadDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setDevices(videoInputs);
    } catch {
      // Ignore enumeration errors
    }
  }, []);

  /**
   * Starts the WebRTC video stream with multi-level resilient fallback.
   */
  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setErrorMessage(
        "Camera access is not supported by this browser or page is not served over a secure origin."
      );
      return;
    }

    stopMediaTracks();
    setCameraState("requesting");
    setErrorMessage(null);

    // Attempt 1: Device ID or ideal high-res constraints
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 960 },
            }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 960 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("streaming");
      loadDevices();
      return;
    } catch (err1) {
      console.warn("Attempt 1 with specific constraints failed, trying generic fallback:", err1);
    }

    // Attempt 2: Generic { video: true } fallback
    try {
      const fallbackConstraints: MediaStreamConstraints = {
        video: true,
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("streaming");
      loadDevices();
    } catch (err2: any) {
      console.error("Camera access completely failed:", err2);
      setCameraState("error");
      if (err2 instanceof DOMException) {
        if (err2.name === "NotAllowedError" || err2.name === "PermissionDeniedError") {
          setErrorMessage(
            "Camera permission was denied. Please allow camera access in browser permissions or use the upload fallback below."
          );
        } else if (err2.name === "NotFoundError" || err2.name === "DevicesNotFoundError") {
          setErrorMessage(
            "No camera hardware detected. You can upload a photo file or generate a test ID portrait below."
          );
        } else if (err2.name === "NotReadableError" || err2.name === "TrackStartError") {
          setErrorMessage(
            "Camera is currently locked by another application. Close other camera apps and retry, or upload a photo."
          );
        } else {
          setErrorMessage(`Camera error (${err2.name}): ${err2.message}`);
        }
      } else {
        setErrorMessage("Unable to initialize video hardware. Use file upload or test capture below.");
      }
    }
  }, [facingMode, selectedDeviceId, stopMediaTracks, loadDevices]);

  // Handle open/close transitions
  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setCapturedBlob(null);
      startCamera();
    } else {
      stopMediaTracks();
      setCameraState("idle");
    }

    return () => {
      stopMediaTracks();
    };
  }, [isOpen, startCamera, stopMediaTracks]);

  /**
   * Toggle between front and rear cameras
   */
  const handleToggleCamera = () => {
    setSelectedDeviceId("");
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /**
   * Switch selected camera device
   */
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };

  /**
   * Captures the current video frame, crops to 3:4 portrait ID aspect ratio,
   * scales to max 600×800 bounds, and compresses to JPEG.
   */
  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || cameraState !== "streaming") {
      return;
    }

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;

    if (!videoW || !videoH) {
      return;
    }

    // Flash trigger
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const targetAspect = 3 / 4;
    let sourceW: number;
    let sourceH: number;
    let sourceX = 0;
    let sourceY = 0;

    const currentAspect = videoW / videoH;
    if (currentAspect > targetAspect) {
      sourceH = videoH;
      sourceW = Math.round(videoH * targetAspect);
      sourceX = Math.round((videoW - sourceW) / 2);
    } else {
      sourceW = videoW;
      sourceH = Math.round(videoW / targetAspect);
      sourceY = Math.round((videoH - sourceH) / 2);
    }

    let destW = sourceW;
    let destH = sourceH;
    if (destW > maxDimensions.width || destH > maxDimensions.height) {
      const scale = Math.min(maxDimensions.width / destW, maxDimensions.height / destH);
      destW = Math.round(destW * scale);
      destH = Math.round(destH * scale);
    }

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = destW;
    canvas.height = destH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply mirror if user/front facing
    if (facingMode === "user") {
      ctx.translate(destW, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, destW, destH);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(previewUrl);
        setCameraState("captured");
        stopMediaTracks();
      },
      "image/jpeg",
      compressionQuality
    );
  };

  /**
   * Fallback 1: Process an uploaded image file into 3:4 ID bounds
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const targetAspect = 3 / 4;
      const currentAspect = img.width / img.height;
      let sW = img.width;
      let sH = img.height;
      let sX = 0;
      let sY = 0;

      if (currentAspect > targetAspect) {
        sH = img.height;
        sW = Math.round(img.height * targetAspect);
        sX = Math.round((img.width - sW) / 2);
      } else {
        sW = img.width;
        sH = Math.round(img.width / targetAspect);
        sY = Math.round((img.height - sH) / 2);
      }

      let dW = sW;
      let dH = sH;
      if (dW > maxDimensions.width || dH > maxDimensions.height) {
        const scale = Math.min(maxDimensions.width / dW, maxDimensions.height / dH);
        dW = Math.round(dW * scale);
        dH = Math.round(dH * scale);
      }

      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = dW;
      canvas.height = dH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, sX, sY, sW, sH, 0, 0, dW, dH);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const previewUrl = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedPreview(previewUrl);
          setCameraState("captured");
          stopMediaTracks();
        },
        "image/jpeg",
        compressionQuality
      );
    };
    img.src = objectUrl;
  };

  /**
   * Fallback 2: Generate crisp monochrome ID portrait test silhouette
   */
  const handleGenerateTestSnapshot = () => {
    const width = 600;
    const height = 800;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Neutral studio background
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, width, height);

    // Subtle studio gradient
    const grad = ctx.createRadialGradient(
      width / 2,
      height * 0.4,
      50,
      width / 2,
      height * 0.4,
      width * 0.8
    );
    grad.addColorStop(0, "#2c2c2c");
    grad.addColorStop(1, "#121212");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Shoulder silhouette
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.92, width * 0.42, height * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head silhouette
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.44, width * 0.22, height * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner detail (ID silhouette)
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STUDENT PHOTO", width / 2, height * 0.45);
    ctx.font = "14px monospace";
    ctx.fillText("OFFICIAL ID PASSPORT SPEC", width / 2, height * 0.49);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(previewUrl);
        setCameraState("captured");
        stopMediaTracks();
      },
      "image/jpeg",
      0.85
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    setCapturedBlob(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedBlob || !capturedPreview) return;
    const fileName = `student-photo-${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
    onCapture(file, capturedPreview);
    handleClose();
  };

  const handleClose = () => {
    stopMediaTracks();
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    setCapturedBlob(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-2xl shadow-black text-white">
        {/* Flash Effect on Capture */}
        {isFlashing && (
          <div className="pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200" />
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3.5 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-white text-black">
              <Camera className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="camera-modal-title" className="text-xs font-bold tracking-wider uppercase text-white font-mono">
                STUDENT PHOTO CAPTURE STUDIO
              </h2>
              <p className="text-[11px] text-neutral-400">
                {cameraState === "captured"
                  ? "Review portrait framing before accepting"
                  : "Align face with the oval guide and capture"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera Selector Bar (If devices available) */}
        {devices.length > 1 && cameraState !== "captured" && (
          <div className="flex items-center justify-between px-5 py-2 bg-neutral-900 border-b border-neutral-800 text-xs">
            <span className="text-neutral-400 font-mono text-[11px]">Select Camera:</span>
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="rounded border border-neutral-700 bg-black px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-white"
            >
              <option value="">Default Camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewport Area */}
        <div className="relative aspect-[3/4] max-h-[460px] w-full bg-black flex items-center justify-center overflow-hidden">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              cameraState === "streaming" ? "opacity-100" : "opacity-0"
            } ${facingMode === "user" ? "-scale-x-100" : ""}`}
          />

          {/* Captured Review Preview */}
          {cameraState === "captured" && capturedPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedPreview}
              alt="Captured student preview"
              className="h-full w-full object-cover"
            />
          )}

          {/* ID Framing Overlay (Active during streaming) */}
          {cameraState === "streaming" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {/* Head / Face Oval Guide */}
              <div className="relative h-[68%] w-[58%] rounded-[50%] border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Center crosshairs */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-white/60" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60" />

                {/* Eye line guide */}
                <div className="absolute top-[42%] left-2 right-2 border-b border-dotted border-white/40" />
              </div>

              {/* Viewport badge */}
              <div className="absolute top-4 rounded border border-neutral-700 bg-black/80 px-2.5 py-1 text-[10px] font-mono text-white">
                3:4 ID PASSPORT SPEC (600×800)
              </div>
            </div>
          )}

          {/* Requesting / Loading State */}
          {cameraState === "requesting" && (
            <div className="flex flex-col items-center gap-3 text-center p-6">
              <RefreshCw className="h-8 w-8 animate-spin text-white" />
              <p className="text-xs text-neutral-400 font-mono">Connecting to webcam hardware...</p>
            </div>
          )}

          {/* Error Display State & Fallback Actions */}
          {cameraState === "error" && (
            <div className="flex flex-col items-center gap-3 text-center p-6 max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-white">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Camera Unavailable
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{errorMessage}</p>

              {/* Immediate Fallback Options */}
              <div className="flex flex-col gap-2 w-full mt-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center justify-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-mono text-white hover:bg-neutral-800 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Hardware Camera
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded bg-white px-3 py-2 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo From Computer
                </button>

                <button
                  type="button"
                  onClick={handleGenerateTestSnapshot}
                  className="inline-flex items-center justify-center gap-2 rounded border border-neutral-800 bg-black px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Test Portrait
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input & Canvas */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-5 py-3.5">
          {cameraState === "captured" ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-mono text-white hover:bg-neutral-800 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 rounded bg-white px-5 py-2 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-colors"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                Use This Photo
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={cameraState !== "streaming"}
                  className="inline-flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
                  title="Switch Front/Rear"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>{facingMode === "user" ? "Front" : "Rear"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                  title="Upload image file"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCaptureFrame}
                disabled={cameraState !== "streaming"}
                className="inline-flex items-center gap-2 rounded bg-white px-6 py-2.5 text-xs font-mono font-bold text-black hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Camera className="h-4 w-4 stroke-[2.5]" />
                Snap Photo
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="rounded px-3 py-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
