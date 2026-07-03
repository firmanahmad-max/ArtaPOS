"use client";

import { useActionState, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { createRmaAction } from "@/server/rma/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option { id: string; name: string }

function Err({ msg }: { msg?: string[] }) {
  return msg?.length ? <p className="text-sm text-destructive">{msg[0]}</p> : null;
}

/** Tanggal lokal browser dalam format yyyy-mm-dd (untuk input type=date). */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RmaForm({ products, suppliers }: { products: Option[]; suppliers: Option[] }) {
  const [state, action, pending] = useActionState(createRmaAction, undefined);
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");

  function onPickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setProductName(p.name);
  }
  function onPickSupplier(id: string) {
    setSupplierId(id);
    const s = suppliers.find((x) => x.id === id);
    if (s) setSupplierName(s.name);
  }

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Produk yang Diklaim</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="productId">Pilih dari katalog (opsional)</Label>
            <Select id="productId" name="productId" value={productId} onChange={(e) => onPickProduct(e.target.value)}>
              <option value="">— Tidak ditautkan —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Memilih produk akan mengisi nama produk otomatis (tetap bisa diedit).</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="productName">Nama Produk *</Label>
            <Input id="productName" name="productName" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="mis. SSD NVMe 1TB" required />
            <Err msg={state?.errors?.productName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="serialNumber">Nomor Seri (SN)</Label>
            <Input id="serialNumber" name="serialNumber" placeholder="SN unit yang dikirim" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="complaint">Kerusakan / Keluhan *</Label>
            <Textarea id="complaint" name="complaint" rows={3} placeholder="mis. Tidak terdeteksi BIOS, bad sector, mati total…" required />
            <Err msg={state?.errors?.complaint} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pengiriman ke Distributor</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="supplierId">Pilih supplier terdaftar (opsional)</Label>
            <Select id="supplierId" name="supplierId" value={supplierId} onChange={(e) => onPickSupplier(e.target.value)}>
              <option value="">— Tidak ditautkan —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="supplierName">Distributor / Supplier *</Label>
            <Input id="supplierName" name="supplierName" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Tujuan klaim garansi" required />
            <Err msg={state?.errors?.supplierName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sentAt">Tanggal Dikirim</Label>
            <Input id="sentAt" name="sentAt" type="date" defaultValue={todayLocal()} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trackingNumber">No. Resi Pengiriman</Label>
            <Input id="trackingNumber" name="trackingNumber" placeholder="Opsional" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="note">Catatan</Label>
            <Textarea id="note" name="note" rows={2} placeholder="mis. kelengkapan yang ikut dikirim (dus, kabel)…" />
          </div>
        </CardContent>
      </Card>

      {state?.message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Simpan Klaim
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Setelah tersimpan Anda bisa menambahkan foto kondisi produk saat dikirim di halaman detail.
      </p>
    </form>
  );
}
