"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listOutbox,
  getCachedProducts,
  getCachedCustomers,
  updateOutbox,
  removeOutbox,
  type OutboxSale,
  type CachedProduct,
  type CachedCustomer,
} from "@/lib/offline/db";
import { pullCatalog, pushOutbox, summarizeOutbox } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/hooks/use-online-status";

const OUTBOX_EVENT = "artapos:outbox-changed";

/** Beri tahu hook bahwa outbox berubah (dipanggil setelah enqueue penjualan offline). */
export function notifyOutboxChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export interface OfflineSyncState {
  online: boolean;
  syncing: boolean;
  pending: number;
  needsReview: number;
  items: OutboxSale[];
  /** Katalog dari cache lokal (IndexedDB) — kosong sebelum pull pertama selesai. */
  cachedProducts: CachedProduct[];
  cachedCustomers: CachedCustomer[];
  syncNow: () => void;
  /** Kirim ulang satu antrian yang gagal (needs_review/error). */
  retryItem: (clientOpId: string) => void;
  /** Buang satu antrian (batalkan penjualan offline yang bermasalah). */
  discardItem: (clientOpId: string) => void;
}

/**
 * Mesin sinkron sisi klien:
 * - Menghitung antrian outbox (pending/needs_review) untuk indikator.
 * - Menarik katalog & mengirim antrian saat online (event `online`, saat tab
 *   kembali terlihat, berkala, dan manual).
 */
export function useOfflineSync(pollMs = 30_000): OfflineSyncState {
  const [items, setItems] = useState<OutboxSale[]>([]);
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([]);
  const [cachedCustomers, setCachedCustomers] = useState<CachedCustomer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const online = useOnlineStatus();
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    const [outbox, prods, custs] = await Promise.all([
      listOutbox(),
      getCachedProducts(),
      getCachedCustomers(),
    ]);
    setItems(outbox);
    setCachedProducts(prods);
    setCachedCustomers(custs);
  }, []);

  const runSync = useCallback(async () => {
    if (busy.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    busy.current = true;
    await Promise.resolve(); // yield dulu → setState tak sinkron dengan effect
    setSyncing(true);
    try {
      await pullCatalog().catch(() => null);
      await pushOutbox().catch(() => null);
    } finally {
      busy.current = false;
      setSyncing(false);
      await refresh(); // muat ulang outbox + katalog cache terbaru
    }
  }, [refresh]);

  useEffect(() => {
    // Semua pemicu ASINKRON (timeout/event/interval) — setState tak pernah
    // dipanggil sinkron saat effect commit, jadi tak ada risiko loop render.
    const kick = window.setTimeout(() => {
      void refresh();
      void runSync();
    }, 0);

    const trigger = () => void runSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    const onOutbox = () => {
      void refresh();
      void runSync();
    };

    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(OUTBOX_EVENT, onOutbox);
    const id = window.setInterval(trigger, pollMs);

    return () => {
      window.clearTimeout(kick);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(OUTBOX_EVENT, onOutbox);
      window.clearInterval(id);
    };
  }, [refresh, runSync, pollMs]);

  const retryItem = useCallback(
    (clientOpId: string) => {
      const item = items.find((o) => o.clientOpId === clientOpId);
      if (!item) return;
      // Kembalikan ke antrian → dorongan sinkron berikutnya mencoba lagi.
      void updateOutbox({ ...item, status: "pending", lastError: undefined }).then(() => {
        void refresh();
        void runSync();
      });
    },
    [items, refresh, runSync],
  );

  const discardItem = useCallback(
    (clientOpId: string) => {
      void removeOutbox(clientOpId).then(() => void refresh());
    },
    [refresh],
  );

  const { pending, needsReview } = summarizeOutbox(items);
  return {
    online, syncing, pending, needsReview, items,
    cachedProducts, cachedCustomers,
    syncNow: () => void runSync(),
    retryItem,
    discardItem,
  };
}
