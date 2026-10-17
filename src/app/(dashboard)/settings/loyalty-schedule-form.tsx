"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2, Play } from "lucide-react";
import { setLoyaltyScheduleAction } from "@/server/customers/actions";
import { formatStartDate } from "@/lib/loyalty";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Jadwal mulai program poin + reset saldo. `defaultDate` = tgl 1 bulan depan (WIB),
 * dihitung di server agar tak ada Date.now() di render klien.
 */
export function LoyaltyScheduleForm({
  startsAt,
  started,
  defaultDate,
  totalPoints,
  holders,
}: {
  startsAt: string | null;
  started: boolean;
  defaultDate: string;
  totalPoints: number;
  /** Jumlah pelanggan yang saldo poinnya ≠ 0. */
  holders: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [reset, setReset] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startNowOpen, setStartNowOpen] = useState(false);

  /** Reset saldo butuh konfirmasi; tanpa reset langsung simpan. */
  function onSave() {
    if (reset && holders > 0) setConfirmOpen(true);
    else submit(date, reset);
  }

  function submit(startDate: string | null, resetBalances: boolean) {
    start(async () => {
      const r = await setLoyaltyScheduleAction(startDate, resetBalances);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        router.refresh();
      } else toast.error(r.message ?? "Gagal menyimpan.");
    });
  }

  return (
    <div className="space-y-4 border-t pt-5">
      <div className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 size-5 text-primary" />
        <div>
          <p className="font-medium">Jadwal Mulai &amp; Reset Poin</p>
          <p className="text-sm text-muted-foreground">
            {startsAt && !started ? (
              <>
                Program <strong className="text-foreground">dijadwalkan mulai {formatStartDate(startsAt)}</strong>. Sampai
                tanggal itu belanja belum menghasilkan poin &amp; poin belum bisa ditukar; struk pelanggan terdaftar
                menampilkan pengumumannya.
              </>
            ) : startsAt ? (
              <>Program berjalan sejak {formatStartDate(startsAt)}.</>
            ) : (
              "Program sedang berjalan."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lp-start">Mulai program pada</Label>
          <Input id="lp-start" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          Nolkan poin semua pelanggan sekarang
          <span className="text-muted-foreground">
            ({holders} pelanggan · {totalPoints.toLocaleString("id-ID")} poin)
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={pending || !date}>
          {pending ? <Loader2 className="animate-spin" /> : <CalendarClock />} Simpan jadwal
        </Button>
        {startsAt && !started && (
          <Button variant="outline" onClick={() => setStartNowOpen(true)} disabled={pending}>
            <Play /> Mulai sekarang
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => submit(date, true)}
        destructive
        title={`Nolkan poin ${holders} pelanggan?`}
        description={`Total ${totalPoints.toLocaleString("id-ID")} poin akan menjadi 0. Setiap reset tercatat di riwayat poin pelanggan dan tidak bisa dibatalkan otomatis.`}
        confirmText="Ya, nolkan & simpan jadwal"
      />

      {/* "Mulai sekarang" membatalkan jadwal & langsung mengaktifkan program — wajib konfirmasi. */}
      <ConfirmDialog
        open={startNowOpen}
        onOpenChange={setStartNowOpen}
        onConfirm={() => submit(null, false)}
        title="Mulai program poin sekarang?"
        description={`Jadwal ${startsAt ? formatStartDate(startsAt) : "yang tersimpan"} dibatalkan dan program langsung aktif: transaksi berikutnya mendapat poin & poin bisa ditukar. Saldo pelanggan tidak direset.`}
        confirmText="Ya, mulai sekarang"
        cancelText="Tetap sesuai jadwal"
      />
    </div>
  );
}
