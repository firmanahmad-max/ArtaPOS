import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** Nada warna kartu statistik — ikon kotak pastel + caption senada. */
export type StatTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

const TONES: Record<StatTone, { iconBg: string; iconText: string; hint: string; bar: string }> = {
  blue: { iconBg: "bg-primary/10", iconText: "text-primary", hint: "text-primary", bar: "bg-primary" },
  emerald: {
    iconBg: "bg-emerald-500/12",
    iconText: "text-emerald-600 dark:text-emerald-400",
    hint: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-600 dark:text-amber-400",
    hint: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  rose: {
    iconBg: "bg-rose-500/12",
    iconText: "text-rose-600 dark:text-rose-400",
    hint: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
  violet: {
    iconBg: "bg-violet-500/12",
    iconText: "text-violet-600 dark:text-violet-400",
    hint: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
  slate: {
    iconBg: "bg-slate-500/12",
    iconText: "text-slate-600 dark:text-slate-300",
    hint: "text-muted-foreground",
    bar: "bg-slate-500",
  },
};

/**
 * Kartu statistik bergaya "soft dashboard": ikon dalam kotak pastel, angka besar
 * (mono/tabular), caption berwarna, dan lingkaran dekoratif samar. Slot opsional
 * (redesign): `delta` (chip naik/turun), `progress` (bar 0–100), `chart`
 * (mini-viz, mis. `<MiniBars/>`). Jika `href` diisi, kartu jadi tautan.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
  href,
  className,
  delta,
  progress,
  chart,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  href?: string;
  className?: string;
  /** Chip perubahan (mis. "+12%"). `positive` menentukan warna & arah panah. */
  delta?: { value: string; positive?: boolean };
  /** Progres 0–100 → bar tipis di bawah angka. */
  progress?: number;
  /** Mini-viz (mis. sparkline 7 hari). Dirender di bawah angka. */
  chart?: React.ReactNode;
  /** Sorot batas kartu dengan warna tone (mis. rose untuk stok habis). */
  accent?: boolean;
}) {
  const t = TONES[tone];
  const accentBorder: Record<StatTone, string> = {
    blue: "border-primary/30",
    emerald: "border-emerald-500/30",
    amber: "border-amber-500/30",
    rose: "border-rose-500/40",
    violet: "border-violet-500/30",
    slate: "border-slate-500/30",
  };
  const inner = (
    <Card
      className={cn(
        "relative h-full overflow-hidden",
        href && "card-hover",
        accent && accentBorder[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-50",
          t.iconBg,
        )}
      />
      <CardContent className="relative flex items-start gap-3 p-5">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            t.iconBg,
            t.iconText,
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-2xl font-bold tabular-nums text-foreground">{value}</p>
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  delta.positive
                    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
                )}
              >
                {delta.positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {delta.value}
              </span>
            )}
          </div>
          {chart && <div className="mt-2">{chart}</div>}
          {progress != null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", t.bar)}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
          )}
          {hint != null && <p className={cn("mt-0.5 text-xs font-medium", t.hint)}>{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
