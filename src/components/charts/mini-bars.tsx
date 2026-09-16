import { cn } from "@/lib/utils";

/**
 * Sparkline batang mungil (mis. tren 7 hari di kartu KPI). Batang TERAKHIR
 * (hari ini) ditonjolkan paling pekat; lainnya redup. Tanpa sumbu/label.
 */
export function MiniBars({
  data,
  className,
  barClassName = "bg-primary",
  mutedClassName = "bg-primary/25",
}: {
  data: number[];
  className?: string;
  barClassName?: string;
  mutedClassName?: string;
}) {
  const max = Math.max(1, ...data);
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)}>
      {data.map((v, i) => {
        const last = i === data.length - 1;
        const pct = Math.max((v / max) * 100, v > 0 ? 10 : 4);
        return (
          <div
            key={i}
            className={cn("min-w-0 flex-1 rounded-[2px] transition-all", last ? barClassName : mutedClassName)}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}
