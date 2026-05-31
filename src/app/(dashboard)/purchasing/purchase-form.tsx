"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Loader2, Plus, X } from "lucide-react";
import { createPurchaseAction } from "@/server/purchasing/actions";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PurchaseProduct {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
}
export interface SupplierOption {
  id: string;
  name: string;
}

interface Line {
  product: PurchaseProduct;
  qty: number;
  costPrice: number;
}

export function PurchaseForm({
  products,
  suppliers,
  initialItems,
}: {
  products: PurchaseProduct[];
  suppliers: SupplierOption[];
  initialItems?: { productId: string; qty: number }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Map<string, Line>>(() => {
    const m = new Map<string, Line>();
    for (const it of initialItems ?? []) {
      const p = products.find((x) => x.id === it.productId);
      if (p) m.set(p.id, { product: p, qty: Math.max(1, it.qty), costPrice: p.costPrice });
    }
    return m;
  });
  const [supplierId, setSupplierId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, products]);

  const list = [...lines.values()];
  const subtotal = list.reduce((s, l) => s + l.qty * l.costPrice, 0);

  function addLine(p: PurchaseProduct) {
    setLines((prev) => {
      const next = new Map(prev);
      if (!next.has(p.id)) next.set(p.id, { product: p, qty: 1, costPrice: p.costPrice });
      return next;
    });
    setSearch("");
  }
  function update(id: string, patch: Partial<Line>) {
    setLines((prev) => {
      const next = new Map(prev);
      const l = next.get(id);
      if (l) next.set(id, { ...l, ...patch });
      return next;
    });
  }
  function remove(id: string) {
    setLines((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    if (list.length === 0) {
      setError("Tambahkan minimal 1 item.");
      return;
    }
    start(async () => {
      const res = await createPurchaseAction({
        supplierId: supplierId || undefined,
        items: list.map((l) => ({ productId: l.product.id, qty: l.qty, costPrice: l.costPrice })),
        paidAmount,
        dueDate: dueDate || undefined,
      });
      if (res.ok && res.purchaseId) router.push(`/purchasing/${res.purchaseId}`);
      else setError(res.message ?? "Gagal menyimpan.");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Supplier & Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— Tanpa supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk untuk ditambahkan…"
              className="pl-9"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>{p.name}</span>
                    <Plus className="size-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Produk</th>
                    <th className="p-2 font-medium">Qty</th>
                    <th className="p-2 font-medium">Harga Beli</th>
                    <th className="p-2 text-right font-medium">Subtotal</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((l) => (
                    <tr key={l.product.id} className="border-b last:border-0">
                      <td className="p-2">{l.product.name}</td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={l.qty}
                          onChange={(e) => update(l.product.id, { qty: Math.max(1, Number(e.target.value)) })}
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={l.costPrice}
                          onChange={(e) => update(l.product.id, { costPrice: Math.max(0, Number(e.target.value)) })}
                          className="h-8 w-32"
                        />
                      </td>
                      <td className="p-2 text-right">{formatRupiah(l.qty * l.costPrice)}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(l.product.id)}>
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Total</Label>
            <div className="flex h-10 items-center text-lg font-bold">{formatRupiah(subtotal)}</div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paid">Dibayar Sekarang (Rp)</Label>
            <Input
              id="paid"
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
            />
            <p className="text-xs text-muted-foreground">
              Sisa {formatRupiah(Math.max(0, subtotal - paidAmount))} jadi utang ke supplier.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="due">Jatuh Tempo Utang (opsional)</Label>
            <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-56" />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="flex items-center gap-1 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <X className="size-4" /> {error}
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={pending || list.length === 0}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Simpan Pembelian
      </Button>
    </div>
  );
}
