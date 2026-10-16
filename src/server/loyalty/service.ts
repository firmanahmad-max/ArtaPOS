import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { programStarted, resolveRedemption, type LoyaltyConfig } from "@/lib/loyalty";

/**
 * Poin loyalitas lintas modul (kasir, servis, rakit PC) — dipanggil DI DALAM transaksi
 * pemanggil. Aturan murni ada di `src/lib/loyalty.ts`.
 */

type Tx = Prisma.TransactionClient;

/** Referensi dokumen sumber poin (tepat satu diisi). */
export type PointRef = { saleId: string } | { serviceTicketId: string } | { pcBuildId: string };

/** Aturan poin toko, dengan status "sudah mulai" dinilai pada waktu `at`. */
export async function loadLoyalty(tx: Tx, tenantId: string, at: number = Date.now()): Promise<LoyaltyConfig & { startAt: Date | null }> {
  const t = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: { pointValue: true, pointMinRedeem: true, pointServiceMultiplier: true, pointsStartAt: true },
  });
  return {
    pointValue: t?.pointValue ?? 0,
    minRedeem: t?.pointMinRedeem ?? 0,
    serviceMultiplier: t?.pointServiceMultiplier ?? 2,
    startsAt: t?.pointsStartAt?.toISOString() ?? null,
    started: programStarted(t?.pointsStartAt, at),
    startAt: t?.pointsStartAt ?? null,
  };
}

/** Jumlah poin EARN yang SUDAH diberikan untuk dokumen ini (bruto, sebelum penarikan). */
async function earnedSoFar(tx: Tx, tenantId: string, ref: PointRef) {
  const agg = await tx.pointEntry.aggregate({ where: { tenantId, type: "EARN", ...ref }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/**
 * Naikkan poin dokumen ke `target` kumulatif: beri selisihnya saja (tak pernah negatif).
 * Mengembalikan jumlah poin yang baru diberikan.
 */
export async function awardPointsUpTo(
  tx: Tx,
  p: { tenantId: string; customerId: string; target: number; ref: PointRef; note: string },
): Promise<number> {
  const delta = p.target - (await earnedSoFar(tx, p.tenantId, p.ref));
  if (delta <= 0) return 0;
  // updateMany + tenantId = lapis kedua isolasi tenant.
  const r = await tx.customer.updateMany({
    where: { id: p.customerId, tenantId: p.tenantId },
    data: { points: { increment: delta } },
  });
  if (r.count === 0) return 0; // pelanggan sudah dihapus
  await tx.pointEntry.create({
    data: { tenantId: p.tenantId, customerId: p.customerId, points: delta, type: "EARN", note: p.note, ...p.ref },
  });
  return delta;
}

/**
 * Tukar poin sebagai potongan pada tiket servis / rakitan (bukan pembayaran — pendapatan
 * tetap benar). Validasi dari DB, potong saldo ATOMIK, catat REDEEM. Mengembalikan
 * {points, discount} yang benar-benar dipakai.
 */
export async function redeemPointsOnJob(
  tx: Tx,
  p: { tenantId: string; customerId: string; requested: number; outstanding: number; ref: PointRef; note: string },
): Promise<{ points: number; discount: number }> {
  const cfg = await loadLoyalty(tx, p.tenantId);
  const c = await tx.customer.findFirst({ where: { id: p.customerId, tenantId: p.tenantId }, select: { points: true } });
  if (!c) throw new Error("Pelanggan tidak ditemukan.");
  const r = resolveRedemption(p.requested, c.points, p.outstanding, cfg);
  if (r.error) throw new Error(r.error);
  if (r.points <= 0) throw new Error("Tidak ada poin yang bisa ditukar (sisa tagihan sudah 0?).");
  const used = await tx.customer.updateMany({
    where: { id: p.customerId, tenantId: p.tenantId, points: { gte: r.points } },
    data: { points: { decrement: r.points } },
  });
  if (used.count !== 1) throw new Error("Saldo poin pelanggan berubah — muat ulang lalu coba lagi.");
  await tx.pointEntry.create({
    data: { tenantId: p.tenantId, customerId: p.customerId, points: -r.points, type: "REDEEM", note: p.note, ...p.ref },
  });
  return r;
}

/** Kembalikan SEMUA poin yang ditukar pada dokumen (batal tukar). Idempoten. */
export async function refundRedeemedOnJob(
  tx: Tx,
  p: { tenantId: string; customerId: string | null; ref: PointRef; note: string },
): Promise<number> {
  if (!p.customerId) return 0;
  const agg = await tx.pointEntry.aggregate({
    where: { tenantId: p.tenantId, type: "REDEEM", ...p.ref },
    _sum: { points: true },
  });
  const owed = -(agg._sum.points ?? 0);
  if (owed <= 0) return 0;
  const r = await tx.customer.updateMany({
    where: { id: p.customerId, tenantId: p.tenantId },
    data: { points: { increment: owed } },
  });
  if (r.count === 0) return 0;
  await tx.pointEntry.create({
    data: { tenantId: p.tenantId, customerId: p.customerId, points: owed, type: "REDEEM", note: p.note, ...p.ref },
  });
  return owed;
}
