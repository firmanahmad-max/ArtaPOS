"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";
import { buildReferralShareText, waLink } from "@/lib/whatsapp";
import { buildReferralUrl } from "@/lib/referral";
import { cn } from "@/lib/utils";

/**
 * Kartu "Ajak Teman, Dapat Bonus": kode + link pribadi member, tombol bagikan via
 * WhatsApp (pilih kontak sendiri) & salin link. URL dibangun di klien dari origin.
 */
export function ReferralShareCard({
  slug,
  code,
  storeName,
  referrerPoints,
  friendPoints,
  minPurchase,
  validDays,
  stats,
  compact = false,
}: {
  slug: string;
  code: string;
  storeName: string;
  referrerPoints: number;
  friendPoints: number;
  minPurchase: number;
  validDays: number;
  stats?: { rewarded: number; pending: number; points: number };
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url = () => buildReferralUrl(window.location.origin, slug, code);

  function share() {
    const text = buildReferralShareText({ storeName, friendPoints, minPurchase, url: url() });
    window.open(waLink(text), "_blank", "noopener,noreferrer");
  }
  function copy() {
    navigator.clipboard?.writeText(url()).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className={cn("rounded-2xl border border-amber-500/40 bg-amber-500/5", compact ? "p-4" : "p-5")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Gift className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Ajak Teman, Dapat Bonus</p>
          <p className="text-sm text-muted-foreground">
            Setiap teman baru yang bertransaksi pertama kali
            {minPurchase > 0 ? ` (min. Rp ${minPurchase.toLocaleString("id-ID")})` : ""}, Anda dapat{" "}
            <b className="text-foreground">+{referrerPoints.toLocaleString("id-ID")} poin</b> & teman Anda{" "}
            <b className="text-foreground">+{friendPoints.toLocaleString("id-ID")} poin</b>. Berlaku {validDays} hari sejak teman daftar.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg border bg-background px-3 py-1.5 font-mono text-base font-bold tracking-widest">{code}</span>
        <button
          type="button"
          onClick={share}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white hover:opacity-90"
        >
          <Share2 className="size-4" /> Bagikan via WhatsApp
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} {copied ? "Tersalin" : "Salin link"}
        </button>
      </div>
      {stats && (stats.rewarded > 0 || stats.pending > 0) && (
        <p className="mt-3 text-xs text-muted-foreground">
          <b className="text-foreground">{stats.rewarded}</b> teman berhasil · <b className="text-foreground">{stats.pending}</b> menunggu
          transaksi pertama · bonus Anda <b className="text-foreground">{stats.points.toLocaleString("id-ID")} poin</b>
        </p>
      )}
    </div>
  );
}
