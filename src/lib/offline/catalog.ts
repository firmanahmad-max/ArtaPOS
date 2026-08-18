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
 * - **Online** → pakai props SSR (di-render server saat navigasi, jadi selalu
 *   memuat produk terbaru yang baru ditambahkan). Cache TIDAK dipakai saat
 *   online agar item baru langsung tampil.
 * - **Offline** → pakai cache IndexedDB (di-refresh sinkron; satu-satunya sumber
 *   saat offline); jatuh ke props SSR bila cache belum terisi.
 * - Stok dikurangi reservasi outbox → sisa stok realistis saat ada penjualan
 *   offline yang belum tersinkron. Server tetap penentu final (needs_review).
 */
export function effectiveCatalog(
  ssr: CatalogProduct[],
  cached: CachedProduct[],
  outbox: OutboxLike[],
  online: boolean,
): CatalogProduct[] {
  const base: CatalogProduct[] =
    online || cached.length === 0
      ? ssr
      : cached.map((c) => ({
          id: c.id,
          name: c.name,
          sku: c.sku,
          barcode: c.barcode,
          sellPrice: c.sellPrice,
          stock: c.stock,
          minStock: c.minStock,
          unit: { symbol: c.unit },
        }));
  const reserved = reservationsFromOutbox(outbox);
  if (reserved.size === 0) return base;
  return base.map((p) =>
    reserved.has(p.id) ? { ...p, stock: Math.max(0, p.stock - (reserved.get(p.id) ?? 0)) } : p,
  );
}
