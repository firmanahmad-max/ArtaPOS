/**
 * Program Ajak Teman (referral) — aturan murni (tanpa I/O) agar mudah diuji & dipakai
 * klien + server. Member membagikan link /ajak/<toko>/<kode>; teman BARU mendaftar;
 * saat teman menyelesaikan transaksi LUNAS pertama ≥ minimal dalam masa berlaku,
 * keduanya mendapat bonus poin (sekali saja per teman).
 */

export interface ReferralConfig {
  enabled: boolean;
  referrerPoints: number;
  friendPoints: number;
  minPurchase: number;
  validDays: number;
}

export const DEFAULT_REFERRAL: ReferralConfig = {
  enabled: false,
  referrerPoints: 200,
  friendPoints: 100,
  minPurchase: 100_000,
  validDays: 60,
};

/** Batas bonus yang bisa didapat satu pengajak per 30 hari (anti-curang). */
export const REFERRER_MONTHLY_CAP = 10;
/** Batas pendaftaran teman lewat satu kode per hari (anti-spam form publik). */
export const SIGNUPS_PER_CODE_PER_DAY = 5;

// Huruf/angka yang tak mudah tertukar saat diucapkan/diketik (tanpa 0/O/1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Kode ajak: ≤5 huruf depan nama (A–Z) + 3 karakter acak, mis. "DEWI7K2".
 * `rand` diinjeksi (0..1) agar bisa diuji.
 */
export function makeReferralCode(name: string | null | undefined, rand: () => number = Math.random): string {
  const prefix =
    (name ?? "")
      .normalize("NFD")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 5) || "TEMAN";
  let suffix = "";
  for (let i = 0; i < 3; i++) suffix += ALPHABET[Math.floor(rand() * ALPHABET.length) % ALPHABET.length];
  return prefix + suffix;
}

export function normalizeReferralCode(v: string | null | undefined): string {
  return (v ?? "").replace(/[\s-]/g, "").toUpperCase();
}

export function isReferralCode(v: string | null | undefined): boolean {
  return /^[A-Z]{1,5}[A-Z0-9]{3}$/.test(normalizeReferralCode(v));
}

export function buildReferralUrl(origin: string, slug: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/ajak/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
}

export function validateReferralConfig(c: ReferralConfig): string | null {
  const int = (n: number) => Number.isInteger(n) && n >= 0;
  if (!int(c.referrerPoints) || c.referrerPoints > 100_000) return "Bonus pengajak harus 0–100.000 poin.";
  if (!int(c.friendPoints) || c.friendPoints > 100_000) return "Bonus teman harus 0–100.000 poin.";
  if (c.enabled && c.referrerPoints + c.friendPoints === 0) return "Isi bonus untuk pengajak atau teman.";
  if (!int(c.minPurchase) || c.minPurchase > 1_000_000_000) return "Minimal transaksi tidak valid.";
  if (!int(c.validDays) || c.validDays < 7 || c.validDays > 365) return "Masa berlaku harus 7–365 hari.";
  return null;
}

/** Transaksi lunas memenuhi syarat bonus? */
export function qualifies(total: number, cfg: Pick<ReferralConfig, "minPurchase">): boolean {
  return total > 0 && total >= cfg.minPurchase;
}

export type ReferralView = "pending" | "rewarded" | "expired" | "cancelled";

export function referralView(
  r: { status: "PENDING" | "REWARDED" | "CANCELLED"; expiresAt: Date | string },
  now: number,
): ReferralView {
  if (r.status === "REWARDED") return "rewarded";
  if (r.status === "CANCELLED") return "cancelled";
  return new Date(r.expiresAt).getTime() < now ? "expired" : "pending";
}

export interface ReferralSummary {
  joined: number;
  rewarded: number;
  pending: number;
  expired: number;
  /** Persen teman terdaftar yang berhasil bertransaksi (bonus diberikan). */
  conversion: number;
  pointsGiven: number;
  /** Omzet transaksi pertama teman yang berhasil. */
  revenue: number;
}

export function summarizeReferrals(
  rows: {
    status: "PENDING" | "REWARDED" | "CANCELLED";
    expiresAt: Date | string;
    referrerPoints: number;
    friendPoints: number;
    qualifyingTotal: number | null;
  }[],
  now: number,
): ReferralSummary {
  const s: ReferralSummary = { joined: 0, rewarded: 0, pending: 0, expired: 0, conversion: 0, pointsGiven: 0, revenue: 0 };
  for (const r of rows) {
    const v = referralView(r, now);
    if (v === "cancelled") continue;
    s.joined++;
    if (v === "rewarded") {
      s.rewarded++;
      s.pointsGiven += r.referrerPoints + r.friendPoints;
      s.revenue += r.qualifyingTotal ?? 0;
    } else if (v === "pending") s.pending++;
    else s.expired++;
  }
  s.conversion = s.joined ? Math.round((s.rewarded / s.joined) * 100) : 0;
  return s;
}

/** Nama tampil pengajak di halaman publik (privasi): "Dewi Lestari" → "Dewi L." */
export function referrerDisplayName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Teman Anda";
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts.length > 1 ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first;
}
