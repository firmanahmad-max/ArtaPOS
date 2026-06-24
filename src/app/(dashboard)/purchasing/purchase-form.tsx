"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, Loader2, Plus, X, PackagePlus } from "lucide-react";
import { createPurchaseAction } from "@/server/purchasing/actions";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  key: string;
  productId?: string; // produk lama
  newProduct?: { name: string; sku: string }; // produk baru (belum di inventory)
  name: string;
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
      if (p) m.set(p.id, { key: p.id, productId: p.id, name: p.name, qty: Math.max(1, it.qty), costPrice: p.costPrice });
    }
    return m;
  });
  const [supplierId, setSupplierId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Form produk baru.
  const [showNew, setShowNew] = useState(false);
  const [npName, setNpName] = useState("");
  const [npSku, setNpSku] = useState("");
  const [npCost, setNpCost] = useState(0);

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
      if (!next.has(p.id)) next.set(p.id, { key: p.id, productId: p.id, name: p.name, qty: 1, costPrice: p.costPrice });
      return next;
    });
    setSearch("");
  }
  function addNewProduct() {
    const name = npName.trim();
    const sku = npSku.trim();
    if (!name || !sku) {
      setError("Nama & SKU produk baru wajib diisi.");
      return;
    }
    setError(null);
    const key = "new:" + crypto.randomUUID();
    setLines((prev) => {
      const next = new Map(prev);
      next.set(key, { key, newProduct: { name, sku }, name, qty: 1, costPrice: Math.max(0, npCost) });
      return next;
    });
    setNpName("");
    setNpSku("");
    setNpCost(0);
    setShowNew(false);
  }
  function update(key: string, patch: Partial<Line>) {
    setLines((prev) => {
      const next = new Map(prev);
      const l = next.get(key);
      if (l) next.set(key, { ...l, ...patch });
      return next;
    });
  }
  function remove(key: string) {
    setLines((prev) => {
      const next = new Map(prev);
      next.delete(key);
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
        items: list.map((l) =>
          l.productId
            ? { productId: l.productId, qty: l.qty, costPrice: l.costPrice }
            : { newProduct: l.newProduct, qty: l.qty, costPrice: l.costPrice },
        ),
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk dari inventory…"
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
                      <span>{p.name} <span className="text-xs text-muted-foreground">· {p.sku}</span></span>
                      <Plus className="size-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" onClick={() => setShowNew((v) => !v)}>
              <PackagePlus /> Produk Baru
            </Button>
          </div>

          {showNew && (
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Nama produk baru</Label>
                <Input value={npName} onChange={(e) => setNpName(e.target.value)} placeholder="mis. SSD 2TB" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">SKU / Kode</Label>
                <Input value={npSku} onChange={(e) => setNpSku(e.target.value)} placeholder="mis. SSD-2TB" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Harga Beli (Rp)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={npCost}
                    onChange={(e) => setNpCost(Math.max(0, Number(e.target.value)))}
                    className="w-28"
                  />
                  <Button type="button" onClick={addNewProduct}>
                    <Plus /> Tambah
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-3">
                Produk baru otomatis dibuat di Inventory saat pembelian disimpan (stok = qty pembelian, harga jual awal = harga beli — sesuaikan nanti di Inventory).
              </p>
            </div>
          )}

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
                    <tr key={l.key} className="border-b last:border-0">
                      <td className="p-2">
                        {l.name}
                        {!l.productId && <Badge variant="success" className="ml-1">baru</Badge>}
                        {l.newProduct && (
                          <span className="ml-1 text-xs text-muted-foreground">· {l.newProduct.sku}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="1"
                          value={l.qty}
                          onChange={(e) => update(l.key, { qty: Math.max(1, Number(e.target.value)) })}
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          min="0"
                          value={l.costPrice}
                          onChange={(e) => update(l.key, { costPrice: Math.max(0, Number(e.target.value)) })}
                          className="h-8 w-32"
                        />
                      </td>
                      <td className="p-2 text-right">{formatRupiah(l.qty * l.costPrice)}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(l.key)}>
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
