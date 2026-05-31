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
}: {
  data: BarDatum[];
  formatValue?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("flex h-40 items-end gap-1", className)}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value}`}>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
