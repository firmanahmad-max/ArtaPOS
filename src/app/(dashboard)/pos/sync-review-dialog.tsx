"use client";

import { useEffect } from "react";
import { RefreshCw, Trash2, AlertTriangle, Clock, CloudOff } from "lucide-react";
import type { OutboxSale } from "@/lib/offline/db";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-dialog";

const STATUS: Record<OutboxSale["status"], { label: string; variant: "muted" | "warning" | "destructive" }> = {
  pending: { label: "Menunggu sinkron", variant: "muted" },
  needs_review: { label: "Perlu ditinjau", variant: "warning" },
  error: { label: "Gagal", variant: "destructive" },
};

/**
 * Daftar antrian penjualan offline yang bisa ditindak. `needs_review` muncul
 * saat server menolak (mis. stok habis di perangkat lain): kasir bisa Coba Lagi
 * (mis. setelah restock) atau Hapus (batalkan penjualan offline itu).
 */
export function SyncReviewDialog({
  open,
  onOpenChange,
  items,
  online,
  syncing,
  onRetry,
  onDiscard,
  onSyncAll,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: OutboxSale[];
  online: boolean;
  syncing: boolean;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onSyncAll: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const sorted = [...items].sort((a, b) => {
    const rank = (s: OutboxSale["status"]) => (s === "needs_review" ? 0 : s === "error" ? 1 : 2);
    return rank(a.status) - rank(b.status);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border bg-card elevate-lg"
      >
        <div className="flex items-center justify-between gap-2 border-b p-4">
          <div>
            <h2 className="font-semibold">Antrian Penjualan Offline</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} transaksi menunggu / perlu ditinjau
              {!online && " · sedang offline"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Tutup">
            <span aria-hidden>×</span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada antrian. Semua tersinkron. 🎉</p>
          ) : (
            sorted.map((o) => {
              const s = STATUS[o.status];
              const when = new Date(o.clientCreatedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
              const canAct = o.status === "needs_review" || o.status === "error";
              return (
                <div key={o.clientOpId} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatRupiah(o.summary.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.summary.itemCount} item · {when}
                      </p>
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  {o.lastError && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {o.lastError}
                    </p>
                  )}
                  {canAct ? (
                    <div className="mt-2 flex justify-end gap-2">
                      <ConfirmButton
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onConfirm={() => onDiscard(o.clientOpId)}
                        title="Hapus penjualan offline ini?"
                        description="Transaksi ini akan dibuang dari antrian dan TIDAK tercatat. Tindakan tidak bisa dibatalkan."
                        confirmText="Hapus"
                        destructive
                      >
                        <Trash2 className="size-3.5" /> Hapus
                      </ConfirmButton>
                      <Button size="sm" onClick={() => onRetry(o.clientOpId)} disabled={!online || syncing}>
                        <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} /> Coba Lagi
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> Akan disinkronkan otomatis saat online.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t p-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {online ? null : <CloudOff className="size-3.5" />}
            {online ? "Tersambung" : "Mode offline"}
          </span>
          <Button variant="outline" size="sm" onClick={onSyncAll} disabled={!online || syncing}>
            <RefreshCw className={syncing ? "size-3.5 animate-spin" : "size-3.5"} /> Sinkronkan Semua
          </Button>
        </div>
      </div>
    </div>
  );
}
