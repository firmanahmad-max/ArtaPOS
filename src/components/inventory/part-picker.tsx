"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clampQty, formatRupiah } from "@/lib/utils";

export interface PickerProduct {
  id: string;
  name: string;
  sellPrice: number;
  stock: number;
}


/**
 * Pemilih barang dari inventory dengan JUMLAH (qty).
 *
 * Alurnya dua langkah supaya qty bisa diatur sebelum stok terpotong:
 * cari → pilih barang → atur qty → "Tambah". Sebelumnya klik hasil pencarian
 * langsung menambah 1 unit, sehingga butuh 5 keping RAM = 5 kali klik.
 *
 * Qty dibatasi 1..stok agar pengguna tak menekan Tambah untuk jumlah yang
 * pasti ditolak server (server tetap memvalidasi ulang secara atomik).
 */
export function PartPicker({
  products,
  disabled,
  onAdd,
  placeholder = "Cari barang dari inventory…",
}: {
  products: PickerProduct[];
  disabled?: boolean;
  onAdd: (productId: string, qty: number) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<PickerProduct | null>(null);
  const [qty, setQty] = useState(1);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [search, products]);

  function choose(p: PickerProduct) {
    setPicked(p);
    setQty(1);
    setSearch("");
  }

  function reset() {
    setPicked(null);
    setQty(1);
  }

  function submit() {
    if (!picked) return;
    onAdd(picked.id, clampQty(qty, picked.stock));
    reset();
  }

  // Stok bisa berubah setelah penambahan sebelumnya → pakai data terbaru.
  const current = picked ? products.find((p) => p.id === picked.id) ?? picked : null;
  const maxQty = current?.stock ?? 1;
  const tooMany = qty > maxQty;

  if (current) {
    return (
      <div className="space-y-1.5 rounded-md border bg-muted/40 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{current.name}</p>
            <p className="text-xs text-muted-foreground">
              stok {current.stock} · {formatRupiah(current.sellPrice)}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={reset} title="Batal">
            <X className="size-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={disabled || qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              title="Kurangi"
            >
              <Minus className="size-3.5" />
            </Button>
            <Input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.trunc(Number(e.target.value)) || 1))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!tooMany) submit();
                }
              }}
              className="h-8 w-20 text-center"
              aria-label="Jumlah"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={disabled || qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              title="Tambah"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <span className="text-xs text-muted-foreground">
            Subtotal {formatRupiah(current.sellPrice * Math.max(1, qty))}
          </span>

          <Button size="sm" className="ml-auto" disabled={disabled || tooMany} onClick={submit}>
            <Plus /> Tambah
          </Button>
        </div>

        {tooMany && (
          <p className="text-xs text-destructive">Melebihi stok tersedia ({maxQty}).</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled || p.stock <= 0}
              onClick={() => choose(p)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
            >
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground">
                stok {p.stock} · {formatRupiah(p.sellPrice)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
