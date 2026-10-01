/**
 * Retry untuk error KONEKSI database yang sesaat (transient).
 *
 * Latar: di serverless (Vercel) + Postgres pooled (Supabase), kadang koneksi
 * gagal didapat sesaat — cold-start DB, lonjakan koneksi, atau pool timeout
 * (`connectionTimeoutMillis` di `src/lib/db.ts`). Ini memunculkan error yang
 * langsung pulih pada percobaan berikutnya (mis. layar "Terjadi kesalahan").
 *
 * KUNCI KEAMANAN: kita HANYA retry error yang terjadi saat *mendapatkan*
 * koneksi — sebelum SQL apa pun berjalan. Karena operasinya belum sempat mulai,
 * mengulang seluruh operasi (termasuk `db.$transaction` yang atomik & otomatis
 * rollback saat gagal) AMAN dari risiko tereksekusi dua kali. Error lain
 * (unik/validasi/logika) TIDAK di-retry — langsung dilempar.
 */

/** Kode error Prisma untuk masalah koneksi/ketersediaan server (bukan data). */
const TRANSIENT_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server reachable but timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
]);

/** Pola pesan dari driver node-postgres / jaringan untuk kegagalan koneksi. */
const TRANSIENT_PATTERNS = [
  "timeout exceeded when trying to connect", // pg-pool: pool penuh/lambat
  "connection terminated",
  "connection reset",
  "econnreset",
  "etimedout",
  "econnrefused",
  "enotfound",
  "can't reach database server",
  "server has closed the connection",
  "too many connections",
];

export function isTransientDbError(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  if (code && TRANSIENT_CODES.has(code)) return true;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Jalankan `op`; bila gagal karena error koneksi sesaat, coba ulang beberapa
 * kali dengan backoff eksponensial kecil. Error non-transien langsung dilempar.
 *
 * @param op operasi DB (boleh berisi `db.$transaction`) — harus idempoten bila
 *   dijalankan ulang; aman karena retry hanya untuk kegagalan sebelum SQL mulai.
 */
export async function withDbRetry<T>(
  op: () => Promise<T>,
  opts?: { retries?: number; baseDelayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 2;
  const base = opts?.baseDelayMs ?? 150;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await op();
    } catch (e) {
      lastErr = e;
      if (attempt === retries || !isTransientDbError(e)) throw e;
      await new Promise((r) => setTimeout(r, base * 2 ** attempt));
    }
  }
  throw lastErr; // tak tercapai, tapi memuaskan tipe
}
