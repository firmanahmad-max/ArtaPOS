"use client";

import { useEffect, useRef } from "react";
import bwipjs from "bwip-js/browser";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";

/**
 * Label barcode siap cetak. Memakai barcode produk bila ada, jika tidak pakai SKU.
 * Code128 dipilih karena mendukung alfanumerik (SKU bebas).
 */
export function BarcodeLabel({
  storeName,
  productName,
  code,
  price,
}: {
  storeName: string;
  productName: string;
  code: string;
  price: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const errorEl = errorRef.current;
    if (!canvas) return;
    try {
      bwipjs.toCanvas(canvas, {
        bcid: "code128",
        text: code,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: "center",
      });
      canvas.style.display = "";
      if (errorEl) errorEl.style.display = "none";
    } catch {
      // Tampilkan pesan via DOM (tanpa React state → menghindari cascading render).
      canvas.style.display = "none";
      if (errorEl) {
        errorEl.textContent = "Gagal membuat barcode untuk kode ini.";
        errorEl.style.display = "";
      }
    }
  }, [code]);

  return (
    <div className="space-y-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #printable, #printable * { visibility: visible !important; }
        #printable { position: absolute; left: 0; top: 0; }
        .no-print { display: none !important; }
      }`}</style>

      <div
        id="printable"
        className="mx-auto w-64 rounded-lg border bg-white p-3 text-center text-black"
      >
        <p className="truncate text-xs font-semibold">{storeName}</p>
        <p className="mb-1 truncate text-sm">{productName}</p>
        <canvas ref={canvasRef} className="mx-auto" />
        <p ref={errorRef} className="text-xs text-red-600" style={{ display: "none" }} />
        <p className="mt-1 text-base font-bold">{formatRupiah(price)}</p>
      </div>

      <div className="no-print flex justify-center">
        <Button onClick={() => window.print()}>
          <Printer /> Cetak Label
        </Button>
      </div>
    </div>
  );
}
