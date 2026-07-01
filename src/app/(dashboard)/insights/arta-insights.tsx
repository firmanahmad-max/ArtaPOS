"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import type { Insight, InsightDomain, InsightTone } from "@/server/insights/service";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_STYLE: Record<InsightTone, { wrap: string; icon: string; Icon: typeof Info }> = {
  critical: { wrap: "border-rose-500/30 bg-rose-500/5", icon: "bg-rose-500/12 text-rose-600 dark:text-rose-400", Icon: AlertTriangle },
  warning: { wrap: "border-amber-500/30 bg-amber-500/5", icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400", Icon: AlertCircle },
  info: { wrap: "border-border bg-card", icon: "bg-primary/10 text-primary", Icon: Info },
  positive: { wrap: "border-emerald-500/30 bg-emerald-500/5", icon: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", Icon: CheckCircle2 },
};

const DOMAIN_LABEL: Record<InsightDomain, string> = {
  penjualan: "Penjualan",
  servis: "Servis",
  inventaris: "Inventaris",
  pembelian: "Pembelian",
  keuangan: "Keuangan",
  anomali: "Anomali",
};

const FILTERS: { key: InsightDomain | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "penjualan", label: "Penjualan" },
  { key: "servis", label: "Servis" },
  { key: "inventaris", label: "Inventaris" },
  { key: "pembelian", label: "Pembelian" },
  { key: "keuangan", label: "Keuangan" },
  { key: "anomali", label: "Anomali" },
];

export function ArtaInsights({ insights }: { insights: Insight[] }) {
  const [filter, setFilter] = useState<InsightDomain | "all">("all");

  const available = useMemo(() => new Set(insights.map((i) => i.domain)), [insights]);
  const chips = FILTERS.filter((f) => f.key === "all" || available.has(f.key));
  const shown = filter === "all" ? insights : insights.filter((i) => i.domain === filter);

  if (insights.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-7" />
        </div>
        <p className="font-semibold">Semua terpantau baik 👌</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Arta belum menemukan hal yang perlu perhatian. Insight baru akan muncul seiring bertambahnya
          transaksi.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chip pertanyaan/topik */}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => {
          const active = filter === c.key;
          const count = c.key === "all" ? insights.length : insights.filter((i) => i.domain === c.key).length;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "gradient-brand border-transparent text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {c.key === "all" && <Sparkles className="size-3.5" />}
              {c.label}
              <span className={cn("tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Daftar insight */}
      <div className="space-y-3">
        {shown.map((it) => {
          const s = TONE_STYLE[it.tone];
          const Icon = s.Icon;
          return (
            <Card key={it.id} className={cn("border", s.wrap)}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", s.icon)}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-semibold">{it.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {DOMAIN_LABEL[it.domain]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{it.detail}</p>
                  {it.href && (
                    <Link
                      href={it.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {it.actionLabel ?? "Buka"} <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
