"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle2, XCircle, Wrench, ShieldCheck } from "lucide-react";
import {
  trackServiceAction,
  trackRmaAction,
  type TrackResult,
  type TrackRmaResult,
} from "@/server/public/track";
import { formatRupiah, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "service" | "rma";

export function TrackForm({ defaultNumber = "" }: { defaultNumber?: string }) {
  const [mode, setMode] = useState<Mode>(
    defaultNumber.trim().toUpperCase().startsWith("RMA") ? "rma" : "service",
  );
  const [number, setNumber] = useState(defaultNumber);
  const [phone, setPhone] = useState("");
  const [svc, setSvc] = useState<TrackResult | null>(null);
  const [rma, setRma] = useState<TrackRmaResult | null>(null);
  const [pending, start] = useTransition();

  const result = mode === "service" ? svc : rma;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSvc(null);
    setRma(null);
    start(async () => {
      if (mode === "service") setSvc(await trackServiceAction(number, phone));
      else setRma(await trackRmaAction(number, phone));
    });
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setSvc(null);
    setRma(null);
  };

  return (
    <div className="space-y-4">
      {/* Pilih jenis lacak */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { m: "service", label: "Servis", Icon: Wrench },
            { m: "rma", label: "Klaim Garansi", Icon: ShieldCheck },
          ] as const
        ).map(({ m, label, Icon }) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="number">{mode === "service" ? "Nomor Tiket Servis" : "Nomor Klaim Garansi"}</Label>
          <Input
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={mode === "service" ? "mis. SV-00001" : "mis. RMA-00001"}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Nomor HP (saat didaftarkan)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="mis. 0812xxxx" autoFocus={!!defaultNumber} required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : <Search />} Lacak Status
        </Button>
      </form>

      {result && !result.found && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <XCircle className="size-5 shrink-0" />
          {result.rateLimited
            ? "Terlalu banyak percobaan. Coba lagi dalam beberapa menit."
            : mode === "service"
              ? "Tiket tidak ditemukan. Periksa nomor tiket & nomor HP Anda."
              : "Klaim tidak ditemukan. Periksa nomor klaim & nomor HP Anda."}
        </div>
      )}

      {/* Hasil: Servis */}
      {mode === "service" && svc?.found && (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="font-semibold">{svc.statusLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">No. Tiket</span>
            <span className="text-right font-medium">{svc.number}</span>
            <span className="text-muted-foreground">Perangkat</span>
            <span className="text-right">{svc.device}</span>
            <span className="text-muted-foreground">Masuk</span>
            <span className="text-right">
              {svc.createdAt && new Date(svc.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </span>
            {svc.technician && (
              <>
                <span className="text-muted-foreground">Teknisi</span>
                <span className="text-right">{svc.technician}</span>
              </>
            )}
          </div>
          {svc.cost != null && (
            <div className="mt-1 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {svc.costFinal ? "Total Biaya" : "Estimasi Biaya"}
              </span>
              <span className="text-base font-bold text-primary">{formatRupiah(svc.cost)}</span>
            </div>
          )}
          {svc.cost != null && !svc.costFinal && (
            <p className="text-center text-xs text-muted-foreground">Estimasi dapat berubah selama pengerjaan.</p>
          )}
        </div>
      )}

      {/* Hasil: Klaim Garansi (RMA) */}
      {mode === "rma" && rma?.found && (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <div className={cn("flex items-center gap-2", rma.done ? "text-success" : "text-amber-600 dark:text-amber-400")}>
            {rma.done ? <CheckCircle2 className="size-5" /> : <Loader2 className="size-5" />}
            <span className="font-semibold">{rma.statusLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">No. Klaim</span>
            <span className="text-right font-medium">{rma.number}</span>
            <span className="text-muted-foreground">Produk</span>
            <span className="text-right">{rma.product}</span>
            {rma.serialNumber && (
              <>
                <span className="text-muted-foreground">No. Seri</span>
                <span className="text-right">{rma.serialNumber}</span>
              </>
            )}
            <span className="text-muted-foreground">Dikirim ke distributor</span>
            <span className="text-right">
              {rma.sentAt && new Date(rma.sentAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </span>
            {rma.receivedAt && (
              <>
                <span className="text-muted-foreground">Kembali diterima</span>
                <span className="text-right">
                  {new Date(rma.receivedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </span>
              </>
            )}
          </div>
          {!rma.done && (
            <p className="text-center text-xs text-muted-foreground">
              Barang sedang dalam proses klaim ke distributor. Kami hubungi bila sudah kembali.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
