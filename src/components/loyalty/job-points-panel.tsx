"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Undo2, Loader2 } from "lucide-react";
import { cancelTicketPointsAction, linkTicketCustomerAction, redeemTicketPointsAction } from "@/server/service-jobs/actions";
import { cancelBuildPointsAction, redeemBuildPointsAction } from "@/server/pcbuild/actions";
import {
  formatStartDate,
  isProgramStarted,
  maxRedeemablePoints,
  pointsWorth,
  type LoyaltyConfig,
} from "@/lib/loyalty";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface JobLoyaltyInfo {
  /** Pelanggan terdaftar yang tertaut (null = tanpa pelanggan → tak dapat poin). */
  customer: { name: string; points: number } | null;
  cfg: LoyaltyConfig;
  /** Poin yang sudah didapat dari tiket/rakitan ini. */
  earned: number;
  pointsRedeemed: number;
  pointsDiscount: number;
}

/**
 * Poin member di kartu Biaya tiket servis / rakit PC: baris potongan poin (+batal),
 * tukar poin (maks. sisa tagihan) & info poin yang didapat. Logika & validasi di server.
 */
export function JobPointsPanel({
  kind,
  id,
  info,
  outstanding,
  linkable = false,
}: {
  kind: "service" | "build";
  id: string;
  info: JobLoyaltyInfo;
  outstanding: number;
  /** Tiket servis tanpa pelanggan tapi ada No. HP → bisa ditautkan / didaftarkan member. */
  linkable?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState(0);
  const { customer, cfg } = info;
  const started = isProgramStarted(cfg);
  const max = customer ? maxRedeemablePoints(customer.points, Math.max(0, outstanding), cfg) : 0;
  const use = Math.min(points, max);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        setOpen(false);
        setPoints(0);
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }
  const redeem = () => run(() => (kind === "service" ? redeemTicketPointsAction(id, use) : redeemBuildPointsAction(id, use)));
  const cancel = () => run(() => (kind === "service" ? cancelTicketPointsAction(id) : cancelBuildPointsAction(id)));
  const rateText = kind === "service" ? `jasa ×${cfg.serviceMultiplier ?? 2}, sparepart ×1` : "×1";

  return (
    <>
      {info.pointsDiscount > 0 && (
        <div className="flex items-center justify-between gap-2 text-amber-700 dark:text-amber-300">
          <span className="flex items-center gap-1.5">
            Tukar poin ({info.pointsRedeemed.toLocaleString("id-ID")})
            <button type="button" onClick={cancel} disabled={pending} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:underline">
              <Undo2 className="size-3" /> batal
            </button>
          </span>
          <span>-{formatRupiah(info.pointsDiscount)}</span>
        </div>
      )}

      <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
        {!customer ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground">
              <Star className="mr-1 inline size-3.5 text-amber-500" />
              Tautkan pelanggan terdaftar agar mendapat poin member ({rateText}).
            </p>
            {kind === "service" && linkable && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => linkTicketCustomerAction(id))}
                className="font-semibold text-amber-700 hover:underline dark:text-amber-300"
              >
                Tautkan / daftarkan member
              </button>
            )}
          </div>
        ) : !started ? (
          <p className="text-muted-foreground">
            <Star className="mr-1 inline size-3.5 text-amber-500" />
            Program Poin Member mulai {cfg.startsAt ? formatStartDate(cfg.startsAt) : "segera"} — belum ada poin.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Star className="size-3.5 fill-amber-400 text-amber-500" />
                {customer.name}: <span className="font-mono font-semibold tabular-nums">{customer.points.toLocaleString("id-ID")}</span> poin
                {cfg.pointValue > 0 && <span className="text-muted-foreground">· senilai {formatRupiah(pointsWorth(customer.points, cfg))}</span>}
              </span>
              {max > 0 && !open && (
                <button
                  type="button"
                  onClick={() => {
                    setPoints(max);
                    setOpen(true);
                  }}
                  className="font-semibold text-amber-700 hover:underline dark:text-amber-300"
                >
                  Pakai poin
                </button>
              )}
            </div>
            {open && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  inputMode="numeric"
                  aria-label="Poin yang ditukar"
                  value={String(points)}
                  onChange={(e) => setPoints(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  className="h-7 w-24 text-xs"
                />
                <span className="text-muted-foreground">
                  maks. {max.toLocaleString("id-ID")} → potongan {formatRupiah(use * cfg.pointValue)}
                </span>
                <Button size="sm" className="h-7" onClick={redeem} disabled={pending || use <= 0}>
                  {pending && <Loader2 className="animate-spin" />} Tukar
                </Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)} disabled={pending}>
                  Batal
                </Button>
              </div>
            )}
            <p className="text-muted-foreground">
              Poin dari {kind === "service" ? "servis" : "rakitan"} ini: <span className="font-medium text-foreground">+{info.earned.toLocaleString("id-ID")}</span>{" "}
              (diberikan saat pembayaran diterima; {rateText}).
            </p>
          </>
        )}
      </div>
    </>
  );
}
