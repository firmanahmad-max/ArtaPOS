/**
 * Pengingat servis berkala — aturan murni (tanpa I/O), unit-tested.
 * Jatuh tempo = tanggal servis terakhir (WIB) + N bulan kalender.
 *
 * Helper zona WIB di bawah SENGAJA disalin dari `timezone.ts` (bukan diimpor) agar
 * modul tetap bisa diuji langsung oleh `node --test` (impor relatif tanpa ekstensi
 * tidak bisa dimuat Node ESM).
 */

const WIB_MS = 7 * 60 * 60_000;
function localParts(at: Date) {
  const s = new Date(at.getTime() + WIB_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate() };
}
function startOfDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - WIB_MS);
}

/**
 * Tambah N bulan kalender (zona WIB), tanggal dijepit ke akhir bulan
 * (31 Agu + 6 bulan → 28/29 Feb, bukan meluap ke Maret). Hasil: awal hari WIB.
 */
export function addMonthsLocal(at: Date, months: number): Date {
  const { y, m, d } = localParts(at);
  const lastDay = new Date(Date.UTC(y, m + months + 1, 0)).getUTCDate();
  return startOfDay(y, m + months, Math.min(d, lastDay));
}

export type ReminderBucket = "overdue" | "soon" | "later";

/** Hari menuju jatuh tempo (negatif = sudah lewat). */
export function daysToDue(dueAt: Date, now: number): number {
  return Math.floor((dueAt.getTime() - now) / 86_400_000);
}

/** Jatuh tempo (sudah lewat/hari ini), segera (≤ `soonDays`), atau nanti. */
export function reminderBucket(dueAt: Date, now: number, soonDays = 14): ReminderBucket {
  const d = daysToDue(dueAt, now);
  if (d <= 0) return "overdue";
  if (d <= soonDays) return "soon";
  return "later";
}

/** "6 bulan" / "1 tahun" untuk interval katalog. */
export function intervalText(months: number): string {
  if (months <= 0) return "Tidak berkala";
  if (months % 12 === 0) return `${months / 12} tahun`;
  return `${months} bulan`;
}

/** Selisih bulan (dibulatkan ke bawah, minimal 1) — untuk "sudah N bulan sejak…". */
export function monthsSince(at: Date, now: number): number {
  const a = localParts(at);
  const b = localParts(new Date(now));
  return Math.max(1, (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0));
}
