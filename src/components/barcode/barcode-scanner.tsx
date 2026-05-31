"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Scanner barcode via kamera. Klik "Scan" → buka kamera; saat barcode terbaca,
 * memanggil onDetected(text) lalu menutup. USB scanner TIDAK butuh komponen ini
 * (cukup ketik ke input + Enter, seperti keyboard).
 */
export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  // Bersihkan kamera saat unmount (cleanup-only effect → aman lint).
  useEffect(() => stop, []);

  const start = async () => {
    setError(null);
    setOpen(true);
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current ?? undefined,
        (result) => {
          if (result) {
            onDetected(result.getText());
            stop();
            setOpen(false);
          }
        },
      );
    } catch {
      setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
      setOpen(false);
    }
  };

  const close = () => {
    stop();
    setOpen(false);
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="icon" onClick={start} title="Scan barcode dengan kamera">
        <Camera />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-card">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-medium">Arahkan ke barcode…</span>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Tutup">
            <X />
          </Button>
        </div>
        <video ref={videoRef} className="aspect-video w-full bg-black" muted playsInline />
        {error && <p className="p-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
