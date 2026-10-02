"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";

const ENDPOINT = "/api/gallery/track";

/** Kirim payload tanpa menunggu balasan (tahan saat halaman ditinggalkan). */
function beacon(payload: unknown) {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch {
    /* abaikan — metrik bersifat best-effort */
  }
}

/**
 * Catat impresi item galeri SEKALI per sesi browser (agar refresh tak menggelembungkan
 * angka). Dedupe via sessionStorage per-slug.
 */
export function ViewBeacon({ slug, ids }: { slug: string; ids: string[] }) {
  useEffect(() => {
    if (!ids.length) return;
    const key = `galv:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode / storage diblokir → tetap kirim sekali per load */
    }
    beacon({ type: "view", ids });
  }, [slug, ids]);
  return null;
}

/** Tombol "Chat WA" yang mencatat klik (intent) lalu membuka WhatsApp. */
export function ChatWaButton({ itemId, href }: { itemId: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => beacon({ type: "click", id: itemId })}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
    >
      <MessageCircle className="size-4" /> Saya Berminat (Chat WA)
    </a>
  );
}
