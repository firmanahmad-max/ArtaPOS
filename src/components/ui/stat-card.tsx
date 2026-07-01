import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** Nada warna kartu statistik — ikon kotak pastel + caption senada. */
export type StatTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

const TONES: Record<StatTone, { iconBg: string; iconText: string; hint: string }> = {
  blue: { iconBg: "bg-primary/10", iconText: "text-primary", hint: "text-primary" },
  emerald: {
    iconBg: "bg-emerald-500/12",
    iconText: "text-emerald-600 dark:text-emerald-400",
    hint: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-600 dark:text-amber-400",
    hint: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    iconBg: "bg-rose-500/12",
    iconText: "text-rose-600 dark:text-rose-400",
    hint: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    iconBg: "bg-violet-500/12",
    iconText: "text-violet-600 dark:text-violet-400",
    hint: "text-violet-600 dark:text-violet-400",
  },
  slate: {
    iconBg: "bg-slate-500/12",
    iconText: "text-slate-600 dark:text-slate-300",
    hint: "text-muted-foreground",
  },
};

/**
 * Kartu statistik bergaya "soft dashboard": ikon dalam kotak pastel, angka besar,
 * caption berwarna, dan lingkaran dekoratif samar di pojok. Jika `href` diisi,
 * kartu menjadi tautan dengan efek angkat saat hover.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
  href,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  href?: string;
  className?: string;
}) {
  const t = TONES[tone];
  const inner = (
    <Card className={cn("relative h-full overflow-hidden", href && "card-hover", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-50",
          t.iconBg,
        )}
      />
      <CardContent className="relative flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl",
            t.iconBg,
            t.iconText,
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold tabular-nums text-foreground">{value}</p>
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
