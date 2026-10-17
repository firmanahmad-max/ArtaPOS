"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, Clock, Wallet, Wrench } from "lucide-react";
import { ScheduledReportsCard, type DueReportView } from "@/components/finance/scheduled-reports-card";
import { cn } from "@/lib/utils";

export type ActionIcon = "reports" | "ready" | "reminder" | "overdue" | "stock" | "consign";
export interface ActionItem {
  id: ActionIcon;
  count: number;
  title: string;
  detail: string;
  cta: string;
  href?: string;
  tone: "primary" | "ok" | "warn" | "bad" | "neutral";
}

const ICONS = {
  reports: CalendarClock,
  ready: Wrench,
  reminder: BellRing,
  overdue: Clock,
  stock: AlertTriangle,
  consign: Wallet,
} as const;

const TONE = {
  primary: { tile: "bg-accent text-primary", ring: "border-primary/35" },
  ok: { tile: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", ring: "" },
  warn: { tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400", ring: "" },
  bad: { tile: "bg-rose-500/12 text-rose-600 dark:text-rose-400", ring: "" },
  neutral: { tile: "bg-muted text-secondary-foreground", ring: "" },
} as const;

/** "Perlu tindakan": semua pekerjaan yang menunggu, 1 tombol aksi per kartu. Kartu bernilai 0 tak dikirim server. */
export function ActionCenter({
  items,
  reports,
  hasReportPhone,
  canConfigureReports,
}: {
  items: ActionItem[];
  reports: DueReportView[];
  hasReportPhone: boolean;
  canConfigureReports: boolean;
}) {
  const [showReports, setShowReports] = useState(false);
  const total = items.length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-tight">
          Perlu tindakan
          {total > 0 && (
            <span className="ml-2 rounded-full bg-rose-500/12 px-2 py-0.5 font-mono text-xs text-rose-600 dark:text-rose-400">{total}</span>
          )}
        </h2>
        {total > 0 && <span className="hidden text-xs text-muted-foreground sm:inline">Kartu hilang otomatis setelah ditangani</span>}
      </div>

      {total === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-sm elevate">
          <CheckCircle2 className="size-5 text-success" />
          <span>Semua beres — tidak ada pekerjaan yang menunggu.</span>
        </div>
      ) : (
        <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:overflow-visible sm:px-0 sm:pb-0">
          {items.map((it) => {
            const Icon = ICONS[it.id];
            const tone = TONE[it.tone];
            const body = (
              <>
                <div className="flex items-center">
                  <span className={cn("flex size-9 items-center justify-center rounded-xl", tone.tile)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="ml-auto font-mono text-[22px] font-bold tabular-nums">{it.count.toLocaleString("id-ID")}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold">{it.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{it.detail}</p>
                </div>
              </>
            );
            const ctaCls = cn(
              "mt-auto inline-flex h-9 items-center justify-center rounded-lg border px-3 text-[12.5px] font-semibold transition-colors",
              it.id === "reports" ? "border-transparent bg-[#1fa855] text-white hover:brightness-95" : "bg-card hover:bg-accent",
            );
            return (
              <div
                key={it.id}
                className={cn("flex w-[172px] shrink-0 snap-start flex-col gap-2.5 rounded-2xl border bg-card p-3.5 elevate sm:w-auto", tone.ring)}
              >
                {body}
                {it.id === "reports" ? (
                  <button type="button" className={ctaCls} onClick={() => setShowReports((v) => !v)} aria-expanded={showReports}>
                    {showReports ? "Tutup daftar" : it.cta}
                  </button>
                ) : (
                  <Link href={it.href ?? "#"} className={ctaCls}>
                    {it.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showReports && reports.length > 0 && (
        <ScheduledReportsCard reports={reports} hasPhone={hasReportPhone} canConfigure={canConfigureReports} />
      )}
    </section>
  );
}
