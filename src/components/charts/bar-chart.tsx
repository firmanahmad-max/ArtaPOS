import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
}

/**
 * Bar chart ringan berbasis CSS (tanpa dependency) — cocok untuk tren harian.
 */
export function BarChart({
  data,
  formatValue,
  className,
  emphasizeLast = true,
}: {
  data: BarDatum[];
  formatValue?: (v: number) => string;
  className?: string;
  /** Sorot batang terakhir (hari ini) paling pekat; lainnya lebih redup. */
  emphasizeLast?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const crowded = data.length > 8; // label selang-seling di layar sempit agar terbaca
  return (
    <div className={cn("flex h-40 items-stretch gap-1", className)}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        const today = emphasizeLast && i === data.length - 1;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className={cn(
                  "w-full rounded-t transition-all",
                  today ? "bg-primary hover:bg-primary" : "bg-primary/45 hover:bg-primary/70",
                )}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-center text-[10px] text-muted-foreground",
                crowded && i % 2 === 1 && "max-sm:invisible",
              )}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
