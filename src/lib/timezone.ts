/**
 * Zona waktu laporan.
 *
 * Server produksi (mis. Vercel) berjalan di UTC, sedangkan toko memakai waktu
 * Indonesia. Tanpa penyesuaian, batas "hari" pada laporan & tren meleset
 * (penjualan dini hari masuk ke tanggal yang salah; tombol "hari ini" bisa
 * menampilkan data kemarin). Helper ini menghitung batas hari secara
 * DETERMINISTIK pada zona laporan — benar baik di server UTC maupun lokal.
 *
 * Default WIB (UTC+7, tetap, tanpa DST; mayoritas pengguna). Untuk WITA/WIT
 * cukup ubah offset di sini (atau kelak jadi setelan per-tenant).
 */
export const REPORT_TIME_ZONE = "Asia/Jakarta";
const OFFSET_MIN = 7 * 60; // WIB = UTC+7
const MS_PER_MIN = 60000;

/** Y/M/D menurut jam dinding zona laporan untuk sebuah instant (default: sekarang). */
export function localParts(at: Date = new Date()): { y: number; m: number; d: number } {
  const shifted = new Date(at.getTime() + OFFSET_MIN * MS_PER_MIN);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

/**
 * Instant UTC untuk awal hari (00:00 zona laporan) pada tanggal y/m/d.
 * Nilai m/d boleh meluap (mis. d+1, m+1) — dinormalkan otomatis oleh Date.UTC.
 */
export function startOfDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - OFFSET_MIN * MS_PER_MIN);
}

/** Kunci tanggal "YYYY-MM-DD" menurut zona laporan untuk sebuah instant. */
export function dayKey(at: Date): string {
  const { y, m, d } = localParts(at);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Format tanggal pada zona laporan (anti-ikut zona server). */
export function formatLocalDate(at: Date, opts: Intl.DateTimeFormatOptions): string {
  return at.toLocaleDateString("id-ID", { ...opts, timeZone: REPORT_TIME_ZONE });
}
