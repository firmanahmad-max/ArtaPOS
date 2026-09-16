"use client";

import * as React from "react";
import { useState } from "react";
import { TrendingUp, Wrench, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatRupiah } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  total: number;
}

const PERIODS = [
  { n: 14, label: "14 hari" },
  { n: 30, label: "30 hari" },
  { n: 90, label: "3 bulan" },
] as const;

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function TrendCard({
  title,
  icon: Icon,
  tone,
  points,
  prevPoints,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "violet" | "amber";
  points: TrendPoint[];
  /** Periode setara sebelumnya (untuk delta). Kosong bila data tak cukup. */
  prevPoints: TrendPoint[];
}) {
  const totals = points.map((p) => p.total);
  const total = sum(totals);
  const avg = points.length ? Math.round(total / points.length) : 0;
  const peak = Math.max(0, ...totals);
  const prevTotal = sum(prevPoints.map((p) => p.total));
  const hasDelta = prevPoints.length === points.length && prevTotal > 0;
  const deltaPct = hasDelta ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const up = deltaPct >= 0;

  const toneMap = {
    violet: {
      tile: "bg-primary/10 text-primary",
      bar: "bg-primary hover:bg-primary",
      muted: "bg-primary/40 hover:bg-primary/65",
    },
    amber: {
      tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500 hover:bg-amber-500",
      muted: "bg-amber-500/40 hover:bg-amber-500/65",
    },
  }[tone];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", toneMap.tile)}>
            <Icon className="size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="font-mono text-base font-bold tabular-nums">{formatRupiah(total)}</p>
          </div>
          {hasDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                up
                  ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(deltaPct)}%
            </span>
          )}
        </div>

        {total === 0 ? (
          <p className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground">
            Belum ada data pada periode ini.
          </p>
        ) : (
          <BarChart
            data={points.map((p) => ({ label: p.label, value: p.total }))}
            formatValue={formatRupiah}
            barClassName={toneMap.bar}
            barMutedClassName={toneMap.muted}
          />
        )}

        <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
          {[
            { k: "Total", v: formatRupiah(total) },
            { k: "Rerata/hari", v: formatRupiah(avg) },
            { k: "Tertinggi", v: formatRupiah(peak) },
          ].map((mtr) => (
            <div key={mtr.k} className="min-w-0">
              <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {mtr.k}
              </p>
              <p className="truncate whitespace-nowrap font-mono text-xs font-semibold tabular-nums">{mtr.v}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Kolom kiri Dashboard: header tren bersama + toggle periode (14/30/90 hari),
 * lalu dua kartu tren bertumpuk — Penjualan (violet) & Jasa Servis (amber).
 * Menerima data 90 hari; irisan periode & delta dihitung di klien (tanpa
 * fetch ulang). Sesuai handoff redesign ref 1a.
 */
export function DashboardTrends({ sales, service }: { sales: TrendPoint[]; service: TrendPoint[] }) {
  const [n, setN] = useState<number>(14);
  const win = (arr: TrendPoint[]) => arr.slice(-n);
  const prev = (arr: TrendPoint[]) => arr.slice(-2 * n, -n);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <TrendingUp className="size-5 text-primary" /> Tren {n === 90 ? "3 Bulan" : `${n} Hari`}
        </h2>
        <div className="inline-flex rounded-lg border bg-card p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.n}
              type="button"
              onClick={() => setN(p.n)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                n === p.n
                  ? "gradient-brand text-primary-foreground shadow-brand"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <TrendCard title="Penjualan" icon={TrendingUp} tone="violet" points={win(sales)} prevPoints={prev(sales)} />
      <TrendCard title="Jasa Servis" icon={Wrench} tone="amber" points={win(service)} prevPoints={prev(service)} />
    </div>
  );
}
