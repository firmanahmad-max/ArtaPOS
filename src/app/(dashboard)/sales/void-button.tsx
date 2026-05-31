"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import { voidSaleAction } from "@/server/pos/actions";
import { Button } from "@/components/ui/button";

export function VoidSaleButton({ saleId, number }: { saleId: string; number: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const onClick = () => {
    if (!confirm(`Batalkan transaksi ${number}? Stok akan dikembalikan. Tindakan ini tidak bisa diurungkan.`)) return;
    start(async () => {
      const r = await voidSaleAction(saleId);
      if (r.ok) router.refresh();
      else setErr(r.message ?? "Gagal membatalkan.");
    });
  };

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={onClick} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Ban />} Batalkan Transaksi
      </Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}
