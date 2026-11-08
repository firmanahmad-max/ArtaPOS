"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js/browser";

/**
 * QR code (bwip-js) di canvas — tajam untuk dicetak. `size` = lebar tampil (px CSS);
 * resolusi canvas dibuat lebih tinggi agar tetap jelas saat dicetak printer label.
 */
export function QrCode({ value, size = 120, className }: { value: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    try {
      bwipjs.toCanvas(c, { bcid: "qrcode", text: value, scale: 6 });
      c.style.width = `${size}px`;
      c.style.height = `${size}px`;
    } catch {
      c.style.display = "none";
    }
  }, [value, size]);
  return <canvas ref={ref} className={className} aria-label="QR code" role="img" style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}
