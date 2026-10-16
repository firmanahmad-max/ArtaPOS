"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, X, Pause, RotateCcw, Cloud, CloudOff, RefreshCw, AlertTriangle, Banknote, ArrowLeftRight, QrCode, CreditCard, Delete, ChevronUp, Star } from "lucide-react";
import { toast } from "sonner";
import { createSaleAction } from "@/server/pos/actions";
import { cn, formatRupiah } from "@/lib/utils";
import { maxRedeemablePoints, pointsWorth, type LoyaltyConfig } from "@/lib/loyalty";
import { enqueueOutbox } from "@/lib/offline/db";
import { effectiveCatalog } from "@/lib/offline/catalog";
import { newOpId } from "@/lib/offline/enqueue";
import { useOfflineSync, notifyOutboxChanged } from "@/hooks/use-offline-sync";
import { SyncReviewDialog } from "./sync-review-dialog";
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
  /** Terisi bila ini BARANG TITIPAN (titip jual): unik 1 unit, hanya dijual online. */
  consignment?: { owner: string; number: string } | null;
  /** Terisi bila ini BARANG BEKAS milik toko: unik 1 unit, hanya dijual online. */
  used?: { number: string; gradeCode: string; warrantyDays: number } | null;
}
export interface PosCustomer {
  id: string;
  name: string;
  /** Saldo poin loyalitas (untuk ditukar sebagai potongan). */
  points?: number;
}

interface CartLine {
  product: PosProduct;
  qty: number;
  discount: number;
}

type PayMethod = "CASH" | "TRANSFER" | "QRIS" | "CREDIT";
const PAY_METHODS: { id: PayMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Tunai", icon: Banknote },
  { id: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "CREDIT", label: "Kredit", icon: CreditCard },
];
const KEYPAD = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "del"] as const;

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
  consignmentItems = [],
  usedItems = [],
  loyalty = { pointValue: 0, minRedeem: 0 },
}: {
  products: PosProduct[];
  customers: PosCustomer[];
  /** Barang titipan yang masih ditawarkan (tak masuk cache offline). */
  consignmentItems?: PosProduct[];
  /** Barang bekas yang tersedia (tak masuk cache offline). */
  usedItems?: PosProduct[];
  /** Aturan tukar poin toko (nilai/poin & minimal). */
  loyalty?: LoyaltyConfig;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"products" | "consignment" | "used">("products");
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [discount, setDiscount] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [serviceFeeLabel, setServiceFeeLabel] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("CASH");
  const [paid, setPaid] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0); // poin yang ingin ditukar
  const [error, setError] = useState<string | null>(null);
  const [pending, startCheckout] = useTransition();
  const [held, setHeld] = useState<HeldSale[]>(() => loadHeld());
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<() => void>(() => {});
  const parkRef = useRef<() => void>(() => {});
  const sync = useOfflineSync();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false); // sheet keranjang (mobile)

  // Tutup sheet otomatis bila keranjang menjadi kosong (mis. semua item dihapus
  // saat sheet terbuka) agar tak menyisakan sheet kosong menutupi layar.
  // Pola React "sesuaikan state saat render" (bukan useEffect) → tanpa render
  // berantai; hanya bereaksi saat ukuran keranjang BERUBAH menjadi 0.
  const [prevCartSize, setPrevCartSize] = useState(cart.size);
  if (prevCartSize !== cart.size) {
    setPrevCartSize(cart.size);
    if (cart.size === 0 && cartOpen) setCartOpen(false);
  }

  // Katalog efektif: cache IndexedDB (bila terisi) di atas props SSR, dikurangi
  // reservasi outbox. Lihat effectiveCatalog() untuk detail & pengujiannya.
  const catalog = useMemo<PosProduct[]>(
    () => effectiveCatalog(products, sync.cachedProducts, sync.items, sync.online),
    [sync.cachedProducts, sync.items, products, sync.online],
  );

  const filtered = useMemo(() => {
    const source = mode === "consignment" ? consignmentItems : mode === "used" ? usedItems : catalog;
    const q = search.trim().toLowerCase();
    if (!q) return source.slice(0, 60);
    return source
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q) ||
          (p.consignment?.owner ?? "").toLowerCase().includes(q) ||
          (p.used?.number ?? "").toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [search, catalog, consignmentItems, usedItems, mode]);

  const lines = [...cart.values()];
  const lineNet = (l: CartLine) => Math.max(0, l.product.sellPrice * l.qty - l.discount);
  const subtotal = lines.reduce((s, l) => s + lineNet(l), 0);
  const payableBeforePoints = Math.max(0, subtotal - discount) + Math.max(0, serviceFee);
  // Tukar poin: dibatasi saldo pelanggan & total (dihitung ulang tiap render, jadi
  // otomatis menyesuaikan bila keranjang/pelanggan berubah). Server memvalidasi ulang.
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const pointBalance = selectedCustomer?.points ?? 0;
  const maxPoints = maxRedeemablePoints(pointBalance, payableBeforePoints, loyalty);
  const usedPoints = Math.min(redeemPoints, maxPoints);
  const pointsDiscount = usedPoints * loyalty.pointValue;
  const total = payableBeforePoints - pointsDiscount;
  const change = Math.max(0, paid - total);
  // Barang titipan & bekas = unit tunggal → hanya bisa dijual online (cegah terjual ganda).
  const isUnit = (p: PosProduct) => !!(p.consignment || p.used);
  const hasConsignment = lines.some((l) => isUnit(l.product));
  const CONSIGNMENT_OFFLINE = "Barang titipan/bekas hanya bisa dijual saat online (unit tunggal, cegah terjual ganda).";

  function addToCart(p: PosProduct) {
    setError(null);
    if (isUnit(p) && typeof navigator !== "undefined" && !navigator.onLine) {
      setError(CONSIGNMENT_OFFLINE);
      return;
    }
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

  /** Keypad angka layar-sentuh → menyusun nilai `paid` digit demi digit. */
  function keypadPress(k: (typeof KEYPAD)[number]) {
    setPaid((p) => {
      if (k === "del") return Math.floor(p / 10);
      if (k === "000") return p * 1000;
      return p * 10 + Number(k);
    });
  }

  function onScan(code: string) {
    // Produk dulu, lalu barang titipan (barcode = no. seri), lalu barang bekas (no. seri / no. BK).
    const p =
      catalog.find((x) => x.barcode === code || x.sku === code) ??
      consignmentItems.find((x) => x.barcode === code) ??
      usedItems.find((x) => x.barcode === code || x.used?.number === code.toUpperCase());
    if (p) addToCart(p);
    else setError(`Barcode ${code} tidak ditemukan.`);
  }

  function resetCart() {
    setCart(new Map());
    setDiscount(0);
    setServiceFee(0);
    setServiceFeeLabel("");
    setPaid(0);
    setCustomerId("");
    setRedeemPoints(0);
    setDueDate("");
    setPaymentMethod("CASH");
    setError(null);
    setCartOpen(false); // tutup sheet mobile setelah selesai
  }

  function parkSale() {
    if (cart.size === 0) return;
    const cust = customers.find((c) => c.id === customerId);
    const sale: HeldSale = {
      id: newOpId(),
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
    let missing = 0;
    for (const ln of h.lines) {
      // Barang titipan mungkin sudah laku sejak ditahan → tak ada di daftar lagi.
      const p =
        catalog.find((x) => x.id === ln.productId) ??
        consignmentItems.find((x) => x.id === ln.productId) ??
        usedItems.find((x) => x.id === ln.productId);
      if (p) next.set(p.id, { product: p, qty: Math.min(ln.qty, p.stock), discount: ln.discount ?? 0 });
      else missing += 1;
    }
    if (missing > 0) toast.warning(`${missing} item tak lagi tersedia (mungkin sudah terjual) dan dilewati.`);
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

  /** Simpan penjualan ke antrian offline (IndexedDB) — disinkron otomatis nanti. */
  async function queueOffline(clientOpId: string, payload: Record<string, unknown>) {
    try {
      await enqueueOutbox({
        clientOpId,
        type: "sale",
        payload,
        clientCreatedAt: new Date().toISOString(),
        summary: { itemCount: lines.length, total, label: `${lines.length} item · ${formatRupiah(total)}` },
        status: "pending",
        attempts: 0,
        enqueuedAt: new Date().toISOString(),
      });
      notifyOutboxChanged();
      toast.success("Tersimpan offline", { description: "Akan otomatis disinkronkan saat internet kembali." });
      resetCart();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan offline.";
      setError(msg);
      toast.error("Gagal menyimpan offline", { description: msg });
    }
  }

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
    const clientOpId = newOpId();
    const payload = {
      items: lines
        .filter((l) => !isUnit(l.product))
        .map((l) => ({ productId: l.product.id, qty: l.qty, discount: l.discount })),
      // Barang titipan dikirim terpisah: harga & komisi diambil server dari DB.
      consignmentItems: lines
        .filter((l) => l.product.consignment)
        .map((l) => ({ consignmentItemId: l.product.id, discount: l.discount })),
      // Barang bekas juga terpisah: harga & modal diambil server dari DB.
      usedItems: lines
        .filter((l) => l.product.used)
        .map((l) => ({ usedItemId: l.product.id, discount: l.discount })),
      discount,
      serviceFee: Math.max(0, serviceFee),
      serviceFeeLabel: serviceFee > 0 ? serviceFeeLabel.trim() || undefined : undefined,
      paymentMethod,
      paid: effectivePaid,
      customerId: customerId || undefined,
      dueDate: isCredit && dueDate ? dueDate : undefined,
      redeemPoints: usedPoints,
    };

    // Offline → langsung antre (tanpa memanggil server). Barang titipan tak boleh antre.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (hasConsignment) {
        setError(CONSIGNMENT_OFFLINE);
        return;
      }
      if (usedPoints > 0) {
        setError("Tukar poin hanya bisa saat online (saldo poin harus dicek ke server).");
        return;
      }
      void queueOffline(clientOpId, payload);
      return;
    }

    startCheckout(async () => {
      try {
        // clientOpId dikirim juga saat online → double-submit/retry aman (idempoten).
        const res = await createSaleAction({ ...payload, clientOpId });
        if (res.ok && res.saleId) {
          toast.success("Penjualan berhasil disimpan");
          router.push(`/pos/receipt/${res.saleId}`);
        } else {
          const msg = res.message ?? "Checkout gagal.";
          setError(msg);
          toast.error("Checkout gagal", { description: msg });
        }
      } catch {
        // Server tak terjangkau (jaringan putus di tengah) → simpan offline,
        // kecuali ada barang titipan (unit tunggal; harus dikonfirmasi online).
        if (hasConsignment || usedPoints > 0) {
          const msg = "Koneksi terputus. Penjualan berisi barang titipan/bekas atau tukar poin — coba lagi saat online.";
          setError(msg);
          toast.error("Checkout gagal", { description: msg });
          return;
        }
        await queueOffline(clientOpId, payload);
      }
    });
  }

  // Pintasan keyboard: F2 = bayar, F4 = fokus pencarian.
  useEffect(() => {
    checkoutRef.current = checkout;
    parkRef.current = parkSale;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        checkoutRef.current();
      } else if (e.key === "F3") {
        e.preventDefault();
        parkRef.current();
      } else if (e.key === "F4") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Kunci scroll kontainer utama saat sheet keranjang terbuka (mobile) agar
  // latar tak ikut ter-scroll di belakang backdrop.
  useEffect(() => {
    if (!cartOpen) return;
    const scroller = rootRef.current?.closest("main") as HTMLElement | null;
    if (!scroller) return;
    const prev = scroller.style.overflow;
    scroller.style.overflow = "hidden";
    return () => {
      scroller.style.overflow = prev;
    };
  }, [cartOpen]);

  const quickCash = [total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000].filter(
    (v, i, a) => v > 0 && a.indexOf(v) === i,
  );

  return (
    <div ref={rootRef} className="grid gap-4 max-lg:pb-16 lg:grid-cols-[1fr_380px]">
      {/* Katalog produk */}
      <div className="space-y-3">
        {/* Status sinkronisasi offline — tampil hanya saat relevan */}
        {(!sync.online || sync.pending > 0 || sync.needsReview > 0 || sync.syncing) && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs",
              !sync.online
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-primary/30 bg-primary/5",
            )}
          >
            {!sync.online ? (
              <span className="flex items-center gap-1.5 font-medium">
                <CloudOff className="size-4" /> Mode Offline — penjualan disimpan di perangkat
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                {sync.syncing ? <RefreshCw className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                {sync.syncing ? "Menyinkronkan…" : "Online"}
              </span>
            )}
            {sync.pending > 0 && <span>{sync.pending} menunggu sinkron</span>}
            {sync.needsReview > 0 && (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="flex items-center gap-1 font-medium text-destructive underline-offset-2 hover:underline"
              >
                <AlertTriangle className="size-3.5" /> {sync.needsReview} perlu ditinjau
              </button>
            )}
            {(sync.pending > 0 || sync.needsReview > 0) && (
              <Button variant="outline" size="sm" className="ml-auto h-7" onClick={() => setReviewOpen(true)}>
                Tinjau Antrian
              </Button>
            )}
          </div>
        )}
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

        {/* Sumber daftar: produk toko atau barang titipan pelanggan */}
        <div className="flex gap-1.5" role="tablist" aria-label="Sumber barang">
          {(
            [
              { id: "products", label: "Produk", count: catalog.length },
              { id: "consignment", label: "Titipan", count: consignmentItems.length },
              { id: "used", label: "Bekas", count: usedItems.length },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                mode === t.id
                  ? "gradient-brand border-transparent text-primary-foreground shadow-brand"
                  : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {t.label} <span className="font-mono tabular-nums opacity-80">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.minStock > 0 && p.stock <= p.minStock;
            if (p.used) {
              const inCart = cart.has(p.id);
              return (
                <button
                  key={p.id}
                  disabled={inCart}
                  onClick={() => addToCart(p)}
                  className="group flex flex-col rounded-xl border border-dashed border-sky-500/50 bg-sky-500/5 p-3 text-left transition-colors hover:border-sky-500 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="line-clamp-2 min-h-[34px] text-sm font-medium leading-tight">{p.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                      Bekas · {p.used.gradeCode}
                    </span>
                    <span className="truncate text-muted-foreground">{inCart ? "di keranjang" : p.used.number}</span>
                  </span>
                  {p.sku && <span className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">SN {p.sku}</span>}
                  <span className="mt-1 font-mono text-sm font-semibold tabular-nums text-primary">{formatRupiah(p.sellPrice)}</span>
                </button>
              );
            }
            if (p.consignment) {
              const inCart = cart.has(p.id);
              return (
                <button
                  key={p.id}
                  disabled={inCart}
                  onClick={() => addToCart(p)}
                  className="group flex flex-col rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3 text-left transition-colors hover:border-amber-500 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="line-clamp-2 min-h-[34px] text-sm font-medium leading-tight">{p.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      Titipan
                    </span>
                    <span className="truncate text-muted-foreground">{inCart ? "di keranjang" : p.consignment.owner}</span>
                  </span>
                  {p.sku && <span className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">SN {p.sku}</span>}
                  <span className="mt-1 font-mono text-sm font-semibold tabular-nums text-primary">{formatRupiah(p.sellPrice)}</span>
                </button>
              );
            }
            return (
              <button
                key={p.id}
                disabled={out}
                onClick={() => addToCart(p)}
                className="group flex flex-col rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="line-clamp-2 min-h-[34px] text-sm font-medium leading-tight">{p.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  {out ? (
                    <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                      Habis
                    </span>
                  ) : (
                    <span className={cn(low ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      Stok {p.stock} {p.unit?.symbol ?? ""}{low ? " · menipis" : ""}
                    </span>
                  )}
                </span>
                <span className="mt-1 font-mono text-sm font-semibold tabular-nums text-primary">{formatRupiah(p.sellPrice)}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {mode === "consignment"
                ? consignmentItems.length === 0
                  ? "Belum ada barang titipan yang ditawarkan."
                  : "Barang titipan tidak ditemukan."
                : mode === "used"
                  ? usedItems.length === 0
                    ? "Belum ada barang bekas yang tersedia."
                    : "Barang bekas tidak ditemukan."
                  : "Produk tidak ditemukan."}
            </p>
          )}
        </div>
      </div>

      {/* Backdrop sheet keranjang (mobile) */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setCartOpen(false)} />
      )}

      {/* Keranjang & pembayaran — desktop: kolom sticky; mobile: sheet slide-up */}
      <div
        className={cn(
          "flex flex-col text-card-foreground elevate",
          "lg:sticky lg:top-4 lg:h-fit lg:rounded-2xl lg:border lg:bg-card lg:p-4",
          "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[88vh] max-lg:overflow-y-auto max-lg:rounded-t-[20px] max-lg:border-t max-lg:bg-card max-lg:p-4 max-lg:shadow-2xl max-lg:transition-transform",
          !cartOpen && "max-lg:translate-y-full",
        )}
      >
        {/* Grabber + tutup (mobile) */}
        <div className="relative mb-2 lg:hidden">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted" />
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="absolute -top-1 right-0 rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Tutup keranjang"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-4" /> Keranjang ({lines.length})
        </div>

        <div className="max-h-[40vh] shrink-0 space-y-2 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada item.</p>
          ) : (
            lines.map((l) => (
              <div key={l.product.id} className="space-y-1 border-b pb-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRupiah(l.product.sellPrice)}
                      {l.product.consignment && (
                        <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          Titipan · {l.product.consignment.owner}
                        </span>
                      )}
                      {l.product.used && (
                        <span className="ml-1.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                          Bekas · {l.product.used.number}
                        </span>
                      )}
                    </div>
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
                  <div className="w-20 text-right font-mono font-medium tabular-nums">{formatRupiah(lineNet(l))}</div>
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
            <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Diskon transaksi</span>
            <CurrencyInput
              value={discount}
              onValueChange={(v) => setDiscount(v)}
              className="h-8 w-36"
            />
          </div>
          {/* Biaya lain/jasa (mis. setup/instal) — menambah total, tanpa HPP */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Biaya lain/jasa</span>
            <CurrencyInput
              value={serviceFee}
              onValueChange={(v) => setServiceFee(v)}
              className="h-8 w-36"
            />
          </div>
          {serviceFee > 0 && (
            <Input
              value={serviceFeeLabel}
              onChange={(e) => setServiceFeeLabel(e.target.value)}
              placeholder="Keterangan biaya (mis. Setup & instal aplikasi)"
              maxLength={60}
              className="h-8 text-sm"
            />
          )}
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-300">
              <span>Tukar poin ({usedPoints.toLocaleString("id-ID")})</span>
              <span className="font-mono tabular-nums">-{formatRupiah(pointsDiscount)}</span>
            </div>
          )}
          {/* Total — blok tint violet, angka mono besar */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2.5">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-mono text-[22px] font-bold tabular-nums text-primary">{formatRupiah(total)}</span>
          </div>

          <Select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setRedeemPoints(0); // poin milik pelanggan lain tak boleh terbawa
            }}
            className="h-9"
          >
            <option value="">Pelanggan: Umum</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.points ? ` · ${c.points.toLocaleString("id-ID")} poin` : ""}
              </option>
            ))}
          </Select>

          {/* Poin loyalitas pelanggan terpilih: saldo, nilai & tukar sebagai potongan */}
          {selectedCustomer && loyalty.pointValue > 0 && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  <span className="font-mono font-semibold tabular-nums">{pointBalance.toLocaleString("id-ID")}</span> poin
                  <span className="text-muted-foreground">
                    · senilai {formatRupiah(pointsWorth(pointBalance, loyalty))}
                  </span>
                </span>
                {maxPoints > 0 &&
                  (usedPoints > 0 ? (
                    <button type="button" onClick={() => setRedeemPoints(0)} className="font-medium text-muted-foreground hover:underline">
                      Batal tukar
                    </button>
                  ) : (
                    <button type="button" onClick={() => setRedeemPoints(maxPoints)} className="font-semibold text-amber-700 hover:underline dark:text-amber-300">
                      Pakai poin
                    </button>
                  ))}
              </div>
              {usedPoints > 0 && (
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    aria-label="Poin yang ditukar"
                    value={String(redeemPoints)}
                    onChange={(e) => setRedeemPoints(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    className="h-7 w-24 text-xs"
                  />
                  <span className="text-muted-foreground">
                    dari maks. {maxPoints.toLocaleString("id-ID")} → potongan {formatRupiah(pointsDiscount)}
                  </span>
                </div>
              )}
              {maxPoints === 0 && pointBalance < loyalty.minRedeem && (
                <p className="text-muted-foreground">
                  Bisa ditukar mulai {loyalty.minRedeem.toLocaleString("id-ID")} poin.
                </p>
              )}
            </div>
          )}

          {/* Metode bayar — tombol besar (ganti dropdown, hemat satu interaksi) */}
          <div className="grid grid-cols-4 gap-1.5">
            {PAY_METHODS.map((m) => {
              const active = paymentMethod === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setPaymentMethod(m.id); setPaid(0); }}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] font-medium transition-colors",
                    active
                      ? "gradient-brand border-transparent text-primary-foreground shadow-brand"
                      : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="size-4" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {isCredit && (
            <>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
                title="Jatuh tempo"
              />
              {!customerId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Pilih pelanggan terdaftar untuk penjualan kredit.
                </p>
              )}
            </>
          )}

          {/* Jumlah bayar + keypad angka (Tunai & DP Kredit) */}
          {(paymentMethod === "CASH" || isCredit) && (
            <>
              <CurrencyInput
                value={paid}
                onValueChange={(v) => setPaid(v)}
                placeholder={isCredit ? "Uang muka / DP (boleh 0)" : "Jumlah bayar"}
                className="h-10 text-base"
              />
              {paymentMethod === "CASH" && quickCash.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {quickCash.map((v) => (
                    <Button key={v} variant="outline" size="sm" className="h-7 font-mono text-xs" onClick={() => setPaid(v)}>
                      {formatRupiah(v)}
                    </Button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {KEYPAD.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k === "del" ? "Hapus digit" : k}
                    onClick={() => keypadPress(k)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg border border-border bg-secondary font-mono text-base font-semibold text-secondary-foreground transition-transform hover:bg-accent active:scale-95",
                      k === "del" && "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {k === "del" ? <Delete className="size-4" /> : k}
                  </button>
                ))}
              </div>
              {isCredit ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sisa jadi piutang</span>
                  <span className="font-mono font-medium tabular-nums text-destructive">{formatRupiah(Math.max(0, total - paid))}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Kembalian</span>
                  <span className="font-mono text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatRupiah(change)}</span>
                </div>
              )}
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
            <Button className="h-12 flex-1" size="lg" disabled={pending || lines.length === 0} onClick={checkout}>
              {pending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
              Bayar <span className="font-mono tabular-nums">{formatRupiah(total)}</span>
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Pintasan: <kbd className="rounded border bg-muted px-1">F2</kbd> bayar ·{" "}
            <kbd className="rounded border bg-muted px-1">F3</kbd> tahan ·{" "}
            <kbd className="rounded border bg-muted px-1">F4</kbd> cari
          </p>
        </div>
      </div>

      <SyncReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        items={sync.items}
        online={sync.online}
        syncing={sync.syncing}
        onRetry={sync.retryItem}
        onDiscard={sync.discardItem}
        onSyncAll={sync.syncNow}
      />

      {/* Bar keranjang menetap (mobile) — ketuk untuk buka sheet keranjang.
          Duduk tepat di atas tab bar bawah (62px). Sembunyi saat sheet terbuka. */}
      {lines.length > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-0 bottom-0 z-30 flex w-full items-center gap-3 border-t bg-card/95 px-4 py-2.5 text-left backdrop-blur max-md:bottom-[62px] lg:hidden"
        >
          <span className="relative shrink-0">
            <ShoppingCart className="size-6 text-primary" />
            <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular-nums text-primary-foreground">
              {lines.length}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-none text-muted-foreground">Total</p>
            <p className="font-mono text-base font-bold leading-tight tabular-nums text-primary">{formatRupiah(total)}</p>
          </div>
          <span className="inline-flex h-10 items-center gap-1.5 rounded-lg gradient-brand px-4 text-sm font-medium text-primary-foreground shadow-brand">
            Lihat & Bayar <ChevronUp className="size-4" />
          </span>
        </button>
      )}
    </div>
  );
}
