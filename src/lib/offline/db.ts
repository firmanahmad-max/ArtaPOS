"use client";

/**
 * Penyimpanan lokal offline (IndexedDB) untuk POS.
 *
 * Store:
 * - `products` / `customers`: cache katalog (dari /api/sync/pull) → pencarian
 *   produk & pelanggan tetap jalan saat offline.
 * - `outbox`: antrian penjualan yang dibuat offline, menunggu sinkron.
 * - `meta`: checkpoint pull terakhir, dll.
 *
 * Sengaja pakai IndexedDB langsung (bukan RxDB) — ringan, tanpa dependensi.
 * Semua fungsi no-op/aman bila IndexedDB tak tersedia (mis. SSR).
 */

export const DB_NAME = "artapos-offline";
export const DB_VERSION = 1;
export const STORE_PRODUCTS = "products";
export const STORE_CUSTOMERS = "customers";
export const STORE_OUTBOX = "outbox";
export const STORE_META = "meta";

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellPrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string | null;
  updatedAt: string;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone: string | null;
  points: number;
  updatedAt: string;
}

export type OutboxStatus = "pending" | "needs_review" | "error";
export type OutboxType = "sale" | "purchase" | "service";

/** Satu operasi offline (penjualan/pembelian/tiket servis) menunggu sinkron. */
export interface OutboxSale {
  clientOpId: string;
  /** Jenis operasi → menentukan endpoint/servis pemroses saat sinkron. */
  type: OutboxType;
  /** Input operasi (tanpa clientOpId/clientCreatedAt — disuntik saat kirim). */
  payload: unknown;
  /** Waktu transaksi asli di perangkat (ISO). */
  clientCreatedAt: string;
  /** Ringkasan untuk tampilan daftar antrian. */
  summary: { itemCount: number; total: number; label: string };
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  /** Nomor final setelah tersinkron (opsional, untuk info). */
  finalNumber?: string;
  enqueuedAt: string;
}

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) db.createObjectStore(STORE_CUSTOMERS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) db.createObjectStore(STORE_OUTBOX, { keyPath: "clientOpId" });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function getAll<T>(store: string): Promise<T[]> {
  if (!hasIDB()) return Promise.resolve([]);
  return tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>).catch(() => []);
}

/** Ganti isi store dengan daftar baru (untuk pull katalog penuh). */
export async function replaceAll<T>(store: string, rows: T[]): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const os = t.objectStore(store);
    os.clear();
    for (const r of rows) os.put(r);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/** Upsert sebagian (untuk pull delta). */
export async function upsertMany<T>(store: string, rows: T[]): Promise<void> {
  if (!hasIDB() || rows.length === 0) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const os = t.objectStore(store);
    for (const r of rows) os.put(r);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export const getCachedProducts = () => getAll<CachedProduct>(STORE_PRODUCTS);
export const getCachedCustomers = () => getAll<CachedCustomer>(STORE_CUSTOMERS);

// ── Outbox ────────────────────────────────────────────────────────────────
export async function enqueueOutbox(item: OutboxSale): Promise<void> {
  if (!hasIDB()) throw new Error("Penyimpanan offline tidak tersedia di perangkat ini.");
  await tx(STORE_OUTBOX, "readwrite", (s) => s.put(item));
}

export const listOutbox = () => getAll<OutboxSale>(STORE_OUTBOX);

export async function removeOutbox(clientOpId: string): Promise<void> {
  if (!hasIDB()) return;
  await tx(STORE_OUTBOX, "readwrite", (s) => s.delete(clientOpId)).catch(() => {});
}

export async function updateOutbox(item: OutboxSale): Promise<void> {
  if (!hasIDB()) return;
  await tx(STORE_OUTBOX, "readwrite", (s) => s.put(item)).catch(() => {});
}

// ── Meta (checkpoint) ───────────────────────────────────────────────────────
export async function getMeta(key: string): Promise<string | null> {
  if (!hasIDB()) return null;
  const row = await tx<{ key: string; value: string } | undefined>(STORE_META, "readonly", (s) => s.get(key)).catch(
    () => undefined,
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  if (!hasIDB()) return;
  await tx(STORE_META, "readwrite", (s) => s.put({ key, value })).catch(() => {});
}
