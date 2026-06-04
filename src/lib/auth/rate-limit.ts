import "server-only";
import { db } from "@/lib/db";

/**
 * Pembatas laju login berbasis database (Postgres) — tahan-lama lintas instance
 * serverless (Vercel), tidak seperti versi in-memory sebelumnya.
 *
 * Semua fungsi DEFENSIF: bila tabel belum ada (migrasi produksi belum jalan)
 * atau DB error, login tetap berjalan (fail-open) agar pengguna tak terkunci.
 */

const WINDOW_MS = 5 * 60 * 1000; // jendela hitung percobaan
const MAX_ATTEMPTS = 8; // ambang sebelum dikunci
const LOCK_MS = 15 * 60 * 1000; // durasi kunci setelah melewati ambang

/** True bila key sedang terkunci (terlalu banyak percobaan gagal). */
export async function isLoginLocked(key: string): Promise<boolean> {
  try {
    const rec = await db.loginAttempt.findUnique({ where: { key } });
    return !!rec?.lockUntil && rec.lockUntil.getTime() > Date.now();
  } catch {
    return false;
  }
}

/** Catat satu percobaan gagal; kunci bila melewati ambang dalam jendela waktu. */
export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  try {
    const rec = await db.loginAttempt.findUnique({ where: { key } });
    if (!rec || now - rec.firstAt.getTime() > WINDOW_MS) {
      await db.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAt: new Date(now), lockUntil: null },
        update: { count: 1, firstAt: new Date(now), lockUntil: null },
      });
      return;
    }
    const count = rec.count + 1;
    const lockUntil = count >= MAX_ATTEMPTS ? new Date(now + LOCK_MS) : rec.lockUntil;
    await db.loginAttempt.update({ where: { key }, data: { count, lockUntil } });
  } catch {
    /* fail-open */
  }
}

/** Reset percobaan setelah login sukses. */
export async function clearLoginAttempts(key: string): Promise<void> {
  try {
    await db.loginAttempt.deleteMany({ where: { key } });
  } catch {
    /* abaikan */
  }
}
