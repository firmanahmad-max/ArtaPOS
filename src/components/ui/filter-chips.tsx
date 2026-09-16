"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface FilterChip {
  value: string;
  label: string;
  count?: number;
  /** Nada saat aktif tak dipakai; tone dipakai untuk badge hitung saat non-aktif. */
  tone?: "default" | "danger" | "warning" | "success";
}

/**
 * Baris chip filter cepat untuk layar daftar (Inventory, Servis, Simulasi, Rakit
 * PC, Piutang). State disimpan di query param (`?filter=`) — reset `page` saat
 * ganti, seperti pola SearchBox. Chip aktif memakai gradient-brand.
 */
export function FilterChips({
  chips,
  param = "filter",
  defaultValue = "",
  className,
}: {
  chips: FilterChip[];
  param?: string;
  defaultValue?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = sp.get(param) ?? defaultValue;

  const select = (value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value === defaultValue) p.delete(param);
    else p.set(param, value);
    p.delete("page"); // kembali ke halaman 1 saat filter berubah
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const countTone: Record<NonNullable<FilterChip["tone"]>, string> = {
    default: "bg-muted text-muted-foreground",
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((c) => {
        const isActive = active === c.value;
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(c.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "gradient-brand border-transparent text-primary-foreground shadow-brand"
                : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            {c.label}
            {c.count != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-white/25 text-white" : countTone[c.tone ?? "default"],
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
