/**
 * Ulasan & Testimoni Pelanggan — aturan murni (tanpa I/O) agar mudah diuji & dipakai
 * klien + server. Alur: toko kirim link pribadi /ulasan/<token> via WA → pelanggan
 * memberi 1–5 bintang (+komentar). 4–5 bintang diajak mengulas di Google Maps;
 * 1–3 bintang masuk tindak lanjut pemilik (tidak publik). Testimoni hanya tampil
 * bila pelanggan MENGIZINKAN dan toko menyetujuinya.
 */

export type ReviewSourceKey = "SERVICE" | "BUILD" | "SALE";

export const REVIEW_SOURCE_LABEL: Record<ReviewSourceKey, string> = {
  SERVICE: "Servis",
  BUILD: "Rakit PC",
  SALE: "Belanja",
};

/** Kata untuk tiap bintang (tampil saat pelanggan memilih). */
export const RATING_LABEL: Record<number, string> = {
  1: "Kecewa",
  2: "Kurang puas",
  3: "Cukup",
  4: "Puas",
  5: "Sangat puas",
};

export const MAX_COMMENT = 500;
/** Batas bintang yang diajak mengulas di Google (≥) — di bawahnya masuk tindak lanjut. */
export const GOOGLE_MIN_RATING = 4;

export function isReviewToken(v: string | null | undefined): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{24,64}$/.test(v);
}

export function buildReviewUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/ulasan/${token}`;
}

/** Langkah setelah pelanggan mengirim ulasan. */
export function reviewOutcome(rating: number, hasGoogleUrl: boolean): "google" | "thanks" | "followup" {
  if (rating < GOOGLE_MIN_RATING) return "followup";
  return hasGoogleUrl ? "google" : "thanks";
}

/** Validasi isian publik. Kembalikan pesan galat atau null. */
export function validateReviewInput(p: { rating: unknown; comment?: unknown }): string | null {
  if (!Number.isInteger(p.rating) || (p.rating as number) < 1 || (p.rating as number) > 5) {
    return "Pilih 1 sampai 5 bintang.";
  }
  if (p.comment != null && typeof p.comment !== "string") return "Komentar tidak valid.";
  if (typeof p.comment === "string" && p.comment.trim().length > MAX_COMMENT) {
    return `Komentar maksimal ${MAX_COMMENT} karakter.`;
  }
  return null;
}

/** Rapikan komentar: spasi berlebih & baris kosong beruntun, potong panjang. */
export function cleanComment(v: string | null | undefined): string | null {
  const s = (v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_COMMENT);
  return s || null;
}

/** Nama tampil testimoni (privasi): "Budi Santoso" → "Budi S."; kosong → "Pelanggan". */
export function shortName(name: string | null | undefined): string {
  const parts = (name ?? "").replace(/[^\p{L}\p{N}\s.'-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Pelanggan";
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts.length > 1 ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first;
}

/**
 * Link ulasan Google yang diizinkan (https + domain Google) — dipakai sebagai
 * tujuan tombol di halaman publik, jadi dibatasi agar tak jadi pengalih ke situs lain.
 */
const GOOGLE_HOSTS = ["g.page", "goo.gl", "maps.app.goo.gl", "google.com", "google.co.id", "business.google.com"];
export function isGoogleReviewUrl(v: string | null | undefined): boolean {
  if (!v) return false;
  try {
    const u = new URL(v.trim());
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return GOOGLE_HOSTS.some((g) => h === g || h.endsWith(`.${g}`));
  } catch {
    return false;
  }
}

export interface ReviewRow {
  rating: number | null;
  submittedAt: Date | string | null;
  requestedAt: Date | string | null;
  googleClickedAt: Date | string | null;
  followUpDoneAt: Date | string | null;
  allowPublic: boolean;
  testimonial: "PENDING" | "APPROVED" | "HIDDEN";
}

export interface ReviewSummary {
  requested: number;
  submitted: number;
  /** Rata-rata bintang (1 desimal), null bila belum ada ulasan. */
  average: number | null;
  /** Jumlah per bintang, indeks 1..5 (indeks 0 tak dipakai). */
  distribution: number[];
  /** Persen ulasan yang masuk dari permintaan yang dikirim (0–100). */
  responseRate: number;
  google: number;
  /** Ulasan rendah yang belum ditindaklanjuti. */
  openFollowUps: number;
  /** Ulasan berizin publik yang menunggu ditinjau. */
  pendingTestimonials: number;
  approvedTestimonials: number;
}

export function summarizeReviews(rows: ReviewRow[]): ReviewSummary {
  const distribution = [0, 0, 0, 0, 0, 0];
  let sum = 0;
  const s: ReviewSummary = {
    requested: 0,
    submitted: 0,
    average: null,
    distribution,
    responseRate: 0,
    google: 0,
    openFollowUps: 0,
    pendingTestimonials: 0,
    approvedTestimonials: 0,
  };
  for (const r of rows) {
    if (r.requestedAt || r.submittedAt) s.requested++;
    if (r.rating == null || !r.submittedAt) continue;
    s.submitted++;
    sum += r.rating;
    distribution[r.rating]++;
    if (r.googleClickedAt) s.google++;
    if (r.rating < GOOGLE_MIN_RATING && !r.followUpDoneAt) s.openFollowUps++;
    if (r.allowPublic && r.testimonial === "PENDING") s.pendingTestimonials++;
    if (r.allowPublic && r.testimonial === "APPROVED") s.approvedTestimonials++;
  }
  if (s.submitted) s.average = Math.round((sum / s.submitted) * 10) / 10;
  s.responseRate = s.requested ? Math.min(100, Math.round((s.submitted / s.requested) * 100)) : 0;
  return s;
}

/** "4,8" — format rata-rata bergaya Indonesia. */
export const formatRating = (n: number) => n.toFixed(1).replace(".", ",");
