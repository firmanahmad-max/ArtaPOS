"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarClock, Send, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pengingat akhir bulan: mengajak mengirim laporan keuangan bulanan via WhatsApp.
 * Muncul di akhir bulan (tgl ≥ 26, untuk bulan berjalan) atau awal bulan
 * (tgl ≤ 5, untuk bulan lalu). Bisa ditutup — tersimpan per bulan (localStorage).
 */

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function emit() {
  listeners.forEach((l) => l());
}

function reminderInfo(): { key: string; period: "month" | "last-month"; monthLabel: string } | null {
  const now = new Date();
  const day = now.getDate();
  const nearEnd = day >= 26;
  const earlyMonth = day <= 5;
  if (!nearEnd && !earlyMonth) return null;
  // Bulan yang dilaporkan: bulan berjalan (akhir bulan) atau bulan lalu (awal bulan berikutnya).
  const target = new Date(now.getFullYear(), now.getMonth(), 1);
  if (earlyMonth) target.setMonth(target.getMonth() - 1);
  const key = `${target.getFullYear()}-${target.getMonth() + 1}`;
  const monthLabel = target.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return { key, period: earlyMonth ? "last-month" : "month", monthLabel };
}

function getSnapshot(): string {
  const info = reminderInfo();
  if (!info) return "hidden";
  try {
    if (localStorage.getItem(`monthly-report-reminder:${info.key}`)) return "dismissed";
  } catch {
    // localStorage tak tersedia — tetap tampilkan.
  }
  return `show:${info.period}:${info.monthLabel}`;
}
function getServerSnapshot() {
  return "hidden";
}

export function MonthlyReportReminder() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!state.startsWith("show:")) return null;

  const info = reminderInfo();
  if (!info) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(`monthly-report-reminder:${info.key}`, "1");
    } catch {
      // abaikan
    }
    emit();
  };

  return (
    <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-4 pr-10 elevate">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10"
      />
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <CalendarClock className="size-6" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="font-semibold">Waktunya kirim laporan bulanan</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Laporan keuangan <span className="font-medium text-foreground">{info.monthLabel}</span> siap
          dikirim ke pemilik/grup lewat WhatsApp.
        </p>
        <Link
          href={`/finance?period=${info.period}`}
          className={cn(buttonVariants({ size: "sm" }), "mt-2.5")}
        >
          <Send /> Buka &amp; Kirim Laporan
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup pengingat"
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
