"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, X, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { createSaleAction } from "@/server/pos/actions";
import { cn, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/barcode/barcode-scanner";

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: { symbol: string | null } | null;
}
export interface PosCustomer {
  id: string;
  name: string;
}

interface CartLine {
  product: PosProduct;
  qty: number;
  discount: number;
}

interface HeldSale {
  id: string;
  at: string;
  label: string;
  lines: { productId: string; qty: number; discount: number }[];
  customerId: string;
}

const HELD_KEY = "pos_held_v1";
function loadHeld(): HeldSale[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HELD_KEY) ?? "[]") as HeldSale[];
  } catch {
    return [];
  }
}
function saveHeld(list: HeldSale[]) {
  if (typeof window !== "undefined") localStorage.setItem(HELD_KEY, JSON.stringify(list));
}

export function PosTerminal({
  products,
  customers,
}: {
  products: PosProduct[];
  customers: PosCustomer[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS" | "CREDIT">("CASH");
  const [paid, setPaid] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startCheckout] = useTransition();
  const [held, setHeld] = useState<HeldSale[]>(() => loadHeld());
  const searchRef = useRef<HTMLInputElement>(null);
  const checkoutRef = useRef<() => void>(() => {});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 60);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [search, products]);

  const lines = [...cart.values()];
  const lineNet = (l: CartLine) => Math.max(0, l.product.sellPrice * l.qty - l.discount);
  const subtotal = lines.reduce((s, l) => s + lineNet(l), 0);
  const total = Math.max(0, subtotal - discount);
  const change = Math.max(0, paid - total);

  function addToCart(p: PosProduct) {
    setError(null);
    setCart((prev) => {
      const next = new Map(prev);
      const cur = next.get(p.id);
      const qty = (cur?.qty ?? 0) + 1;
      if (qty > p.stock) {
        setError(`Stok "${p.name}" hanya ${p.stock}.`);
        return prev;
      }
      next.set(p.id, { product: p, qty, discount: cur?.discount ?? 0 });
      return next;
    });
  }

  function setLineDiscount(id: string, discount: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(id);
      if (!line) return prev;
      next.set(id, { ...line, discount: Math.max(0, discount) });
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(id);
      if (!line) return prev;
      if (qty <= 0) next.delete(id);
      else next.set(id, { ...line, qty: Math.min(qty, line.product.stock) });
      return next;
    });
  }

  function onScan(code: string) {
    const p = products.find((x) => x.barcode === code || x.sku === code);
    if (p) addToCart(p);
    else setError(`Barcode ${code} tidak ditemukan.`);
  }

  function resetCart() {
    setCart(new Map());
    setDiscount(0);
    setPaid(0);
    setCustomerId("");
    setDueDate("");
    setPaymentMethod("CASH");
    setError(null);
  }

  function parkSale() {
    if (cart.size === 0) return;
    const cust = customers.find((c) => c.id === customerId);
    const sale: HeldSale = {
      id: Date.now().toString(),
      at: new Date().toISOString(),
      label: cust ? cust.name : `${cart.size} item`,
      lines: [...cart.values()].map((l) => ({ productId: l.product.id, qty: l.qty, discount: l.discount })),
      customerId,
    };
    const next = [...held, sale];
    setHeld(next);
    saveHeld(next);
    resetCart();
    toast.success("Transaksi ditahan", { description: sale.label });
  }

  function restoreSale(h: HeldSale) {
    const next = new Map<string, CartLine>();
    for (const ln of h.lines) {
      const p = products.find((x) => x.id === ln.productId);
      if (p) next.set(p.id, { product: p, qty: Math.min(ln.qty, p.stock), discount: ln.discount ?? 0 });
    }
    setCart(next);
    setCustomerId(h.customerId || "");
    removeHeld(h.id);
  }

  function removeHeld(id: string) {
    const next = held.filter((h) => h.id !== id);
    setHeld(next);
    saveHeld(next);
  }

  const isCredit = paymentMethod === "CREDIT";

  function checkout() {
    setError(null);
    if (lines.length === 0) {
      setError("Keranjang masih kosong.");
      return;
    }
    if (isCredit && !customerId) {
      setError("Penjualan kredit wajib memilih pelanggan.");
      return;
    }
    const effectivePaid = paymentMethod === "CASH" || isCredit ? paid : total;
    if (paymentMethod === "CASH" && effectivePaid < total) {
      setError("Jumlah bayar kurang dari total.");
      return;
    }
    startCheckout(async () => {
      const res = await createSaleAction({
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty, discount: l.discount })),
        discount,
        paymentMethod,
        paid: effectivePaid,
        customerId: customerId || undefined,
        dueDate: isCredit && dueDate ? dueDate : undefined,
      });
      if (res.ok && res.saleId) {
        toast.success("Penjualan berhasil disimpan");
        router.push(`/pos/receipt/${res.saleId}`);
      } else {
        const msg = res.message ?? "Checkout gagal.";
        setError(msg);
        toast.error("Checkout gagal", { description: msg });
      }
    });
  }

  // Pintasan keyboard: F2 = bayar, F4 = fokus pencarian.
  useEffect(() => {
    checkoutRef.current = checkout;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        checkoutRef.current();
      } else if (e.key === "F4") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const quickCash = [total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000].filter(
    (v, i, a) => v > 0 && a.indexOf(v) === i,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* Katalog produk */}
      <div className="space-y-3">
        {held.length > 0 && (
          <Card className="p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Transaksi Tertahan ({held.length})</p>
            <div className="flex flex-wrap gap-2">
              {held.map((h) => (
                <div key={h.id} className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  <button className="font-medium hover:underline" onClick={() => restoreSale(h)} title="Lanjutkan">
                    <RotateCcw className="mr-1 inline size-3" />{h.label}
                  </button>
                  <button className="text-destructive" onClick={() => removeHeld(h.id)} title="Hapus">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari / scan produk (nama, SKU, barcode)…  (F4)"
              className="pl-9"
              autoFocus
            />
          </div>
          <BarcodeScanner onDetected={onScan} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.minStock > 0 && p.stock <= p.minStock;
            return (
              <button
                key={p.id}
                disabled={out}
                onClick={() => addToCart(p)}
                className="group relative flex flex-col rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {out && (
                  <span className="absolute right-2 top-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                    Habis
                  </span>
                )}
                <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                <span
                  className={cn(
                    "mt-1 text-xs",
                    low ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground",
                  )}
                >
                  Stok {p.stock} {p.unit?.symbol ?? ""}{low ? " · menipis" : ""}
                </span>
                <span className="mt-1 font-semibold text-primary">{formatRupiah(p.sellPrice)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Produk tidak ditemukan.
            </p>
          )}
        </div>
      </div>

      {/* Keranjang & pembayaran */}
      <Card className="flex h-fit flex-col p-4 lg:sticky lg:top-4">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-4" /> Keranjang ({lines.length})
        </div>

        <div className="max-h-[40vh] space-y-2 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada item.</p>
          ) : (
            lines.map((l) => (
              <div key={l.product.id} className="space-y-1 border-b pb-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.product.name}</div>
                    <div className="text-xs text-muted-foreground">{formatRupiah(l.product.sellPrice)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.product.id, l.qty - 1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center">{l.qty}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => setQty(l.product.id, l.qty + 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-medium">{formatRupiah(lineNet(l))}</div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setQty(l.product.id, 0)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 pl-1 text-xs text-muted-foreground">
                  <span>Diskon:</span>
                  <CurrencyInput
                    value={l.discount}
                    onValueChange={(v) => setLineDiscount(l.product.id, v)}
                    prefix=""
                    placeholder="0"
                    className="h-7 w-24 text-xs"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Diskon</span>
            <CurrencyInput
              value={discount}
              onValueChange={(v) => setDiscount(v)}
              className="h-8 w-36"
            />
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(total)}</span>
          </div>

          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-9">
            <option value="">Pelanggan: Umum</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "TRANSFER" | "QRIS" | "CREDIT")}
            className="h-9"
          >
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer</option>
            <option value="QRIS">QRIS</option>
            <option value="CREDIT">Kredit / Tempo</option>
          </Select>

          {isCredit && (
            <>
              <CurrencyInput
                value={paid}
                onValueChange={(v) => setPaid(v)}
                placeholder="Uang muka / DP (boleh 0)"
                className="h-9"
              />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
                title="Jatuh tempo"
              />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sisa jadi piutang</span>
                <span className="font-medium text-destructive">{formatRupiah(Math.max(0, total - paid))}</span>
              </div>
              {!customerId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Pilih pelanggan terdaftar untuk penjualan kredit.
                </p>
              )}
            </>
          )}

          {paymentMethod === "CASH" && (
            <>
              <CurrencyInput
                value={paid}
                onValueChange={(v) => setPaid(v)}
                placeholder="Jumlah bayar"
                className="h-9"
              />
              <div className="flex flex-wrap gap-1">
                {quickCash.map((v) => (
                  <Button key={v} variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPaid(v)}>
                    {formatRupiah(v)}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span className="font-medium">{formatRupiah(change)}</span>
              </div>
            </>
          )}

          {error && (
            <p className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              <X className="size-3" /> {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" disabled={pending || lines.length === 0} onClick={parkSale} title="Tahan transaksi">
              <Pause /> Tahan
            </Button>
            <Button className="flex-1" size="lg" disabled={pending || lines.length === 0} onClick={checkout}>
              {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
              Bayar {formatRupiah(total)}
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Pintasan: <kbd className="rounded border bg-muted px-1">F2</kbd> bayar ·{" "}
            <kbd className="rounded border bg-muted px-1">F4</kbd> cari
          </p>
        </div>
      </Card>
    </div>
  );
}
