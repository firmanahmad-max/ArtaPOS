import { BarChart3, CalendarCheck, Copy, Download, Share2, Store } from "lucide-react";
import type { DailyStatsSummary, StatKind } from "@/lib/daily-content-stats";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<StatKind, string> = { PROMO: "Promo", MOTIVASI: "Motivasi", TIPS: "Tips IT", FAKTA: "Fakta IT" };
const KIND_BAR: Record<StatKind, string> = {
  PROMO: "bg-amber-500",
  MOTIVASI: "bg-rose-500",
  TIPS: "bg-primary",
  FAKTA: "bg-violet-400",
};
const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

/** Statistik pemakaian Konten Harian (30 hari): apa yang paling sering dibagikan. */
export function StatsPanel({ stats }: { stats: DailyStatsSummary }) {
  const kpis = [
    { icon: Share2, label: "Dibagikan", value: stats.totals.SHARE, hint: "lewat menu bagikan" },
    { icon: Download, label: "Diunduh", value: stats.totals.DOWNLOAD, hint: "gambar story" },
    { icon: Copy, label: "Teks disalin", value: stats.totals.COPY, hint: "untuk caption / chat" },
    { icon: CalendarCheck, label: "Hari aktif berbagi", value: stats.activeDays, hint: `dari ${stats.days} hari` },
  ];
  const kinds = (Object.keys(stats.byKind) as StatKind[]).filter((k) => stats.byKind[k] > 0 || k !== "PROMO");
  const maxKind = Math.max(1, ...kinds.map((k) => stats.byKind[k]));
  const customPct = stats.uses > 0 ? Math.round((stats.custom / stats.uses) * 100) : 0;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
        <BarChart3 className="size-5 text-primary" /> Statistik {stats.days} hari terakhir
      </h2>
      {stats.uses === 0 ? (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground elevate">
          Belum ada konten yang dibagikan, diunduh, atau disalin. Bagikan konten dari kartu Konten Harian di Dashboard —
          angkanya muncul di sini.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border bg-card p-4 elevate">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <k.icon className="size-3.5" /> {k.label}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{k.value.toLocaleString("id-ID")}</p>
                <p className="text-[11.5px] text-muted-foreground">{k.hint}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="space-y-4 rounded-2xl border bg-card p-4 elevate">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Per jenis konten</p>
                <ul className="space-y-2 text-sm">
                  {kinds.map((k) => (
                    <li key={k} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2">
                      <span>{KIND_LABEL[k]}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted">
                        <span className={cn("block h-full rounded-full", KIND_BAR[k])} style={{ width: `${(stats.byKind[k] / maxKind) * 100}%` }} />
                      </span>
                      <span className="text-right font-mono tabular-nums">{stats.byKind[k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Konten toko vs bawaan ArtaPOS</p>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="bg-primary" style={{ width: `${customPct}%` }} />
                  <div className="bg-primary/30" style={{ width: `${100 - customPct}%` }} />
                </div>
                <p className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground">
                  <span>
                    Toko <b className="font-mono text-foreground">{stats.custom}</b> ({customPct}%)
                  </span>
                  <span>
                    Bawaan <b className="font-mono text-foreground">{stats.builtin}</b>
                  </span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border bg-card elevate">
              <p className="border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">Paling sering dipakai</p>
              <ol className="divide-y">
                {stats.top.map((t, i) => (
                  <li key={t.contentKey} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {KIND_LABEL[t.kind]}
                        {t.isCustom && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 text-primary">
                            <Store className="size-3" /> toko
                          </span>
                        )}
                        · terakhir {shortDate(t.lastDay)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-bold tabular-nums">{t.uses}×</span>
                      <span className="text-[10.5px] text-muted-foreground">{t.shares} dibagikan</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
