"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Copy, Download, Loader2, PencilLine, Quote, Share2, Store } from "lucide-react";
import {
  DAILY_KIND_META,
  activeCustom,
  dailyKinds,
  dailyShareText,
  pickDaily,
  type CustomDailyItem,
  type DailyKind,
} from "@/lib/daily-content";
import { shareNodeAsImage } from "@/lib/share-image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StoryCanvas, STORY_H, STORY_W, type StoryStore } from "./story-canvas";

const PREVIEW_W = 176;
const SCALE = PREVIEW_W / STORY_W;

/**
 * Konten Harian: motivasi bisnis / tips teknologi / fakta IT yang berganti tiap hari WIB,
 * dibagikan ke Status WA & Story IG sebagai gambar 1080×1920 bermerek toko.
 * `now` & `defaultKind` dari server agar render server = klien (tanpa hydration mismatch).
 */
export function DailyContentCard({
  now,
  defaultKind,
  dateLabel,
  store,
  custom = [],
  canManage = false,
}: {
  now: number;
  defaultKind: DailyKind;
  dateLabel: string;
  store: StoryStore;
  /** Konten kustom toko yang aktif (bergilir bersama konten bawaan). */
  custom?: CustomDailyItem[];
  canManage?: boolean;
}) {
  const hasPromo = activeCustom(custom, now).some((c) => c.kind === "promo");
  const kinds = dailyKinds(hasPromo);
  const [kind, setKind] = useState<DailyKind>(defaultKind);
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  // Jenis tanpa konten (mis. promo kedaluwarsa) → kembali ke motivasi.
  const picked = pickDaily(kind, now, custom) ?? pickDaily("motivasi", now, custom)!;
  const shownKind: DailyKind = pickDaily(kind, now, custom) ? kind : "motivasi";
  const item = picked.item;
  const fileName = `${store.name.replace(/[^a-z0-9]+/gi, "-")}-${shownKind}-${dateLabel.replace(/[^0-9a-z]+/gi, "-")}.png`;

  const exportImage = async (downloadOnly: boolean) => {
    if (!storyRef.current) return;
    setBusy(downloadOnly ? "download" : "share");
    try {
      const { mode } = await shareNodeAsImage(storyRef.current, {
        fileName,
        title: DAILY_KIND_META[shownKind].kicker,
        text: dailyShareText(shownKind, item, store.name, store.phone),
        pixelRatio: 1,
        backgroundColor: "#111111",
        downloadOnly,
      });
      if (mode === "downloaded") {
        toast.success(downloadOnly ? "Gambar diunduh." : "Gambar diunduh — unggah ke Status WA / Story IG dari galeri HP.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gambar.");
    } finally {
      setBusy(null);
    }
  };

  const copyText = () =>
    navigator.clipboard.writeText(dailyShareText(shownKind, item, store.name, store.phone)).then(
      () => toast.success("Teks disalin."),
      () => toast.error("Gagal menyalin."),
    );

  return (
    <section className="flex flex-wrap overflow-hidden rounded-2xl border bg-card elevate">
      <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
              <Quote className="size-5" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold tracking-tight">Konten harian</h2>
              <p className="text-xs text-muted-foreground">Berganti setiap hari · siap dibagikan ke Status WA &amp; Story IG</p>
            </div>
          </div>
          {canManage && (
            <Link href="/daily-content" className="order-last inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:order-none sm:ml-auto sm:mr-1">
              <PencilLine className="size-3.5" /> Kelola konten toko
            </Link>
          )}
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label="Jenis konten">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={k === kind}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  k === kind ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {DAILY_KIND_META[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-muted/70 px-5 py-4">
          <p className="flex flex-wrap items-center gap-2 text-[10.5px] font-bold uppercase tracking-[.1em] text-primary">
            {DAILY_KIND_META[shownKind].kicker}
            {picked.customId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] tracking-normal normal-case">
                <Store className="size-3" /> Konten toko
              </span>
            )}
          </p>
          <p className="mt-2 text-lg font-bold leading-snug tracking-tight sm:text-xl">{item.body}</p>
          {item.steps && (
            <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              {item.steps.map((s, i) => (
                <li key={i}>
                  <span className="font-mono font-semibold text-foreground">{i + 1}.</span> {s}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Ajakan di gambar: {item.cta}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="whatsapp" onClick={() => exportImage(false)} disabled={busy !== null}>
            {busy === "share" ? <Loader2 className="animate-spin" /> : <Share2 />} Bagikan ke Status / Story
          </Button>
          <Button variant="outline" onClick={() => exportImage(true)} disabled={busy !== null}>
            {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />} Unduh gambar
          </Button>
          <Button variant="outline" onClick={copyText}>
            <Copy /> Salin teks
          </Button>
        </div>
      </div>

      <div className="flex flex-[1_1_220px] items-center justify-center bg-gradient-to-br from-muted to-accent p-5">
        {/* Pratinjau = komponen yang sama di-scale; diekspor utuh 1080×1920 (transform diabaikan saat ekspor). */}
        <div
          className="overflow-hidden rounded-[18px] shadow-xl"
          style={{ width: PREVIEW_W, height: Math.round(STORY_H * SCALE) }}
          aria-label="Pratinjau gambar story"
          role="img"
        >
          <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: STORY_W, height: STORY_H }}>
            <StoryCanvas ref={storyRef} kind={shownKind} item={item} store={store} dateLabel={dateLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}
