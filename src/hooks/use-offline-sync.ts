"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listOutbox, type OutboxSale } from "@/lib/offline/db";
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
  syncNow: () => void;
}

/**
 * Mesin sinkron sisi klien:
 * - Menghitung antrian outbox (pending/needs_review) untuk indikator.
 * - Menarik katalog & mengirim antrian saat online (event `online`, saat tab
 *   kembali terlihat, berkala, dan manual).
 */
export function useOfflineSync(pollMs = 30_000): OfflineSyncState {
  const [items, setItems] = useState<OutboxSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const online = useOnlineStatus();
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    setItems(await listOutbox());
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
      await refresh();
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

  const { pending, needsReview } = summarizeOutbox(items);
  return { online, syncing, pending, needsReview, items, syncNow: () => void runSync() };
}
