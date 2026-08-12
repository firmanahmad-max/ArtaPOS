"use client";

/**
 * Sinkronisasi offline sisi klien: tarik katalog (pull) & kirim antrian
 * penjualan offline (push) ke endpoint server yang idempoten.
 */
import {
  STORE_PRODUCTS,
  STORE_CUSTOMERS,
  replaceAll,
  listOutbox,
  removeOutbox,
  updateOutbox,
  getMeta,
  setMeta,
  type CachedProduct,
  type CachedCustomer,
  type OutboxSale,
} from "@/lib/offline/db";

const CHECKPOINT_KEY = "pull_checkpoint";

/** Tarik katalog terbaru ke cache lokal. Pakai delta bila ada checkpoint. */
export async function pullCatalog(): Promise<{ products: number; customers: number } | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  const since = await getMeta(CHECKPOINT_KEY);
  const url = since ? `/api/sync/pull?since=${encodeURIComponent(since)}` : "/api/sync/pull";
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    checkpoint: string;
    products: CachedProduct[];
    customers: CachedCustomer[];
  };
  // Fase ini: tanpa `since` → ganti penuh. (Delta upsert bisa ditambah nanti.)
  if (!since) {
    await replaceAll(STORE_PRODUCTS, data.products);
    await replaceAll(STORE_CUSTOMERS, data.customers);
    await setMeta(CHECKPOINT_KEY, data.checkpoint);
  }
  return { products: data.products.length, customers: data.customers.length };
}

interface PushResult {
  clientOpId?: string;
  ok: boolean;
  status: "synced" | "duplicate" | "needs_review" | "error";
  id?: string;
  number?: string;
  message?: string;
}

/**
 * Kirim seluruh antrian outbox yang masih `pending`/`error` (retry) ke server.
 * - synced/duplicate → hapus dari outbox (selesai).
 * - needs_review → simpan status agar ditinjau kasir (mis. stok habis).
 * - error → tandai untuk retry berikutnya.
 * Kembalikan ringkasan hasil.
 */
export async function pushOutbox(): Promise<{
  sent: number;
  synced: number;
  needsReview: number;
  errored: number;
} | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  const all = await listOutbox();
  // needs_review menunggu tindakan kasir; jangan kirim ulang otomatis.
  const queue = all.filter((o) => o.status === "pending" || o.status === "error");
  if (queue.length === 0) return { sent: 0, synced: 0, needsReview: 0, errored: 0 };

  const ops = queue.map((o) => ({
    type: o.type ?? "sale",
    data: {
      ...(o.payload as Record<string, unknown>),
      clientOpId: o.clientOpId,
      clientCreatedAt: o.clientCreatedAt,
    },
  }));

  let res: Response;
  try {
    res = await fetch("/api/sync/push", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ops }),
    });
  } catch {
    return null; // jaringan putus lagi — biarkan antrian, coba lagi nanti
  }
  if (!res.ok) return null;

  const { results } = (await res.json()) as { results: PushResult[] };
  const byId = new Map(results.map((r) => [r.clientOpId, r]));

  let synced = 0;
  let needsReview = 0;
  let errored = 0;
  for (const o of queue) {
    const r = byId.get(o.clientOpId);
    if (!r) continue;
    if (r.ok) {
      await removeOutbox(o.clientOpId);
      synced++;
    } else if (r.status === "needs_review") {
      await updateOutbox({ ...o, status: "needs_review", lastError: r.message, attempts: o.attempts + 1 });
      needsReview++;
    } else {
      await updateOutbox({ ...o, status: "error", lastError: r.message, attempts: o.attempts + 1 });
      errored++;
    }
  }
  return { sent: queue.length, synced, needsReview, errored };
}

/** Hitung jumlah antrian per status (untuk indikator UI). */
export function summarizeOutbox(items: OutboxSale[]) {
  return {
    pending: items.filter((o) => o.status === "pending" || o.status === "error").length,
    needsReview: items.filter((o) => o.status === "needs_review").length,
    total: items.length,
  };
}
