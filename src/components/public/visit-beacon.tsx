"use client";

import { useEffect } from "react";
import type { LinkVisitKind } from "@/lib/track-link";

/**
 * Catat kunjungan dari tautan yang dibagikan toko (lacak/galeri) SEKALI per sesi
 * browser per toko+asal — refresh tak menggelembungkan angka. Dijalankan di klien
 * sehingga crawler pratinjau tautan WhatsApp (tanpa JS) tak ikut terhitung.
 */
export function VisitBeacon({ slug, kind }: { slug: string; kind: LinkVisitKind }) {
  useEffect(() => {
    const key = `lv:${kind}:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage diblokir → tetap kirim sekali per load */
    }
    try {
      const body = new Blob([JSON.stringify({ slug, kind })], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/track/visit", body)) return;
      void fetch("/api/track/visit", { method: "POST", body, keepalive: true });
    } catch {
      /* best-effort */
    }
  }, [slug, kind]);
  return null;
}
