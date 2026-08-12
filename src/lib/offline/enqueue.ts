"use client";

import { enqueueOutbox, type OutboxType } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/hooks/use-offline-sync";

/** UUID untuk clientOpId (idempotensi sinkron). */
export function newOpId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Antre satu operasi offline (penjualan/pembelian/servis) ke IndexedDB lalu
 * beri tahu mesin sinkron. Kembalikan clientOpId yang dibuat.
 */
export async function queueOfflineOp(
  type: OutboxType,
  payload: Record<string, unknown>,
  summary: { itemCount: number; total: number; label: string },
): Promise<string> {
  const clientOpId = newOpId();
  await enqueueOutbox({
    clientOpId,
    type,
    payload,
    clientCreatedAt: new Date().toISOString(),
    summary,
    status: "pending",
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  });
  notifyOutboxChanged();
  return clientOpId;
}
