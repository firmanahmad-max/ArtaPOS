"use client";

import { useEffect } from "react";

/** Catat kartu garansi dibuka SEKALI per sesi browser (crawler pratinjau WA tanpa JS tak terhitung). */
export function WarrantyBeacon({ token }: { token: string }) {
  useEffect(() => {
    const key = `wv:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage diblokir → tetap kirim sekali per load */
    }
    try {
      const body = new Blob([JSON.stringify({ token })], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/garansi/view", body)) return;
      void fetch("/api/garansi/view", { method: "POST", body, keepalive: true });
    } catch {
      /* best-effort */
    }
  }, [token]);
  return null;
}
