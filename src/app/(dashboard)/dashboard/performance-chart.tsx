"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { rupiahShort } from "@/lib/dashboard-calc";

export interface PerfRow {
  key: string; // YYYY-MM-DD (WIB)
  s: number; // penjualan
  v: number; // servis
  r: number; // rakit PC
}

const PERIODS = [7, 14, 30] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const label = (key: string) => {
  const [, m, d] = key.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

/** Grafik batang bertumpuk pendapatan harian per kanal + ringkasan periode. */
export function PerformanceChart({ rows }: { rows: PerfRow[] }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(14);
  const data = rows.slice(-period);
  const totals = data.map((d) => d.s + d.v + d.r);
  const total = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...totals);
  const bestIdx = totals.indexOf(Math.max(...totals));
  const sum = (f: "s" | "v" | "r") => data.reduce((a, d) => a + d[f], 0);
  const legend = [
    { k: "s" as const, name: "Penjualan", cls: "bg-primary" },
    { k: "v" as const, name: "Servis", cls: "bg-amber-500" },
    { k: "r" as const, name: "Rakit PC", cls: "bg-teal-500" },
  ];

  return (
    <div className="rounded-2xl border bg-card p-5 elevate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight">Performa pendapatan</h2>
          <p className="text-xs text-muted-foreground">Penjualan, jasa servis &amp; rakit PC per hari</p>
        </div>
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label="Periode grafik">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={p === period}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-semibold transition-colors",
                p === period ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p} hari
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
        <Metric label="Total" value={rupiahShort(total)} />
        <Metric label="Rata-rata / hari" value={rupiahShort(Math.round(total / Math.max(1, data.length)))} />
        <Metric label="Hari terbaik" value={total > 0 ? `${rupiahShort(totals[bestIdx])}` : "—"} hint={total > 0 ? label(data[bestIdx].key) : undefined} />
        <div className="ml-auto flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
          {legend.map((l) => (
            <span key={l.k} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", l.cls)} />
              {l.name} <span className="font-mono tabular-nums text-foreground">{rupiahShort(sum(l.k))}</span>
            </span>
          ))}
        </div>
      </div>

      <div
        className={cn("relative mt-5 flex h-52 items-end border-b", period > 14 ? "gap-[3px]" : "gap-1.5 sm:gap-2")}
        style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "100% 25%" }}
      >
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const h = (n: number) => `${(n / max) * 100}%`;
          return (
            <div
              key={d.key}
              title={`${label(d.key)} — Penjualan ${rupiahShort(d.s)} · Servis ${rupiahShort(d.v)} · Rakit ${rupiahShort(d.r)}`}
              className={cn("group flex h-full min-w-0 flex-1 flex-col-reverse", !isToday && "opacity-80 hover:opacity-100")}
            >
              <div className="bg-primary" style={{ height: h(d.s) }} />
              <div className="bg-amber-500" style={{ height: h(d.v) }} />
              <div className="rounded-t-[3px] bg-teal-500" style={{ height: h(d.r) }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-muted-foreground">
        <span>{data.length > 0 ? label(data[0].key) : ""}</span>
        <span>Hari ini</span>
      </div>
    </div>
  );
}

function Metric({ label: l, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground">{l}</p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums">
        {value}
        {hint && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{hint}</span>}
      </p>
    </div>
  );
}
