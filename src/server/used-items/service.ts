import "server-only";
import { db } from "@/lib/db";
import { nextDocNumber } from "@/server/shared/numbering";
import { startOfDay } from "@/lib/timezone";
import type { UsedItemInput } from "@/lib/validations/used-item";

/**
 * Service Barang Bekas — barang bekas MILIK TOKO, unik per unit (BK-xxxxx).
 * Semua query ter-scope tenantId. Tak menyentuh stok produk/StockMovement:
 * dijual lewat kasir (lihat createSale di pos service) dengan HPP = harga beli,
 * sehingga laba kotornya otomatis masuk laporan keuangan.
 */

/** "YYYY-MM-DD" (tanggal WIB) → awal hari itu; kosong → sekarang. */
function parseAcquired(v?: string | null): Date {
  if (!v) return new Date();
  const [y, m, d] = v.split("-").map(Number);
  return startOfDay(y, m - 1, d);
}

function data(input: UsedItemInput) {
  return {
    category: input.category,
    name: input.name,
    serialNumber: input.serialNumber ?? null,
    grade: input.grade,
    condition: input.condition ?? null,
    completeness: input.completeness ?? null,
    specs: input.specs ?? null,
    costPrice: input.costPrice,
    sellPrice: input.sellPrice,
    warrantyDays: input.warrantyDays,
    source: input.source,
    sourceName: input.sourceName ?? null,
    sourcePhone: input.sourcePhone ?? null,
    acquiredAt: parseAcquired(input.acquiredAt),
    note: input.note ?? null,
  };
}

export function listUsedItems(tenantId: string) {
  return db.usedItem.findMany({
    where: { tenantId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      number: true,
      category: true,
      name: true,
      serialNumber: true,
      grade: true,
      costPrice: true,
      sellPrice: true,
      soldPrice: true,
      warrantyDays: true,
      status: true,
      acquiredAt: true,
      statusAt: true,
      galleryItem: { select: { isActive: true } },
    },
  });
}

export function getUsedItem(tenantId: string, id: string) {
  return db.usedItem.findFirst({
    where: { id, tenantId },
    include: { galleryItem: { select: { id: true, isActive: true } } },
  });
}

/** Barang bekas yang tersedia — untuk dijual di kasir (izin pos.use). */
export function listUsedItemsForSale(tenantId: string) {
  return db.usedItem.findMany({
    where: { tenantId, status: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      number: true,
      category: true,
      name: true,
      serialNumber: true,
      grade: true,
      sellPrice: true,
      warrantyDays: true,
      galleryItem: { select: { id: true } },
    },
  });
}

/** Barang bekas yang dibeli/diterima dalam rentang (untuk laporan pembelian). */
export async function usedAcquisitionTotal(tenantId: string, range: { gte: Date; lt: Date }) {
  const agg = await db.usedItem.aggregate({ where: { tenantId, acquiredAt: range }, _sum: { costPrice: true } });
  return agg._sum.costPrice ?? 0;
}

export async function createUsedItem(tenantId: string, userId: string, input: UsedItemInput) {
  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "BK", () =>
      tx.usedItem.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } }),
    );
    return tx.usedItem.create({
      data: { tenantId, number, createdById: userId, ...data(input) },
      select: { id: true, number: true },
    });
  });
}

/**
 * Ubah data barang. Harga beli/jual hanya bisa diubah selama barang TERSEDIA
 * (barang terjual sudah ter-snapshot di penjualan). Harga di Galeri ikut disinkron.
 */
export async function updateUsedItem(tenantId: string, id: string, input: UsedItemInput) {
  const cur = await db.usedItem.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, costPrice: true, sellPrice: true },
  });
  if (!cur) throw new Error("Barang bekas tidak ditemukan.");
  const next = data(input);
  if (cur.status !== "AVAILABLE" && (next.costPrice !== cur.costPrice || next.sellPrice !== cur.sellPrice)) {
    throw new Error("Harga hanya bisa diubah selama barang masih tersedia.");
  }
  await db.$transaction([
    db.usedItem.update({ where: { id: cur.id }, data: next }),
    db.galleryItem.updateMany({ where: { usedItemId: cur.id, tenantId }, data: { price: next.sellPrice } }),
  ]);
}

const SOLD_VIA_POS =
  "Barang ini sudah terjual (lewat kasir atau dipakai di Rakit PC). Untuk membatalkannya, lakukan void/retur penjualannya atau hapus komponennya dari rakitan.";

/** Tarik dari penjualan ↔ jual lagi. Status "Terjual" hanya lewat kasir. */
export async function setUsedItemAvailability(tenantId: string, id: string, available: boolean) {
  const cur = await db.usedItem.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
  if (!cur) throw new Error("Barang bekas tidak ditemukan.");
  if (cur.status === "SOLD") throw new Error(SOLD_VIA_POS);
  await db.usedItem.update({
    where: { id: cur.id },
    data: available ? { status: "AVAILABLE", statusAt: null } : { status: "WITHDRAWN", statusAt: new Date() },
  });
}

export async function deleteUsedItem(tenantId: string, id: string) {
  const cur = await db.usedItem.findFirst({ where: { id, tenantId }, select: { id: true, status: true, saleId: true, pcBuildId: true } });
  if (!cur) throw new Error("Barang bekas tidak ditemukan.");
  // Jejak audit: barang yang pernah laku lewat kasir terhubung ke penjualannya.
  if (cur.saleId || cur.pcBuildId || cur.status === "SOLD") throw new Error("Barang yang sudah terjual tidak bisa dihapus.");
  await db.usedItem.delete({ where: { id: cur.id } });
}

/** Nomor invoice penjualan yang menjual barang ini (tampilan detail). */
export async function saleNumberFor(tenantId: string, saleId: string | null) {
  if (!saleId) return null;
  const s = await db.sale.findFirst({ where: { id: saleId, tenantId }, select: { number: true, status: true } });
  return s;
}
