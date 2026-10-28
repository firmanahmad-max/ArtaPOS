"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, MessageSquareHeart, Pencil, Star } from "lucide-react";
import { recordGoogleClickAction, submitReviewAction } from "@/server/reviews/actions";
import { MAX_COMMENT, RATING_LABEL } from "@/lib/review";
import { cn } from "@/lib/utils";

type OutcomeKind = "google" | "thanks" | "followup";

/**
 * Form ulasan publik: 5 bintang + komentar + izin tampil sebagai testimoni.
 * Setelah kirim: 4–5 bintang → ajakan utama ulas di Google; 1–3 bintang → pesan
 * bahwa pemilik akan menghubungi + tautan Google tetap tersedia (bukan "review
 * gating" — kebijakan Google melarang hanya mengajak pelanggan yang puas).
 */
export function ReviewForm({
  token,
  storeName,
  initial,
  googleUrl,
}: {
  token: string;
  storeName: string;
  initial: { rating: number | null; comment: string; allowPublic: boolean; submitted: boolean };
  /** Link ulasan Google toko (sudah divalidasi domain Google) atau null. */
  googleUrl: string | null;
}) {
  const [rating, setRating] = useState(initial.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initial.comment);
  const [allowPublic, setAllowPublic] = useState(initial.allowPublic);
  const [editing, setEditing] = useState(!initial.submitted);
  const [outcome, setOutcome] = useState<OutcomeKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const shown = hover || rating;

  function submit() {
    setError(null);
    if (rating < 1) return setError("Pilih jumlah bintang dulu.");
    start(async () => {
      const r = await submitReviewAction(token, { rating, comment, allowPublic: allowPublic && !!comment.trim() });
      if (!r.ok) return setError(r.message);
      setOutcome(r.outcome);
      setEditing(false);
    });
  }

  function onGoogle() {
    void recordGoogleClickAction(token);
    if (comment.trim() && navigator.clipboard) {
      navigator.clipboard.writeText(comment.trim()).then(
        () => setCopied(true),
        () => {},
      );
    }
  }

  // ── Sudah terkirim ────────────────────────────────────────────────────────
  if (!editing) {
    const kind = outcome ?? (rating >= 4 ? (googleUrl ? "google" : "thanks") : "followup");
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border bg-card p-5 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <p className="mt-2 text-lg font-bold">Terima kasih atas ulasannya! 🙏</p>
          <p className="mt-1 text-2xl tracking-widest text-amber-500" aria-label={`${rating} dari 5 bintang`}>
            {"★".repeat(rating)}
            <span className="text-muted-foreground/40">{"★".repeat(5 - rating)}</span>
          </p>
          {kind === "followup" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Mohon maaf pengalaman Anda belum maksimal. Masukan ini langsung diterima pemilik {storeName}, dan kami akan
              menghubungi Anda untuk memperbaikinya.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Senang sekali bisa melayani Anda.</p>
          )}
        </div>

        <GoogleBox primary={kind === "google"} url={googleUrl} onClick={onGoogle} copied={copied} hasComment={!!comment.trim()} />

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Pencil className="size-3.5" /> Ubah ulasan
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex justify-center gap-1" role="radiogroup" aria-label="Penilaian bintang" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} bintang — ${RATING_LABEL[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star className={cn("size-11", n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
        <p className="mt-2 h-5 text-center text-sm font-semibold">{shown ? RATING_LABEL[shown] : "Ketuk bintang untuk menilai"}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="rv-comment" className="text-sm font-medium">
          Ceritakan pengalaman Anda <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id="rv-comment"
          rows={4}
          maxLength={MAX_COMMENT}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            rating && rating < 4
              ? "Apa yang kurang? Masukan Anda akan langsung dibaca pemilik toko."
              : "mis. Servis cepat, teknisinya ramah & menjelaskan masalahnya dengan jelas."
          }
          className="w-full rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-right text-[11px] text-muted-foreground">
          {comment.length}/{MAX_COMMENT}
        </p>
        <label className={cn("flex items-start gap-2 text-sm", !comment.trim() && "opacity-50")}>
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={allowPublic && !!comment.trim()}
            disabled={!comment.trim()}
            onChange={(e) => setAllowPublic(e.target.checked)}
          />
          <span>
            Boleh ditampilkan sebagai testimoni di galeri {storeName}
            <span className="block text-xs text-muted-foreground">Nama disingkat (mis. &ldquo;Budi S.&rdquo;), tanpa No. HP.</span>
          </span>
        </label>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-brand text-base font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <MessageSquareHeart className="size-5" />} Kirim ulasan
      </button>
    </div>
  );
}

function GoogleBox({
  primary,
  url,
  onClick,
  copied,
  hasComment,
}: {
  primary: boolean;
  url: string | null;
  onClick: () => void;
  copied: boolean;
  hasComment: boolean;
}) {
  if (!url) return null;
  if (!primary) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Anda juga bisa menulis ulasan publik di{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={onClick} className="font-medium text-primary underline">
          Google
        </a>
        .
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-center">
      <p className="font-semibold">Bantu kami dengan ulasan yang sama di Google? ⭐</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ulasan Anda membantu orang lain menemukan toko yang bisa dipercaya. Hanya perlu 1 menit.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-5 text-sm font-semibold text-white hover:opacity-90"
      >
        <ExternalLink className="size-4" /> Tulis ulasan di Google
      </a>
      {hasComment && (
        <p className="mt-2 text-xs text-muted-foreground">
          {copied ? "✓ Ulasan Anda sudah disalin — tinggal tempel di Google." : "Ulasan Anda otomatis disalin saat tombol ditekan."}
        </p>
      )}
    </div>
  );
}
