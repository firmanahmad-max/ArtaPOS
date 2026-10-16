/**
 * Program POIN LOYALITAS — aturan murni (tanpa I/O), unit-tested.
 *
 * - Dapat poin: 1 poin per Rp 1.000 dari TOTAL yang dibayar (setelah semua potongan).
 * - Tukar poin: potongan belanja di kasir senilai `pointValue` rupiah per poin, hanya
 *   bila saldo ≥ `minRedeem`. Potongan tak pernah melebihi total yang harus dibayar.
 * - `pointValue` = 0 → penukaran nonaktif (poin tetap terkumpul).
 * - `startsAt` (jadwal mulai) → sebelum tanggal itu poin TIDAK didapat & TIDAK bisa
 *   ditukar; nota pelanggan terdaftar menampilkan pengumuman tanggal mulainya.
 */

export const RUPIAH_PER_POINT = 1000;

export interface LoyaltyConfig {
  /** Nilai 1 poin saat ditukar (rupiah). 0 = penukaran nonaktif. */
  pointValue: number;
  /** Minimal saldo poin agar bisa ditukar. */
  minRedeem: number;
  /** Jadwal mulai program (ISO). null/undefined = sudah berjalan. */
  startsAt?: string | null;
  /**
   * Sudah dimulai? Dihitung di SERVER saat render (hindari beda jam klien/server).
   * undefined = dianggap sudah dimulai.
   */
  started?: boolean;
}

/** Program sudah berjalan pada waktu `now`? (tanpa jadwal = sudah). */
export function programStarted(startsAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  return !startsAt || new Date(startsAt).getTime() <= now;
}

/** Status program dari konfigurasi (lihat `started`). */
export function isProgramStarted(cfg: LoyaltyConfig): boolean {
  return cfg.started !== false;
}

/** "1 November 2026" (zona WIB) untuk tanggal mulai program. */
export function formatStartDate(startsAt: Date | string): string {
  return new Date(startsAt).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
}

/** Poin yang didapat dari sebuah pembayaran. */
export function pointsEarnedFor(total: number): number {
  return total > 0 ? Math.floor(total / RUPIAH_PER_POINT) : 0;
}

/** Nilai rupiah sejumlah poin. */
export function pointsWorth(points: number, cfg: LoyaltyConfig): number {
  return Math.max(0, points) * Math.max(0, cfg.pointValue);
}

/** Cashback efektif program (persen dari belanja), mis. Rp 10/poin → 1%. */
export function cashbackPercent(cfg: LoyaltyConfig): number {
  return (Math.max(0, cfg.pointValue) / RUPIAH_PER_POINT) * 100;
}

/**
 * Maksimal poin yang boleh ditukar pada transaksi ini: dibatasi saldo dan agar
 * potongan ≤ total yang harus dibayar. 0 bila program nonaktif / saldo < minimal.
 */
export function maxRedeemablePoints(balance: number, payable: number, cfg: LoyaltyConfig): number {
  if (!isProgramStarted(cfg) || cfg.pointValue <= 0 || balance <= 0 || balance < cfg.minRedeem || payable <= 0) return 0;
  return Math.min(balance, Math.floor(payable / cfg.pointValue));
}

/**
 * Normalisasi permintaan tukar poin (dipakai klien & server): dibulatkan, dibatasi
 * maksimal. Hasil `points` 0 = tidak menukar. `error` diisi bila permintaan tak sah.
 */
export function resolveRedemption(
  requested: number,
  balance: number,
  payable: number,
  cfg: LoyaltyConfig,
): { points: number; discount: number; error?: string } {
  const want = Math.floor(Math.max(0, requested || 0));
  if (want === 0) return { points: 0, discount: 0 };
  if (!isProgramStarted(cfg)) {
    const when = cfg.startsAt ? ` (mulai ${formatStartDate(cfg.startsAt)})` : "";
    return { points: 0, discount: 0, error: `Program poin belum dimulai${when}.` };
  }
  if (cfg.pointValue <= 0) return { points: 0, discount: 0, error: "Penukaran poin sedang nonaktif." };
  if (balance < cfg.minRedeem) {
    return { points: 0, discount: 0, error: `Poin bisa ditukar mulai ${cfg.minRedeem} poin (saldo ${balance}).` };
  }
  if (want > balance) return { points: 0, discount: 0, error: `Poin tidak cukup (saldo ${balance}).` };
  const points = Math.min(want, maxRedeemablePoints(balance, payable, cfg));
  return { points, discount: points * cfg.pointValue };
}

/**
 * Baris info poin untuk nota/struk (teks polos). Dipakai struk visual, WhatsApp & ESC/POS
 * agar isinya selalu sama. Kosong bila tak ada pelanggan terdaftar. Sebelum program
 * dimulai: satu baris pengumuman tanggal mulai (dipanggil hanya utk pelanggan terdaftar).
 */
export function loyaltyNoteLines(
  p: { earned: number; redeemed: number; balance: number | null },
  cfg: LoyaltyConfig,
): string[] {
  if (!isProgramStarted(cfg)) {
    return cfg.startsAt
      ? [`Program Poin Member mulai ${formatStartDate(cfg.startsAt)}: dapat 1 poin tiap Rp 1.000 belanja.`]
      : [];
  }
  if (p.balance == null) return [];
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const lines: string[] = [];
  if (p.redeemed > 0) lines.push(`Poin ditukar: -${fmt(p.redeemed)}`);
  if (p.earned > 0) lines.push(`Poin didapat: +${fmt(p.earned)}`);
  const worth = pointsWorth(p.balance, cfg);
  lines.push(`Saldo poin: ${fmt(p.balance)}${cfg.pointValue > 0 ? ` (senilai Rp ${fmt(worth)})` : ""}`);
  const hint = redeemHint(p.balance, cfg);
  if (hint) lines.push(hint);
  return lines;
}

/** Kalimat ajakan: bisa ditukar sekarang, atau berapa poin lagi menuju minimal. */
export function redeemHint(balance: number, cfg: LoyaltyConfig): string | null {
  if (cfg.pointValue <= 0 || !isProgramStarted(cfg)) return null;
  const fmt = (n: number) => n.toLocaleString("id-ID");
  if (balance >= cfg.minRedeem) return "Tukarkan poin sebagai potongan belanja berikutnya.";
  const short = cfg.minRedeem - balance;
  return `Kumpulkan ${fmt(short)} poin lagi untuk mulai menukar (min. ${fmt(cfg.minRedeem)}).`;
}
