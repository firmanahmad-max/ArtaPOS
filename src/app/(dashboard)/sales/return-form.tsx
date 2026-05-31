"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { createReturnAction } from "@/server/pos/actions";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ReturnableItem {
  id: string;
  productName: string;
  qty: number;
  returnedQty: number;
  price: number;
}

export function ReturnForm({ saleId, items }: { saleId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refund = items.reduce((s, i) => s + (qtys[i.id] ?? 0) * i.price, 0);
  const anyQty = Object.values(qtys).some((q) => q > 0);

  const submit = () => {
    setMsg(null);
    const lines = items
      .map((i) => ({ saleItemId: i.id, qty: qtys[i.id] ?? 0 }))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) return;
    start(async () => {
      const r = await createReturnAction(saleId, lines);
      if (r.ok) {
        setMsg({ ok: true, text: `Retur ${r.number} berhasil. Refund ${formatRupiah(r.refund ?? 0)}.` });
        setQtys({});
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.message ?? "Gagal." });
      }
    });
  };

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 font-medium">Produk</th>
            <th className="p-2 text-center font-medium">Beli</th>
            <th className="p-2 text-center font-medium">Sisa bisa retur</th>
            <th className="p-2 text-center font-medium">Qty Retur</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const remaining = i.qty - i.returnedQty;
            return (
              <tr key={i.id} className="border-b last:border-0">
                <td className="p-2">{i.productName}</td>
                <td className="p-2 text-center text-muted-foreground">{i.qty}</td>
                <td className="p-2 text-center">{remaining}</td>
                <td className="p-2 text-center">
                  <Input
                    type="number"
                    min="0"
                    max={remaining}
                    value={qtys[i.id] ?? 0}
                    disabled={remaining <= 0}
                    onChange={(e) => setQtys((q) => ({ ...q, [i.id]: Math.min(remaining, Math.max(0, Number(e.target.value))) }))}
                    className="mx-auto h-8 w-20 text-center"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Total refund: <span className="font-semibold text-foreground">{formatRupiah(refund)}</span></span>
        <Button variant="destructive" onClick={submit} disabled={pending || !anyQty}>
          {pending ? <Loader2 className="animate-spin" /> : <Undo2 />} Proses Retur
        </Button>
      </div>
      {msg && <p className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
    </div>
  );
}
