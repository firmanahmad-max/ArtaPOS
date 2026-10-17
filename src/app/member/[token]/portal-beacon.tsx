"use client";

import { useEffect } from "react";

/**
 * Catat kunjungan Portal Member SEKALI per sesi browser per link — refresh tak
 * menggelembungkan angka. Berjalan di klien sehingga crawler pratinjau tautan
 * WhatsApp (tanpa JS) tak ikut terhitung.
 */
export function PortalBeacon({ token, refParam }: { token: string; refParam?: string }) {
  useEffect(() => {
    const key = `pv:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage diblokir → tetap kirim sekali per load */
    }
    try {
      const body = new Blob([JSON.stringify({ token, ref: refParam })], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/portal/visit", body)) return;
      void fetch("/api/portal/visit", { method: "POST", body, keepalive: true });
    } catch {
      /* best-effort */
    }
  }, [token, refParam]);
  return null;
}
