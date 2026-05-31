"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { trackServiceAction, type TrackResult } from "@/server/public/track";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrackForm() {
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    start(async () => {
      const r = await trackServiceAction(number, phone);
      setResult(r);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="number">Nomor Tiket Servis</Label>
          <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="mis. SV-00001" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Nomor HP (saat servis didaftarkan)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="mis. 0812xxxx" required />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : <Search />} Lacak Status
        </Button>
      </form>

      {result && !result.found && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <XCircle className="size-5 shrink-0" />
          Tiket tidak ditemukan. Periksa nomor tiket & nomor HP Anda.
        </div>
      )}

      {result?.found && (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <span className="font-semibold">{result.statusLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">No. Tiket</span>
            <span className="text-right font-medium">{result.number}</span>
            <span className="text-muted-foreground">Perangkat</span>
            <span className="text-right">{result.device}</span>
            <span className="text-muted-foreground">Masuk</span>
            <span className="text-right">
              {result.createdAt && new Date(result.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </span>
            {result.technician && (
              <>
                <span className="text-muted-foreground">Teknisi</span>
                <span className="text-right">{result.technician}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
