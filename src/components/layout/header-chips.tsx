"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudOff, RefreshCw, Check, Clock } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { listOutbox } from "@/lib/offline/db";
import { summarizeOutbox } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

/**
 * Chip status sinkron di header. Ringan & read-only: membaca ringkasan outbox
 * (IndexedDB) saat mount + saat outbox berubah / status jaringan berubah — TIDAK
 * menjalankan mesin sinkron (itu tugas useOfflineSync di POS), agar tak dobel.
 */
export function SyncStatusChip() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const s = summarizeOutbox(await listOutbox());
      if (alive) {
        setPending(s.pending);
        setNeedsReview(s.needsReview);
      }
    };
    void refresh();
    const on = () => void refresh();
    window.addEventListener("artapos:outbox-changed", on);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      alive = false;
      window.removeEventListener("artapos:outbox-changed", on);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  let tone: string, Icon: typeof Check, text: string;
  if (!online) {
    tone = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    Icon = CloudOff;
    text = pending > 0 ? `Offline · ${pending} antre` : "Offline";
  } else if (needsReview > 0) {
    tone = "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    Icon = RefreshCw;
    text = `${needsReview} perlu tinjau`;
  } else if (pending > 0) {
    tone = "border-primary/30 bg-primary/10 text-primary";
    Icon = RefreshCw;
    text = `${pending} antre`;
  } else {
    tone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    Icon = Check;
    text = "Tersinkron";
  }

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
        tone,
      )}
      title={online ? "Status sinkronisasi" : "Sedang offline"}
    >
      <Icon className="size-3.5" />
      {text}
    </span>
  );
}

/** Chip shift kasir berjalan di header. Tautan ke halaman Shift. */
export function ShiftChip({ openedAt }: { openedAt: string | null }) {
  const open = Boolean(openedAt);
  const time = openedAt
    ? new Date(openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <Link
      href="/shift"
      title={open ? "Shift kasir sedang berjalan" : "Belum ada shift berjalan"}
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors sm:inline-flex",
        open
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "border-border bg-secondary text-muted-foreground hover:bg-accent",
      )}
    >
      <Clock className="size-3.5" />
      {open ? `Shift · ${time}` : "Shift tutup"}
    </Link>
  );
}
