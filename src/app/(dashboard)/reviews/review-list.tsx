"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Download, Eye, EyeOff, ImageIcon, Loader2, MessageCircle, RotateCcw, Share2, X } from "lucide-react";
import { setFollowUpAction, setTestimonialAction } from "@/server/reviews/actions";
import { shareNodeAsImage } from "@/lib/share-image";
import { waLink } from "@/lib/whatsapp";
import { REVIEW_SOURCE_LABEL, shortName, type ReviewSourceKey } from "@/lib/review";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { TestimonialCanvas, TESTI_H, TESTI_W, type TestimonialStore } from "./testimonial-canvas";

export interface ReviewItem {
  id: string;
  source: ReviewSourceKey;
  docId: string | null;
  docNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  rating: number | null;
  comment: string | null;
  allowPublic: boolean;
  testimonial: "PENDING" | "APPROVED" | "HIDDEN";
  googleClicked: boolean;
  followUpDone: boolean;
  followUpText: string | null; // "29 Okt 2026" bila sudah
  followUpNote: string | null;
  requestedText: string | null;
  submittedText: string | null;
}

const DOC_HREF: Record<ReviewSourceKey, string> = { SERVICE: "/service", BUILD: "/pc-build", SALE: "/sales" };
const PREVIEW_W = 300;

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("tracking-wider text-amber-500", className)} aria-label={`${n} dari 5 bintang`}>
      {"★".repeat(n)}
      <span className="text-muted-foreground/40">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export function ReviewList({
  items,
  storeName,
  store,
  empty,
}: {
  items: ReviewItem[];
  storeName: string;
  store: TestimonialStore;
  empty: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [share, setShare] = useState<ReviewItem | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  async function exportImage(downloadOnly: boolean) {
    if (!canvasRef.current || !share) return;
    setBusy(true);
    try {
      const { mode } = await shareNodeAsImage(canvasRef.current, {
        fileName: `Testimoni-${shortName(share.customerName).replace(/\W+/g, "-").replace(/^-+|-+$/g, "")}.png`,
        title: `Testimoni pelanggan ${storeName}`,
        text: `"${share.comment}" — ${shortName(share.customerName)}`,
        pixelRatio: 1,
        backgroundColor: "#1b0f3b",
        downloadOnly,
      });
      if (mode === "downloaded") toast.success("Gambar diunduh — unggah ke Story/Feed dari galeri HP.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gambar.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">{empty}</Card>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((r) => {
          const low = r.rating != null && r.rating < 4;
          const href = r.docId ? `${DOC_HREF[r.source]}/${r.docId}` : null;
          return (
            <Card key={r.id} className={cn("space-y-3 p-4", low && !r.followUpDone && "border-rose-500/40")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {r.rating != null ? <Stars n={r.rating} className="text-lg" /> : <Badge variant="secondary">Belum diisi</Badge>}
                  <p className="mt-0.5 text-sm font-semibold">{r.customerName || "Pelanggan"}</p>
                  <p className="text-xs text-muted-foreground">
                    {REVIEW_SOURCE_LABEL[r.source]} ·{" "}
                    {href ? (
                      <Link href={href} className="font-mono hover:underline">{r.docNumber}</Link>
                    ) : (
                      <span className="font-mono">{r.docNumber}</span>
                    )}
                    {r.submittedText ? ` · ${r.submittedText}` : r.requestedText ? ` · diminta ${r.requestedText}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.googleClicked && <Badge variant="success">Ke Google ✓</Badge>}
                  {r.allowPublic && (
                    <Badge variant={r.testimonial === "APPROVED" ? "default" : r.testimonial === "HIDDEN" ? "muted" : "warning"}>
                      {r.testimonial === "APPROVED" ? "Tampil di Galeri" : r.testimonial === "HIDDEN" ? "Testimoni disembunyikan" : "Izin testimoni"}
                    </Badge>
                  )}
                </div>
              </div>

              {r.comment && <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">&ldquo;{r.comment}&rdquo;</p>}

              {r.rating == null && r.docId && (
                <RequestReviewButton source={r.source} id={r.docId} storeName={storeName} status={{ rating: null, requested: true }} />
              )}

              {/* Ulasan rendah → tindak lanjut pemilik (tidak publik) */}
              {low &&
                (r.followUpDone ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm">
                    <span>
                      <b className="text-success">✓ Ditindaklanjuti</b> {r.followUpText}
                      {r.followUpNote ? ` — ${r.followUpNote}` : ""}
                    </span>
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setFollowUpAction(r.id, false))}>
                      <RotateCcw className="size-3.5" /> Buka lagi
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Perlu ditindaklanjuti — hubungi pelanggan & perbaiki.</p>
                    <input
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="Catatan (mis. ganti pasta, servis ulang gratis)"
                      maxLength={300}
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      {r.customerPhone && (
                        <a
                          href={waLink(
                            `Halo Kak ${r.customerName?.split(/\s+/)[0] ?? ""}, terima kasih atas ulasannya untuk ${r.docNumber}. Mohon maaf pengalaman Anda belum memuaskan 🙏 Boleh kami tahu lebih detail agar bisa segera kami perbaiki?`,
                            r.customerPhone,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#25D366] px-3 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <MessageCircle className="size-3.5" /> Hubungi via WA
                        </a>
                      )}
                      <Button size="sm" disabled={pending} onClick={() => run(() => setFollowUpAction(r.id, true, notes[r.id]))}>
                        <Check className="size-3.5" /> Tandai sudah ditindaklanjuti
                      </Button>
                    </div>
                  </div>
                ))}

              {/* Testimoni: hanya bila pelanggan mengizinkan */}
              {r.allowPublic && r.comment && r.rating != null && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {r.testimonial !== "APPROVED" ? (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTestimonialAction(r.id, "APPROVED"))}>
                      <Eye className="size-3.5" /> Tampilkan di Galeri
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTestimonialAction(r.id, "HIDDEN"))}>
                      <EyeOff className="size-3.5" /> Sembunyikan
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setShare(r)}>
                    <ImageIcon className="size-3.5" /> Bagikan sebagai gambar
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {share && share.rating != null && share.comment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShare(null)}>
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Gambar testimoni</p>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setShare(null)} aria-label="Tutup">
                <X className="size-4" />
              </Button>
            </div>
            <div className="mx-auto overflow-hidden rounded-xl shadow-lg" style={{ width: PREVIEW_W, height: Math.round((TESTI_H * PREVIEW_W) / TESTI_W) }}>
              <div style={{ transform: `scale(${PREVIEW_W / TESTI_W})`, transformOrigin: "top left", width: TESTI_W, height: TESTI_H }}>
                <TestimonialCanvas
                  ref={canvasRef}
                  name={shortName(share.customerName)}
                  rating={share.rating}
                  comment={share.comment}
                  sourceLabel={REVIEW_SOURCE_LABEL[share.source]}
                  store={store}
                />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">Nama disingkat sesuai izin pelanggan. Ukuran 1080×1350 (Feed IG / Status WA).</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="whatsapp" disabled={busy} onClick={() => exportImage(false)}>
                {busy ? <Loader2 className="animate-spin" /> : <Share2 />} Bagikan
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => exportImage(true)}>
                <Download /> Unduh
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
