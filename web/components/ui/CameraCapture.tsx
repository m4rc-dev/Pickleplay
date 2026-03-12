// ═══════════════════════════════════════════════════════════════
// Camera Capture Component — Take a Photo via Device Camera
// Fast-loading: pre-warms stream, uses <video> directly, no heavy libs
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Camera,
  X,
  RotateCcw,
  Zap,
  SwitchCamera,
  Check,
  Loader2,
} from 'lucide-react';

interface CameraCaptureProps {
  /** Called when user confirms a captured photo. */
  onCapture: (file: File) => void;
  /** Called when user closes the camera without capturing. */
  onClose: () => void;
  /** Whether the camera modal is open. */
  open: boolean;
  /** Optional label displayed in the header. */
  label?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, open, label = 'Take Photo' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  // ─── Start Camera Stream ──────────────────────────────────
  const startStream = useCallback(async (facing: 'user' | 'environment') => {
    setIsLoading(true);
    setError('');

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
      setIsLoading(false);
    }
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startStream(facingMode);
    }

    return () => {
      // Cleanup stream on unmount or close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Switch Camera ─────────────────────────────────────────
  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    setCapturedImage(null);
    startStream(newMode);
  }, [facingMode, startStream]);

  // ─── Capture Photo ─────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to video dimensions for full quality
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Convert to blob for speed (JPEG at 92% quality)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
        }
      },
      'image/jpeg',
      0.92
    );
  }, [facingMode]);

  // ─── Retake ────────────────────────────────────────────────
  const retake = useCallback(() => {
    setCapturedImage(null);
    setCapturedBlob(null);
  }, []);

  // ─── Confirm & Return File ─────────────────────────────────
  const confirmCapture = useCallback(() => {
    if (!capturedBlob) return;

    const file = new File(
      [capturedBlob],
      `camera-capture-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    // Stop stream before closing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    onCapture(file);
  }, [capturedBlob, onCapture]);

  // ─── Close Handler ─────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onClose();
  }, [onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={handleClose}
          className="p-2 text-white/80 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        <p className="text-sm font-black text-white uppercase tracking-widest">{label}</p>
        <button
          type="button"
          onClick={switchCamera}
          className="p-2 text-white/80 hover:text-white transition-colors"
          title="Switch camera"
        >
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Camera / Preview Area */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
        {isLoading && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-white/60 text-xs font-bold">Starting camera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-center px-8 max-w-sm">
              <Camera size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-white text-sm font-bold mb-2">Camera Unavailable</p>
              <p className="text-white/60 text-xs font-medium">{error}</p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 px-6 py-2 bg-white/10 text-white font-bold rounded-xl text-xs hover:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          } ${capturedImage ? 'hidden' : ''}`}
        />

        {/* Captured preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder overlay when camera is active */}
        {!capturedImage && !isLoading && !error && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner guides */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
            <div className="absolute bottom-28 left-8 w-12 h-12 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
            <div className="absolute bottom-28 right-8 w-12 h-12 border-b-2 border-r-2 border-white/40 rounded-br-lg" />

            <div className="absolute bottom-32 left-0 right-0 text-center">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                Position your document within the frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm px-4 py-5 flex items-center justify-center gap-8">
        {!capturedImage ? (
          /* Capture button */
          <button
            type="button"
            onClick={capturePhoto}
            disabled={isLoading || !!error}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-30"
          >
            <div className="w-16 h-16 rounded-full bg-white" />
          </button>
        ) : (
          /* Retake / Confirm */
          <>
            <button
              type="button"
              onClick={retake}
              className="flex flex-col items-center gap-1 px-6 py-2 text-white/80 hover:text-white transition-colors"
            >
              <RotateCcw size={28} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Retake</span>
            </button>

            <button
              type="button"
              onClick={confirmCapture}
              className="flex flex-col items-center gap-1 px-6 py-2"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all">
                <Check size={32} className="text-white" />
              </div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Use Photo</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CameraCapture;
