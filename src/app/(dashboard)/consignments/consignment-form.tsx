"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { createConsignmentAction } from "@/server/consignment/actions";
import { formatRupiah } from "@/lib/utils";
import { splitConsignment, type CommissionType } from "@/lib/consignment-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONSIGNMENT_CATEGORIES } from "./status-config";

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface Row {
  key: string;
  category: string;
  name: string;
  serialNumber: string;
  condition: string;
  askingPrice: number;
}

const blankRow = (key: string): Row => ({ key, category: "", name: "", serialNumber: "", condition: "", askingPrice: 0 });

export function ConsignmentForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  // Komisi toko — berlaku untuk semua barang di titipan ini (bisa diubah per barang di detail).
  const [commissionType, setCommissionType] = useState<CommissionType>("PERCENT");
  const [commissionValue, setCommissionValue] = useState(10);
  // Key baris: baris awal statis; baris baru dari ref di event handler (bukan saat render).
  const seq = useRef(1);
  const [rows, setRows] = useState<Row[]>([blankRow("r0")]);

  const total = rows.reduce((s, r) => s + (r.askingPrice || 0), 0);

  function onLink(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone ?? "");
    }
  }

  function patchRow(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function addRow() {
    const key = `r${seq.current++}`;
    setRows((rs) => [...rs, blankRow(key)]);
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await createConsignmentAction({
        customerId: customerId || null,
        customerName,
        customerPhone,
        note,
        items: rows.map((r) => ({
          category: r.category,
          name: r.name,
          serialNumber: r.serialNumber,
          condition: r.condition,
          askingPrice: r.askingPrice,
          commissionType,
          commissionValue,
        })),
      });
      if (r.ok) {
        toast.success("Titipan tersimpan");
        router.push(`/consignments/${r.id}/nota`);
      } else {
        setError(r.message ?? "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Pemilik Barang</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="cs-customer">Tautkan pelanggan terdaftar (opsional)</Label>
            <Select id="cs-customer" value={customerId} onChange={(e) => onLink(e.target.value)}>
              <option value="">— Tidak ditautkan —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cs-name">Nama Pemilik *</Label>
            <Input id="cs-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama" maxLength={100} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cs-phone">No. WhatsApp</Label>
            <Input id="cs-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08…" maxLength={30} inputMode="tel" />
            <p className="text-xs text-muted-foreground">Dipakai untuk mengirim tanda titip jual.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Komisi Toko</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-ctype">Jenis komisi</Label>
              <Select
                id="cs-ctype"
                value={commissionType}
                onChange={(e) => {
                  const t = e.target.value as CommissionType;
                  setCommissionType(t);
                  setCommissionValue(t === "PERCENT" ? 10 : 50_000);
                }}
                className="w-48"
              >
                <option value="PERCENT">Persen dari harga laku</option>
                <option value="FIXED">Nominal tetap per barang</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-cval">{commissionType === "PERCENT" ? "Persen (%)" : "Nominal"}</Label>
              {commissionType === "PERCENT" ? (
                <Input
                  id="cs-cval"
                  inputMode="numeric"
                  className="w-28"
                  value={String(commissionValue)}
                  onChange={(e) => setCommissionValue(Math.min(100, Number(e.target.value.replace(/[^0-9]/g, "")) || 0))}
                />
              ) : (
                <CurrencyInput id="cs-cval" className="w-40" value={commissionValue} onValueChange={setCommissionValue} />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Berlaku untuk semua barang di bawah. Saat laku di kasir, komisi jadi pendapatan toko dan sisanya tercatat sebagai
            hak pemilik. Bisa diubah per barang di halaman detail selama belum laku.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Barang yang Dititipkan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <datalist id="cs-categories">
            {CONSIGNMENT_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
          {rows.map((r, i) => (
            <div key={r.key} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Barang {i + 1}</span>
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(r.key)} aria-label={`Hapus barang ${i + 1}`}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`cs-cat-${r.key}`}>Jenis komponen *</Label>
                  <Input id={`cs-cat-${r.key}`} list="cs-categories" value={r.category} onChange={(e) => patchRow(r.key, { category: e.target.value })} placeholder="mis. VGA" maxLength={40} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`cs-nm-${r.key}`}>Merk / tipe *</Label>
                  <Input id={`cs-nm-${r.key}`} value={r.name} onChange={(e) => patchRow(r.key, { name: e.target.value })} placeholder="mis. MSI RTX 3060 Ventus 2X 12GB" maxLength={120} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`cs-sn-${r.key}`}>No. seri (opsional)</Label>
                  <Input id={`cs-sn-${r.key}`} value={r.serialNumber} onChange={(e) => patchRow(r.key, { serialNumber: e.target.value })} placeholder="Bukti identitas barang" maxLength={60} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`cs-pr-${r.key}`}>Harga jual diinginkan *</Label>
                  <CurrencyInput id={`cs-pr-${r.key}`} value={r.askingPrice} onValueChange={(v) => patchRow(r.key, { askingPrice: v })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`cs-cond-${r.key}`}>Keterangan kondisi</Label>
                <Textarea id={`cs-cond-${r.key}`} rows={2} value={r.condition} onChange={(e) => patchRow(r.key, { condition: e.target.value })} placeholder="mis. Normal, pemakaian 1 tahun, garansi resmi s/d Mar 2027, fullset box" maxLength={300} />
              </div>
              {r.askingPrice > 0 && (() => {
                const s = splitConsignment(r.askingPrice, commissionType, commissionValue);
                return (
                  <p className="text-xs text-muted-foreground">
                    Bila laku {formatRupiah(r.askingPrice)}: komisi toko{" "}
                    <span className="font-mono">{formatRupiah(s.commission)}</span> · hak pemilik{" "}
                    <span className="font-mono font-medium text-foreground">{formatRupiah(s.ownerShare)}</span>
                  </p>
                );
              })()}
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= 50}>
            <Plus /> Tambah barang
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Catatan</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional — mis. harga boleh nego, hubungi pemilik dulu" maxLength={500} />
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="text-muted-foreground">{rows.length} barang · Total harga diinginkan </span>
          <span className="font-mono font-bold tabular-nums">{formatRupiah(total)}</span>
        </p>
        <Button onClick={submit} disabled={pending} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan &amp; Buat Tanda Titip
        </Button>
      </div>
    </div>
  );
}
