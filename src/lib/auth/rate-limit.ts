import "server-only";
import { db } from "@/lib/db";

/**
 * Pembatas laju berbasis database (Postgres) — tahan-lama lintas instance
 * serverless (Vercel). Dipakai login (per email/IP) & endpoint publik (per IP).
 *
 * Semua fungsi DEFENSIF: bila tabel belum ada (migrasi produksi belum jalan)
 * atau DB error, request tetap diizinkan (fail-open) agar tak memblokir layanan.
 */

const WINDOW_MS = 5 * 60 * 1000; // jendela hitung percobaan
const MAX_ATTEMPTS = 8; // ambang sebelum dikunci
const LOCK_MS = 15 * 60 * 1000; // durasi kunci setelah melewati ambang

export interface LimitOptions {
  windowMs?: number;
  maxAttempts?: number;
  lockMs?: number;
}

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
export async function recordLoginFailure(key: string, opts: LimitOptions = {}): Promise<void> {
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const lockMs = opts.lockMs ?? LOCK_MS;
  const now = Date.now();
  try {
    const rec = await db.loginAttempt.findUnique({ where: { key } });
    if (!rec || now - rec.firstAt.getTime() > windowMs) {
      await db.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAt: new Date(now), lockUntil: null },
        update: { count: 1, firstAt: new Date(now), lockUntil: null },
      });
      return;
    }
    const count = rec.count + 1;
    const lockUntil = count >= maxAttempts ? new Date(now + lockMs) : rec.lockUntil;
    await db.loginAttempt.update({ where: { key }, data: { count, lockUntil } });
  } catch {
    /* fail-open */
  }
}

/**
 * Rate-limit umum (cek + catat dalam satu panggilan). Mengembalikan `true` bila
 * request DIIZINKAN, `false` bila sudah melewati ambang (terkunci). Cocok untuk
 * endpoint publik tanpa konsep "gagal/sukses" — setiap panggilan dihitung.
 * Fail-open bila DB bermasalah.
 */
export async function checkRateLimit(key: string, opts: LimitOptions = {}): Promise<boolean> {
  const windowMs = opts.windowMs ?? WINDOW_MS;
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const lockMs = opts.lockMs ?? LOCK_MS;
  const now = Date.now();
  try {
    const rec = await db.loginAttempt.findUnique({ where: { key } });
    if (rec?.lockUntil && rec.lockUntil.getTime() > now) return false; // sedang terkunci
    if (!rec || now - rec.firstAt.getTime() > windowMs) {
      await db.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAt: new Date(now), lockUntil: null },
        update: { count: 1, firstAt: new Date(now), lockUntil: null },
      });
      return true;
    }
    const count = rec.count + 1;
    const lockUntil = count >= maxAttempts ? new Date(now + lockMs) : rec.lockUntil;
    await db.loginAttempt.update({ where: { key }, data: { count, lockUntil } });
    return count <= maxAttempts;
  } catch {
    return true; // fail-open
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
