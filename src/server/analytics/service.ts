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

/** Tren pendapatan jasa servis harian `days` hari terakhir, termasuk hari nol. */
export async function serviceTrend(tenantId: string, days = 14) {
  const { y, m, d } = localParts();
  const start = startOfDay(y, m, d - (days - 1));
  const tickets = await db.serviceTicket.findMany({
    where: { tenantId, status: { not: "CANCELLED" }, createdAt: { gte: start } },
    select: { total: true, createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    buckets.set(dayKey(startOfDay(y, m, d - (days - 1) + i)), 0);
  }
  for (const t of tickets) {
    const k = dayKey(t.createdAt);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + t.total);
  }
  return [...buckets.entries()].map(([key, total]) => {
    const [, m, day] = key.split("-");
    return { key, label: `${day}/${m}`, total };
  });
}

/** Produk terlaris `days` hari terakhir (berdasarkan qty terjual). */
export async function topProducts(tenantId: string, days = 30, limit = 5) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db.saleItem.groupBy({
    by: ["productName"],
    where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: since } } },
    _sum: { qty: true, subtotal: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({
    name: r.productName,
    qty: r._sum.qty ?? 0,
    revenue: r._sum.subtotal ?? 0,
  }));
}

/** Stok mati: produk berstok tapi tidak terjual dalam `days` hari terakhir. */
export async function deadStock(tenantId: string, days = 60, limit = 20) {
  const since = new Date(Date.now() - days * 86400000);
  const sold = await db.saleItem.findMany({
    where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: since } } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const soldIds = sold.map((s) => s.productId);
  return db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      stock: { gt: 0 },
      ...(soldIds.length ? { id: { notIn: soldIds } } : {}),
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
