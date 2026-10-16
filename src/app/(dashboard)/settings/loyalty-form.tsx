"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateLoyaltyConfigAction } from "@/server/customers/actions";
import { cashbackPercent, RUPIAH_PER_POINT } from "@/lib/loyalty";
import { formatRupiah, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const VALUE_PRESETS = [
  { value: 0, label: "Nonaktif" },
  { value: 1, label: "Rp 1" },
  { value: 5, label: "Rp 5" },
  { value: 10, label: "Rp 10" },
];

/** Aturan tukar poin: nilai rupiah per poin & minimal saldo untuk menukar. */
export function LoyaltySettingsForm({
  pointValue,
  minRedeem,
  serviceMultiplier,
  totalPoints,
}: {
  pointValue: number;
  minRedeem: number;
  serviceMultiplier: number;
  /** Total saldo poin semua pelanggan (untuk simulasi kewajiban). */
  totalPoints: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(pointValue);
  const [min, setMin] = useState(minRedeem);
  const [mult, setMult] = useState(serviceMultiplier);
  const cfg = { pointValue: value, minRedeem: min };
  const dirty = value !== pointValue || min !== minRedeem || mult !== serviceMultiplier;

  function save() {
    start(async () => {
      const r = await updateLoyaltyConfigAction(value, min, mult);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        router.refresh();
      } else toast.error(r.message ?? "Gagal menyimpan.");
    });
  }

  const num = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lp-value">Nilai 1 poin saat ditukar</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {VALUE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setValue(p.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  value === p.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50",
                )}
              >
                {p.label}
              </button>
            ))}
            <Input id="lp-value" inputMode="numeric" className="h-8 w-20" value={String(value)} onChange={(e) => setValue(Math.min(1000, num(e.target.value)))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lp-min">Minimal saldo untuk menukar (poin)</Label>
          <Input id="lp-min" inputMode="numeric" className="h-9 w-32" value={String(min)} onChange={(e) => setMin(Math.min(1_000_000, num(e.target.value)))} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Pengali poin jasa servis</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMult(m)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  mult === m ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50",
                )}
              >
                ×{m}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">
              Biaya jasa servis dapat {mult} poin per {formatRupiah(RUPIAH_PER_POINT)}; sparepart, rakit PC &amp; barang tetap ×1. Barang titip jual tanpa poin.
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        {value > 0 ? (
          <ul className="space-y-1">
            <li>
              Pelanggan dapat <strong>1 poin per {formatRupiah(RUPIAH_PER_POINT)}</strong> belanja di kasir →
              cashback efektif <strong>{cashbackPercent(cfg).toLocaleString("id-ID")}%</strong>.
            </li>
            <li>
              Contoh: belanja {formatRupiah(5_000_000)} → +5.000 poin = potongan{" "}
              <strong>{formatRupiah(5_000 * value)}</strong> di belanja berikutnya.
            </li>
            <li>
              Servis jasa {formatRupiah(150_000)} + sparepart {formatRupiah(600_000)} → +{(150 * mult + 600).toLocaleString("id-ID")} poin
              (≈ {formatRupiah((150 * mult + 600) * value)}). Poin servis &amp; kredit diberikan saat pembayaran diterima.
            </li>
            <li>
              Bisa ditukar mulai <strong>{min.toLocaleString("id-ID")} poin</strong> (≈ belanja{" "}
              {formatRupiah(min * RUPIAH_PER_POINT)}).
            </li>
            <li className="text-muted-foreground">
              Saldo semua pelanggan saat ini {totalPoints.toLocaleString("id-ID")} poin = kewajiban potongan{" "}
              <strong className="text-foreground">{formatRupiah(totalPoints * value)}</strong>.
            </li>
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Penukaran nonaktif — poin tetap terkumpul di setiap belanja, tapi belum bisa dipakai sebagai potongan.
          </p>
        )}
      </div>

      <Button onClick={save} disabled={pending || !dirty}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Program Poin
      </Button>
    </div>
  );
}
