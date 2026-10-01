"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

/** Tombol bagikan item galeri — Web Share API (HP) dengan fallback WA/salin. */
export function ShareButton({ title, price, spec }: { title: string; price: number; spec: string | null }) {
  const [done, setDone] = useState(false);

  function buildText() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const priceText = price > 0 ? formatRupiah(price) : "Hubungi untuk harga";
    const body = `${title} — ${priceText}${spec ? `\n${spec}` : ""}`;
    return { url, body };
  }

  async function onShare() {
    const { url, body } = buildText();
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text: body, url });
        return;
      } catch {
        /* dibatalkan / tidak didukung → lanjut fallback */
      }
    }
    // Fallback: buka WhatsApp dengan teks siap kirim (pilih kontak/grup).
    const wa = `https://wa.me/?text=${encodeURIComponent(`${body}\n${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function onCopy() {
    const { url, body } = buildText();
    try {
      await navigator.clipboard.writeText(`${body}\n${url}`);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* diabaikan */
    }
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
      >
        <Share2 className="size-4" /> Bagikan
      </button>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Salin info"
        className="inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {done ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
