"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Search, Loader2, Save, Send, Download, PackageOpen } from "lucide-react";
import type { SimStatus } from "@/generated/prisma/enums";
import {
  saveSimulationAction,
  importSimulationAction,
  setSimStatusAction,
} from "@/server/build-sim/actions";
import { simTotals } from "@/lib/build-sim-calc";
import { buildSimulationText, waLink } from "@/lib/whatsapp";
import { formatRupiah, cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Prod { id: string; name: string; sku: string; sellPrice: number; costPrice: number; stock: number }
interface Cust { id: string; name: string; phone: string | null }

interface Row {
  key: string;
  productId: string | null;
  name: string;
  qty: number;
  costPrice: number;
  sellPrice: number;
}

export interface EditorInitial {
  id: string;
  number: string;
  status: SimStatus;
  name: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  budget: number;
  buildFee: number;
  note: string | null;
  createdAt: string; // ISO
  importedBuildId: string | null;
  items: { productId: string | null; name: string; qty: number; costPrice: number; sellPrice: number }[];
}

const STATUS_META: Record<SimStatus, { label: string; variant: "default" | "secondary" | "warning" | "success" | "destructive" }> = {
  DRAFT: { label: "Draf", variant: "secondary" },
  SENT: { label: "Terkirim", variant: "warning" },
  APPROVED: { label: "Disetujui", variant: "success" },
  IMPORTED: { label: "Diimpor", variant: "default" },
  REJECTED: { label: "Ditolak", variant: "destructive" },
};

const todayISODate = () => new Date().toISOString().slice(0, 10);

export function SimulationEditor({
  products,
  customers,
  storeName,
  initial,
}: {
  products: Prod[];
  customers: Cust[];
  storeName: string;
  initial: EditorInitial | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const seq = useRef(0);
  const newKey = () => `r${seq.current++}`;

  const [name, setName] = useState(initial?.name ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 0);
  const [buildFee, setBuildFee] = useState(initial?.buildFee ?? 0);
  const [note, setNote] = useState(initial?.note ?? "");
  const [createdAt, setCreatedAt] = useState(initial ? initial.createdAt.slice(0, 10) : todayISODate());
  const [rows, setRows] = useState<Row[]>(
    () => initial?.items.map((it) => ({ key: newKey(), ...it })) ?? [],
  );
  const [search, setSearch] = useState("");

  const status = initial?.status ?? "DRAFT";
  const isImported = status === "IMPORTED" || !!initial?.importedBuildId;
  const locked = isImported; // sudah jadi rakitan → editor terkunci

  const totals = useMemo(() => simTotals(rows, buildFee, budget), [rows, buildFee, budget]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, products]);

  function addProduct(p: Prod) {
    setRows((rs) => [
      ...rs,
      { key: newKey(), productId: p.id, name: p.name, qty: 1, costPrice: p.costPrice, sellPrice: p.sellPrice },
    ]);
    setSearch("");
  }
  function addFree() {
    setRows((rs) => [...rs, { key: newKey(), productId: null, name: "", qty: 1, costPrice: 0, sellPrice: 0 }]);
  }
  function patch(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function stockOf(productId: string | null) {
    if (!productId) return null;
    return products.find((p) => p.id === productId)?.stock ?? null;
  }

  function payload() {
    return {
      name: name.trim(),
      customerId: customerId || null,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      budget,
      buildFee,
      note: note.trim() || null,
      createdAt: createdAt || null,
      items: rows.map((r) => ({
        productId: r.productId,
        name: r.name.trim(),
        qty: r.qty,
        costPrice: r.costPrice,
        sellPrice: r.sellPrice,
      })),
    };
  }

  function validateLocal(): string | null {
    if (!name.trim()) return "Nama rakitan wajib diisi.";
    if (rows.length === 0) return "Tambahkan minimal satu komponen.";
    if (rows.some((r) => !r.name.trim())) return "Ada komponen tanpa nama.";
    return null;
  }

  function save(after?: (id: string) => void) {
    const err = validateLocal();
    if (err) { setMsg(err); return; }
    setMsg(null);
    start(async () => {
      const r = await saveSimulationAction(initial?.id ?? null, payload());
      if (r.ok) {
        if (!initial) { router.push(`/simulations/${r.id}`); return; }
        router.refresh();
        setMsg("Tersimpan.");
        after?.(r.id);
      } else {
        setMsg(r.message ?? Object.values(r.errors ?? {})[0]?.[0] ?? "Gagal menyimpan.");
      }
    });
  }

  function shareWhatsApp() {
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), qty: r.qty, sellPrice: r.sellPrice, subtotal: r.sellPrice * r.qty }));
    if (items.length === 0) { setMsg("Belum ada komponen untuk dikirim."); return; }
    const text = buildSimulationText({
      storeName,
      number: initial?.number ?? "(baru)",
      dateText: new Date(createdAt || Date.now()).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      name: name.trim() || "Rakitan PC",
      customerName: customerName.trim() || null,
      items,
      buildFee,
      grandTotal: totals.grandSell,
      note: note.trim() || null,
    });
    window.open(waLink(text, customerPhone.trim() || undefined), "_blank");
  }

  function doImport() {
    if (!initial) return;
    setMsg(null);
    start(async () => {
      const r = await importSimulationAction(initial.id);
      if (r.ok) {
        router.push(`/pc-build/${r.buildId}`);
      } else {
        setMsg(r.message ?? "Gagal mengimpor.");
      }
    });
  }

  function changeStatus(s: SimStatus) {
    if (!initial) return;
    setMsg(null);
    start(async () => {
      const r = await setSimStatusAction(initial.id, s);
      if (r.ok) router.refresh();
      setMsg(r.message ?? null);
    });
  }

  const marginTone = totals.margin > 0 ? "text-emerald-600 dark:text-emerald-400" : totals.margin < 0 ? "text-destructive" : "";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Kolom kiri: header + komponen */}
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              {initial ? `Simulasi ${initial.number}` : "Simulasi Baru"}
              <Badge variant={STATUS_META[status].variant}>{STATUS_META[status].label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="name">Nama Rakitan *</Label>
              <Input id="name" value={name} disabled={locked} onChange={(e) => setName(e.target.value)} placeholder="mis. PC Gaming Budi" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="createdAt">Tanggal</Label>
              <Input id="createdAt" type="date" value={createdAt} disabled={locked} onChange={(e) => setCreatedAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerId">Pelanggan terdaftar</Label>
              <Select
                id="customerId"
                value={customerId}
                disabled={locked}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const c = customers.find((x) => x.id === id);
                  if (c) { setCustomerName(c.name); if (c.phone) setCustomerPhone(c.phone); }
                }}
              >
                <option value="">— Tidak ditautkan —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerName">Nama Pelanggan</Label>
              <Input id="customerName" value={customerName} disabled={locked} onChange={(e) => setCustomerName(e.target.value)} placeholder="opsional" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerPhone">No. HP (untuk WA)</Label>
              <Input id="customerPhone" value={customerPhone} disabled={locked} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="0812…" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Komponen</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2 font-medium">Komponen</th>
                      <th className="p-2 text-center font-medium">Qty</th>
                      <th className="p-2 text-right font-medium">Modal</th>
                      <th className="p-2 text-right font-medium">Jual</th>
                      <th className="p-2 text-right font-medium">Subtotal</th>
                      <th className="p-2 text-right font-medium">Margin</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const subtotal = r.sellPrice * r.qty;
                      const lineMargin = (r.sellPrice - r.costPrice) * r.qty;
                      const stock = stockOf(r.productId);
                      return (
                        <tr key={r.key} className="border-b align-top last:border-0">
                          <td className="p-2">
                            <Input value={r.name} disabled={locked} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Nama komponen" className="h-8" />
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {r.productId ? `Inventory · stok ${stock ?? "?"}` : "Komponen bebas"}
                            </p>
                          </td>
                          <td className="p-2">
                            <Input type="number" min={1} value={r.qty} disabled={locked}
                              onChange={(e) => patch(r.key, { qty: Math.max(1, Math.trunc(Number(e.target.value)) || 1) })}
                              className="h-8 w-16 text-center" />
                          </td>
                          <td className="p-2">
                            <CurrencyInput value={r.costPrice} prefix="" disabled={locked} onValueChange={(v) => patch(r.key, { costPrice: v })} className="h-8 w-28" />
                          </td>
                          <td className="p-2">
                            <CurrencyInput value={r.sellPrice} prefix="" disabled={locked} onValueChange={(v) => patch(r.key, { sellPrice: v })} className="h-8 w-28" />
                          </td>
                          <td className="p-2 text-right font-medium tabular-nums">{formatRupiah(subtotal)}</td>
                          <td className={cn("p-2 text-right tabular-nums", lineMargin < 0 ? "text-destructive" : "text-muted-foreground")}>{formatRupiah(lineMargin)}</td>
                          <td className="p-2 text-right">
                            {!locked && (
                              <Button variant="ghost" size="icon" className="size-7" onClick={() => removeRow(r.key)}>
                                <Trash2 className="size-3 text-destructive" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada komponen. Cari dari inventory atau tambah komponen bebas.</p>
            )}

            {!locked && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari komponen dari inventory…" className="pl-9" />
                  {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                      {results.map((p) => (
                        <button key={p.id} type="button" onClick={() => addProduct(p)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">stok {p.stock} · {formatRupiah(p.sellPrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={addFree}><Plus /> Komponen bebas</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Catatan</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={note} disabled={locked} onChange={(e) => setNote(e.target.value)} placeholder="Catatan penawaran (opsional) — tampil di pesan WhatsApp." rows={2} />
          </CardContent>
        </Card>
      </div>

      {/* Kolom kanan: ringkasan bujet & margin + aksi */}
      <div className="space-y-4">
        <Card className="lg:sticky lg:top-4">
          <CardHeader><CardTitle>Ringkasan & Bujet</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget">Bujet Pelanggan (0 = tanpa batas)</Label>
              <CurrencyInput id="budget" value={budget} disabled={locked} onValueChange={setBudget} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="buildFee">Jasa Rakit</Label>
              <CurrencyInput id="buildFee" value={buildFee} disabled={locked} onValueChange={setBuildFee} />
            </div>

            <div className="space-y-1 border-t pt-3">
              <Line label={`Komponen (${rows.length})`} value={formatRupiah(totals.totalSell)} />
              {totals.fee > 0 && <Line label="Jasa rakit" value={formatRupiah(totals.fee)} />}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total Jual</span><span className="tabular-nums">{formatRupiah(totals.grandSell)}</span>
              </div>
              <Line label="Total modal" value={formatRupiah(totals.totalCost)} muted />
              <div className={cn("flex justify-between font-semibold", marginTone)}>
                <span>Margin ({totals.marginPct.toFixed(1)}%)</span>
                <span className="tabular-nums">{formatRupiah(totals.margin)}</span>
              </div>
            </div>

            {budget > 0 && (
              <div className={cn("rounded-lg border p-3", totals.overBudget ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/30 bg-emerald-500/5")}>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bujet</span>
                  <span className="tabular-nums">{formatRupiah(budget)}</span>
                </div>
                <div className={cn("flex items-center justify-between text-lg font-bold", totals.overBudget ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                  <span>{totals.overBudget ? "Lewat bujet" : "Sisa bujet"}</span>
                  <span className="tabular-nums">{formatRupiah(Math.abs(totals.remaining))}</span>
                </div>
              </div>
            )}

            {!locked && (
              <div className="flex flex-col gap-2 border-t pt-3">
                <Button onClick={() => save()} disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
                </Button>
                <Button variant="outline" onClick={shareWhatsApp} disabled={pending}>
                  <Send /> Kirim penawaran via WhatsApp
                </Button>
              </div>
            )}

            {initial && !isImported && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">Status penawaran</p>
                <div className="flex flex-wrap gap-2">
                  {(["DRAFT", "SENT", "APPROVED", "REJECTED"] as SimStatus[]).map((s) => (
                    <Button key={s} size="sm" variant={s === status ? "default" : "outline"}
                      disabled={pending || s === status} onClick={() => changeStatus(s)}>
                      {STATUS_META[s].label}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" onClick={doImport} disabled={pending || rows.length === 0}>
                  <Download /> Impor ke Rakit PC
                </Button>
                <p className="text-xs text-muted-foreground">
                  Komponen inventory yang stoknya cukup akan dialokasikan (stok dipotong). Komponen bebas / stok kurang jadi baris non-stok.
                </p>
              </div>
            )}

            {isImported && initial?.importedBuildId && (
              <div className="border-t pt-3">
                <Link href={`/pc-build/${initial.importedBuildId}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  <PackageOpen /> Buka rakitan hasil impor
                </Link>
              </div>
            )}

            {msg && <p className="rounded-md bg-muted px-3 py-2 text-sm">{msg}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}
