import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Nomor dokumen berurutan per tenant (INV-00001, SV-00001, dst).
 *
 * Dua masalah pada pendekatan lama `count() + 1`:
 * 1. **Balapan (race)** — dua kasir yang checkout bersamaan menghitung angka
 *    yang sama, lalu salah satunya gagal karena unique constraint
 *    `[tenantId, number]` dengan pesan error yang membingungkan.
 * 2. **Penghapusan baris** — kalau satu dokumen terhapus, `count()` mengecil
 *    dan nomor yang sudah dipakai akan terpakai ulang → bentrok.
 *
 * Solusinya: kunci penasihat (advisory lock) per (tenant, prefix) selama
 * transaksi, lalu ambil nomor TERBESAR yang ada — bukan menghitung baris.
 * Lock-nya level-TRANSAKSI (`_xact_`), bukan level-sesi, jadi otomatis lepas
 * saat COMMIT dan tetap aman di belakang connection pooler mode transaction
 * (Supabase port 6543).
 *
 * WAJIB dipanggil di dalam `db.$transaction` — di luar transaksi, lock lepas
 * seketika sehingga tidak melindungi apa pun.
 *
 * @param findLast pengambil dokumen bernomor terbesar milik tenant ini.
 *   Urutan string aman karena nomornya lebar tetap & diisi nol di depan.
 */
export async function nextDocNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  prefix: string,
  findLast: () => Promise<{ number: string } | null>,
): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${prefix}`}))`;
  const last = await findLast();
  const parsed = last ? Number.parseInt(last.number.slice(prefix.length + 1), 10) : 0;
  const seq = (Number.isFinite(parsed) ? parsed : 0) + 1;
  return `${prefix}-${String(seq).padStart(5, "0")}`;
}
