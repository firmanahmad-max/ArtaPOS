"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { PricingTier } from "@/lib/pricing";

/**
 * Kartu harga dengan toggle Bulanan/Tahunan (klien). Data tier & sisa kuota
 * dari server. Saat "Tahunan": harga tampil sebagai setara per bulan +
 * keterangan tagihan tahunan + chip hemat.
 */
export function PricingCards({
  tiers,
  remaining,
}: {
  tiers: PricingTier[];
  remaining: Record<string, number | null>;
}) {
  const [annual, setAnnual] = useState(false);

  return (
    <section>
      {/* Toggle penagihan */}
      <div className="mb-7 flex justify-center">
        <div className="inline-flex rounded-full border bg-card p-1 text-sm elevate">
          <button
            type="button"
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              !annual ? "gradient-brand text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Bulanan
          </button>
          <button
            type="button"
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              annual ? "gradient-brand text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tahunan
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((t) => {
          const left = t.quota != null ? remaining[t.id] ?? t.quota : null;
          const full = left != null && left <= 0;
          const perMonth = annual ? Math.round(t.annual / 12) : t.monthly;
          const saving = Math.round((1 - t.annual / (t.monthly * 12)) * 100);
          return (
            <div
              key={t.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6",
                t.highlight ? "border-primary/40 ring-2 ring-primary/30 elevate-lg" : "elevate",
              )}
            >
              {t.badge && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
                  <Sparkles className="size-3.5" /> {t.badge}
                </span>
              )}
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold">{t.name}</h2>
                {t.quota != null && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                      full ? "bg-muted text-muted-foreground" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {full ? "Kuota penuh" : `Tersisa ${left}/${t.quota}`}
                  </span>
                )}
              </div>
              <p className="min-h-[40px] text-sm text-muted-foreground">{t.tagline}</p>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <span className="font-mono text-4xl font-bold tabular-nums text-foreground">{formatRupiah(perMonth)}</span>
                <span className="text-sm text-muted-foreground">/bulan</span>
                {annual && saving > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    hemat {saving}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {annual ? (
                  <>ditagih <span className="font-medium text-foreground">{formatRupiah(t.annual)}</span>/tahun</>
                ) : (
                  <>atau <span className="font-medium text-foreground">{formatRupiah(t.annual)}</span>/tahun</>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.billNote}</p>

              <Link
                href="/login"
                className={cn(buttonVariants({ variant: t.highlight ? "default" : "outline" }), "mt-5 w-full")}
              >
                {full ? "Gabung daftar tunggu" : "Pilih paket ini"}
              </Link>
              {t.id === "pendiri" && (
                <p className="mt-2 text-center text-xs text-muted-foreground">Harga dikunci — tidak naik selama aktif</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
