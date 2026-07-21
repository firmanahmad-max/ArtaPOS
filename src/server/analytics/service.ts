import "server-only";
import { db } from "@/lib/db";
import { localParts, startOfDay, dayKey } from "@/lib/timezone";

/** Service Analitik — agregasi untuk dashboard laporan. Ter-scope tenantId. */

/** Tren penjualan harian (omzet) `days` hari terakhir, termasuk hari nol. */
export async function salesTrend(tenantId: string, days = 14) {
  // Bucket harian pada zona laporan (WIB), bukan zona server (UTC di Vercel).
  const { y, m, d } = localParts();
  const start = startOfDay(y, m, d - (days - 1));
  const sales = await db.sale.findMany({
    where: { tenantId, status: "COMPLETED", createdAt: { gte: start } },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(dayKey(startOfDay(y, m, d - (days - 1) + i)), 0);
  }
  for (const s of sales) {
    const k = dayKey(s.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + s.total);
  }
  return [...buckets.entries()].map(([key, total]) => {
    const [, m, day] = key.split("-");
    return { key, label: `${day}/${m}`, total };
  });
}

/**
 * Tren pendapatan jasa servis harian `days` hari terakhir, termasuk hari nol.
 * Pendapatan diakui saat tiket SELESAI/DISERAHKAN (`completedAt`), bukan saat
 * tiket dibuat — tiket lama yang baru diserahkan hari ini muncul hari ini.
 */
export async function serviceTrend(tenantId: string, days = 14) {
  const { y, m, d } = localParts();
  const start = startOfDay(y, m, d - (days - 1));
  const tickets = await db.serviceTicket.findMany({
    where: {
      tenantId,
      status: { in: ["DONE", "DELIVERED"] },
      OR: [{ completedAt: { gte: start } }, { completedAt: null, createdAt: { gte: start } }],
    },
    select: { total: true, completedAt: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(dayKey(startOfDay(y, m, d - (days - 1) + i)), 0);
  }
  for (const t of tickets) {
    const k = dayKey(t.completedAt ?? t.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + t.total);
  }
  return [...buckets.entries()].map(([key, total]) => {
    const [, m, day] = key.split("-");
    return { key, label: `${day}/${m}`, total };
  });
}

/**
 * Produk terlaris `days` hari terakhir (berdasarkan qty keluar).
 * Mencakup penjualan kasir, sparepart yang terpakai di servis, dan komponen
 * rakit PC — semuanya sama-sama stok keluar yang ditagih ke pelanggan.
 */
export async function topProducts(tenantId: string, days = 30, limit = 5) {
  const since = new Date(Date.now() - days * 86400000);
  const notCancelled = { status: { not: "CANCELLED" as const }, createdAt: { gte: since } };
  const [saleRows, serviceRows, buildRows] = await Promise.all([
    db.saleItem.groupBy({
      by: ["productName"],
      where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: since } } },
      _sum: { qty: true, subtotal: true },
    }),
    db.serviceItem.groupBy({
      by: ["name"],
      // productId != null → hanya sparepart (bukan baris jasa/non-stok).
      where: { productId: { not: null }, ticket: { tenantId, ...notCancelled } },
      _sum: { qty: true, subtotal: true },
    }),
    db.pcBuildItem.groupBy({
      by: ["productName"],
      where: { build: { tenantId, ...notCancelled } },
      _sum: { qty: true, subtotal: true },
    }),
  ]);

  const agg = new Map<string, { qty: number; revenue: number }>();
  const add = (name: string, qty: number, revenue: number) => {
    const cur = agg.get(name) ?? { qty: 0, revenue: 0 };
    agg.set(name, { qty: cur.qty + qty, revenue: cur.revenue + revenue });
  };
  for (const r of saleRows) add(r.productName, r._sum.qty ?? 0, r._sum.subtotal ?? 0);
  for (const r of serviceRows) add(r.name, r._sum.qty ?? 0, r._sum.subtotal ?? 0);
  for (const r of buildRows) add(r.productName, r._sum.qty ?? 0, r._sum.subtotal ?? 0);

  return [...agg.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, limit);
}

/**
 * Stok mati: produk berstok yang TIDAK bergerak keluar dalam `days` hari.
 * Dasarnya StockMovement (SALE/SERVICE_OUT/BUILD_OUT) agar produk yang rutin
 * terpakai sebagai sparepart servis tidak salah dilaporkan "tak laku".
 */
export async function deadStock(tenantId: string, days = 60, limit = 20) {
  const since = new Date(Date.now() - days * 86400000);
  const moved = await db.stockMovement.findMany({
    where: {
      tenantId,
      createdAt: { gte: since },
      type: { in: ["SALE", "SERVICE_OUT", "BUILD_OUT"] },
    },
    select: { productId: true },
    distinct: ["productId"],
  });
  const movedIds = moved.map((s) => s.productId);
  return db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      stock: { gt: 0 },
      ...(movedIds.length ? { id: { notIn: movedIds } } : {}),
    },
    select: { id: true, name: true, stock: true, sellPrice: true },
    orderBy: { stock: "desc" },
    take: limit,
  });
}

/** Produk stok menipis/habis (stok <= minStock, minStock > 0). */
export async function lowStock(tenantId: string, limit = 20) {
  const rows = await db.product.findMany({
    where: { tenantId, isActive: true, minStock: { gt: 0 } },
    select: { id: true, name: true, stock: true, minStock: true },
    orderBy: { stock: "asc" },
    take: 100,
  });
  return rows.filter((p) => p.stock <= p.minStock).slice(0, limit);
}
