"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker (PWA) — hanya di produksi agar tidak
 * mengganggu hot-reload saat development.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // pendaftaran gagal — abaikan (app tetap jalan online)
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
