import type { CachedProduct } from "@/lib/offline/db";

/** Bentuk produk yang dipakai katalog POS (sama dgn PosProduct). */
export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: { symbol: string | null } | null;
}

/** Item outbox membawa payload penjualan; hanya `items` yang relevan di sini. */
export interface OutboxLike {
  payload: unknown;
}

/**
 * Qty per produk yang MASIH di antrian outbox (belum tersinkron ke server).
 * Dipakai untuk mengurangi sisa stok yang ditampilkan saat offline.
 */
export function reservationsFromOutbox(items: OutboxLike[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of items) {
    const its = (o.payload as { items?: { productId: string; qty: number }[] } | null)?.items ?? [];
    for (const it of its) m.set(it.productId, (m.get(it.productId) ?? 0) + it.qty);
  }
  return m;
}

/**
 * Katalog efektif untuk pencarian POS:
 * - Sumber = cache IndexedDB bila SUDAH terisi (di-refresh saat sinkron & satu-
 *   satunya sumber saat offline); jatuh ke props SSR sebelum pull pertama.
 * - Stok dikurangi reservasi outbox → sisa stok offline realistis, barang yang
 *   sama tak terjual-lebih berulang. Server tetap penentu final (needs_review).
 */
export function effectiveCatalog(
  ssr: CatalogProduct[],
  cached: CachedProduct[],
  outbox: OutboxLike[],
): CatalogProduct[] {
  const base: CatalogProduct[] =
    cached.length > 0
      ? cached.map((c) => ({
          id: c.id,
          name: c.name,
          sku: c.sku,
          barcode: c.barcode,
          sellPrice: c.sellPrice,
          stock: c.stock,
          minStock: c.minStock,
          unit: { symbol: c.unit },
        }))
      : ssr;
  const reserved = reservationsFromOutbox(outbox);
  if (reserved.size === 0) return base;
  return base.map((p) =>
    reserved.has(p.id) ? { ...p, stock: Math.max(0, p.stock - (reserved.get(p.id) ?? 0)) } : p,
  );
}
