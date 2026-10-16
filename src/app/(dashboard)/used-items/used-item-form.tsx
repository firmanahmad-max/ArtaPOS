"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { saveUsedItemAction } from "@/server/used-items/actions";
import { USED_GRADES, USED_SOURCES, usedMargin, type UsedGrade, type UsedSource } from "@/lib/used-item";
import { formatRupiah, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USED_CATEGORIES } from "./status-config";

export interface UsedItemFormValues {
  category: string;
  name: string;
  serialNumber: string;
  grade: UsedGrade;
  condition: string;
  completeness: string;
  specs: string;
  costPrice: number;
  sellPrice: number;
  warrantyDays: number;
  source: UsedSource;
  sourceName: string;
  sourcePhone: string;
  /** "YYYY-MM-DD" */
  acquiredAt: string;
  note: string;
}

export const EMPTY_USED_ITEM: UsedItemFormValues = {
  category: "",
  name: "",
  serialNumber: "",
  grade: "GOOD",
  condition: "",
  completeness: "",
  specs: "",
  costPrice: 0,
  sellPrice: 0,
  warrantyDays: 0,
  source: "BUY",
  sourceName: "",
  sourcePhone: "",
  acquiredAt: "",
  note: "",
};

const WARRANTY_PRESETS = [
  { days: 0, label: "Tanpa" },
  { days: 7, label: "7 hari" },
  { days: 30, label: "1 bulan" },
  { days: 90, label: "3 bulan" },
];

export function UsedItemForm({
  id,
  initial,
  priceLocked = false,
}: {
  /** null = barang baru. */
  id: string | null;
  initial: UsedItemFormValues;
  /** Barang sudah terjual/ditarik → harga tak bisa diubah. */
  priceLocked?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState<UsedItemFormValues>(initial);
  const set = (p: Partial<UsedItemFormValues>) => setV((cur) => ({ ...cur, ...p }));
  const m = usedMargin(v.costPrice, v.sellPrice);

  function submit() {
    setError(null);
    start(async () => {
      const r = await saveUsedItemAction(id, { ...v, acquiredAt: v.acquiredAt || null });
      if (r.ok) {
        toast.success(id ? "Barang bekas diperbarui" : "Barang bekas tersimpan");
        router.push(`/used-items/${r.id}`);
        router.refresh();
      } else setError(r.message ?? "Gagal menyimpan.");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Identitas Barang</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <datalist id="used-categories">
            {USED_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-cat">Jenis barang *</Label>
              <Input id="u-cat" list="used-categories" value={v.category} onChange={(e) => set({ category: e.target.value })} placeholder="mis. Laptop" maxLength={40} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-name">Nama / merk-tipe *</Label>
              <Input id="u-name" value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Lenovo ThinkPad T480 i5-8350U" maxLength={120} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-sn">No. seri (opsional)</Label>
              <Input id="u-sn" value={v.serialNumber} onChange={(e) => set({ serialNumber: e.target.value })} placeholder="Bisa di-scan di kasir" maxLength={60} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-specs">Spesifikasi ringkas</Label>
              <Input id="u-specs" value={v.specs} onChange={(e) => set({ specs: e.target.value })} placeholder="mis. RAM 8GB, SSD 256GB, layar 14&quot; FHD" maxLength={1000} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kondisi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Grade kondisi *</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Grade kondisi">
              {USED_GRADES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={v.grade === g.value}
                  onClick={() => set({ grade: g.value })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    v.grade === g.value ? "border-primary bg-primary/10" : "hover:border-primary/50",
                  )}
                >
                  <span className="font-mono text-lg font-bold">{g.code}</span>{" "}
                  <span className="text-sm font-semibold">{g.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{g.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-cond">Keterangan kondisi / minus</Label>
            <Textarea id="u-cond" rows={2} value={v.condition} onChange={(e) => set({ condition: e.target.value })} placeholder="mis. Baterai health 82%, lecet halus di palmrest, engsel normal" maxLength={500} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-comp">Kelengkapan</Label>
            <Input id="u-comp" value={v.completeness} onChange={(e) => set({ completeness: e.target.value })} placeholder="mis. Unit + charger ori, tanpa dus" maxLength={200} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Harga &amp; Garansi</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-cost">Harga beli / modal</Label>
              <CurrencyInput id="u-cost" value={v.costPrice} onValueChange={(n) => set({ costPrice: n })} disabled={priceLocked} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-sell">Harga jual *</Label>
              <CurrencyInput id="u-sell" value={v.sellPrice} onValueChange={(n) => set({ sellPrice: n })} disabled={priceLocked} />
            </div>
          </div>
          {priceLocked ? (
            <p className="text-xs text-muted-foreground">Harga terkunci karena barang sudah terjual/ditarik.</p>
          ) : (
            v.sellPrice > 0 && (
              <p className={cn("text-sm", m.margin < 0 ? "text-destructive" : "text-muted-foreground")}>
                Margin <span className="font-mono font-semibold">{formatRupiah(m.margin)}</span>
                {m.pct !== null && <> ({m.pct}%)</>}
                {m.margin < 0 && " — harga jual di bawah modal"}
              </p>
            )
          )}
          <div className="space-y-1.5">
            <Label htmlFor="u-war">Garansi toko</Label>
            <div className="flex flex-wrap items-center gap-2">
              {WARRANTY_PRESETS.map((w) => (
                <button
                  key={w.days}
                  type="button"
                  onClick={() => set({ warrantyDays: w.days })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    v.warrantyDays === w.days ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {w.label}
                </button>
              ))}
              <Input
                id="u-war"
                inputMode="numeric"
                className="h-8 w-20"
                value={String(v.warrantyDays)}
                onChange={(e) => set({ warrantyDays: Math.min(3650, Number(e.target.value.replace(/[^0-9]/g, "")) || 0) })}
                aria-label="Garansi (hari)"
              />
              <span className="text-xs text-muted-foreground">hari</span>
            </div>
            <p className="text-xs text-muted-foreground">Tercetak di struk penjualan sebagai bukti garansi bagi pembeli.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Asal Barang</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-src">Diperoleh dari</Label>
            <Select id="u-src" value={v.source} onChange={(e) => set({ source: e.target.value as UsedSource })}>
              {USED_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-acq">Tanggal masuk</Label>
            <Input id="u-acq" type="date" value={v.acquiredAt} onChange={(e) => set({ acquiredAt: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-sname">Nama penjual/sumber</Label>
            <Input id="u-sname" value={v.sourceName} onChange={(e) => set({ sourceName: e.target.value })} placeholder="Opsional" maxLength={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-sphone">No. HP sumber</Label>
            <Input id="u-sphone" value={v.sourcePhone} onChange={(e) => set({ sourcePhone: e.target.value })} placeholder="Opsional" maxLength={30} inputMode="tel" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="u-note">Catatan internal</Label>
            <Textarea id="u-note" rows={2} value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="Tidak tampil ke pelanggan — mis. sudah diganti thermal paste, harga boleh nego s/d 3,4 jt" maxLength={500} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} {id ? "Simpan Perubahan" : "Simpan Barang Bekas"}
        </Button>
      </div>
    </div>
  );
}
