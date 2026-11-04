// frontend/src/components/product/TryOnModal.tsx
import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, RotateCcw, Download, Loader2, CheckCircle2, AlertCircle, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { startTryOn, pollTryOnStatus, type TryOnJob } from '@/lib/tryon/api';

type Step = 'capture' | 'preview' | 'processing' | 'result' | 'error';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage: string;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 72;

export function TryOnModal({ open, onClose, productId, productName, productImage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const [step, setStep] = useState<Step>('capture');
  const [cameraMode, setCameraMode] = useState(true);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && cameraMode) startCamera();
    return () => stopCamera();
  }, [open, cameraMode]);

  useEffect(() => {
    if (!open) resetAll();
  }, [open]);

  function resetAll() {
    stopCamera();
    clearPolling();
    setStep('capture');
    setCapturedFile(null);
    setCapturedPreview(null);
    setJob(null);
    setElapsed(0);
    setCompareMode(false);
    pollCountRef.current = 0;
    if (elapsedTimer) clearInterval(elapsedTimer);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraMode(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function captureFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'person.jpg', { type: 'image/jpeg' });
      setCapturedFile(file);
      setCapturedPreview(URL.createObjectURL(blob));
      stopCamera();
      setStep('preview');
    }, 'image/jpeg', 0.92);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setCapturedPreview(URL.createObjectURL(file));
    stopCamera();
    setStep('preview');
  }

  function retake() {
    setCapturedFile(null);
    setCapturedPreview(null);
    setStep('capture');
    if (cameraMode) startCamera();
  }

  async function handleGenerate() {
    if (!capturedFile) return;
    setStep('processing');
    setElapsed(0);

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    setElapsedTimer(timer);

    try {
      const newJob = await startTryOn(capturedFile, productId);
      setJob(newJob);
      beginPolling(newJob.jobId);
    } catch (err: any) {
      clearInterval(timer);
      setJob({ jobId: '', status: 'FAILED', resultImageUrl: null, error: err.message, createdAt: new Date().toISOString(), completedAt: null });
      setStep('error');
    }
  }

  function beginPolling(jobId: string) {
    clearPolling();
    pollCountRef.current = 0;

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        clearPolling();
        setStep('error');
        setJob((prev) => prev && { ...prev, status: 'FAILED', error: 'Timed out.' });
        return;
      }
      try {
        const status = await pollTryOnStatus(jobId);
        setJob(status);
        if (status.status === 'COMPLETED') {
          clearPolling();
          if (elapsedTimer) clearInterval(elapsedTimer);
          setStep('result');
        } else if (status.status === 'FAILED') {
          clearPolling();
          if (elapsedTimer) clearInterval(elapsedTimer);
          setStep('error');
        }
      } catch {}
    }, POLL_INTERVAL_MS);
  }

  function clearPolling() {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }

  function downloadResult() {
    if (!job?.resultImageUrl) return;
    const a = document.createElement('a');
    a.href = job.resultImageUrl;
    a.download = `tryon-${productName}.jpg`;
    a.target = '_blank';
    a.click();
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* 🆕 FIX: Made modal smaller (max-w-md) so it fits well on screen */}
      <DialogContent className="max-w-[92vw] sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <DialogTitle className="font-display text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              Virtual Try-On
              <span className="text-[10px] font-normal bg-accent/10 text-accent px-2 py-0.5 rounded-full">AI</span>
            </span>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-5">
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-black aspect-[3/4] max-h-[45vh] mx-auto">
                {cameraMode ? (
                  <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="size-full grid place-items-center text-white/50"><Camera className="size-8" /></div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                {cameraMode && <Button onClick={captureFromCamera} className="flex-1 gap-2" size="sm"><Camera className="size-4" /> Capture</Button>}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}><Upload className="size-4" /> Upload</Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
          )}

          {step === 'preview' && capturedPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><p className="text-[10px] text-center text-muted-foreground uppercase">You</p><img src={capturedPreview} className="rounded-lg border border-border aspect-[3/4] object-cover w-full" /></div>
                <div className="space-y-1"><p className="text-[10px] text-center text-muted-foreground uppercase">Product</p><img src={productImage} className="rounded-lg border border-border aspect-[3/4] object-cover w-full" /></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={retake} className="gap-2"><RotateCcw className="size-4" /> Retake</Button>
                <Button onClick={handleGenerate} className="flex-1 gap-2" size="sm">Generate ✨</Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <Loader2 className="size-8 animate-spin text-accent" />
              <p className="font-display text-base font-medium">AI is working its magic…</p>
              <p className="text-xs text-muted-foreground">Elapsed: {elapsedStr}</p>
            </div>
          )}

          {step === 'result' && job?.resultImageUrl && (
            <div className="space-y-4">
              <div className={cn("grid gap-3", compareMode ? "grid-cols-2" : "grid-cols-1")}>
                {compareMode && <img src={capturedPreview!} className="rounded-lg border border-border aspect-[3/4] object-cover w-full" />}
                <img src={job.resultImageUrl} className="rounded-lg border border-border aspect-[3/4] object-cover w-full" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCompareMode(!compareMode)} className="px-2"><SplitSquareHorizontal className="size-4" /></Button>
                <Button variant="outline" size="sm" onClick={downloadResult} className="px-2"><Download className="size-4" /></Button>
                <Button className="flex-1" size="sm" onClick={onClose}>Done</Button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="size-8 text-destructive" />
              <p className="text-xs text-muted-foreground px-4">{job?.error || 'Something went wrong.'}</p>
              <Button size="sm" onClick={() => setStep('preview')}>Try Again</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}