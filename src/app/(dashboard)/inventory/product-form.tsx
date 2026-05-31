"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/barcode/barcode-scanner";

export interface Option {
  id: string;
  name: string;
}

export interface ProductFormValues {
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  unitId: string;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  warrantyMonths: number;
  stock?: number;
}

function FieldError({ msg }: { msg?: string[] }) {
  if (!msg?.length) return null;
  return <p className="text-sm text-destructive">{msg[0]}</p>;
}

export function ProductForm({
  action,
  categories,
  units,
  initial,
  mode,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  categories: Option[];
  units: Option[];
  initial?: ProductFormValues;
  mode: "create" | "edit";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Produk</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Nama Produk *</Label>
            <Input id="name" name="name" defaultValue={initial?.name} placeholder="SSD NVMe 1TB" required />
            <FieldError msg={state?.errors?.name} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">SKU / Kode *</Label>
            <Input id="sku" name="sku" defaultValue={initial?.sku} placeholder="SSD-NVME-1TB" required />
            <FieldError msg={state?.errors?.sku} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="barcode">Barcode</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                name="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan atau ketik"
              />
              <BarcodeScanner onDetected={(t) => setBarcode(t)} />
            </div>
            <FieldError msg={state?.errors?.barcode} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoryId">Kategori</Label>
            <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""}>
              <option value="">— Tanpa kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unitId">Satuan</Label>
            <Select id="unitId" name="unitId" defaultValue={initial?.unitId ?? ""}>
              <option value="">— Tanpa satuan —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Harga & Stok</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="costPrice">Harga Modal (Rp)</Label>
            <Input id="costPrice" name="costPrice" type="number" min="0" defaultValue={initial?.costPrice ?? 0} />
            <FieldError msg={state?.errors?.costPrice} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sellPrice">Harga Jual (Rp)</Label>
            <Input id="sellPrice" name="sellPrice" type="number" min="0" defaultValue={initial?.sellPrice ?? 0} />
            <FieldError msg={state?.errors?.sellPrice} />
          </div>

          {mode === "create" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="initialStock">Stok Awal</Label>
              <Input id="initialStock" name="initialStock" type="number" min="0" defaultValue={0} />
              <FieldError msg={state?.errors?.initialStock} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Stok Saat Ini</Label>
              <Input value={initial?.stock ?? 0} disabled />
              <p className="text-xs text-muted-foreground">
                Ubah stok lewat menu &quot;Sesuaikan Stok&quot;.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="minStock">Stok Minimum (alert)</Label>
            <Input id="minStock" name="minStock" type="number" min="0" defaultValue={initial?.minStock ?? 0} />
            <FieldError msg={state?.errors?.minStock} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="warrantyMonths">Garansi (bulan)</Label>
            <Input id="warrantyMonths" name="warrantyMonths" type="number" min="0" defaultValue={initial?.warrantyMonths ?? 0} />
            <p className="text-xs text-muted-foreground">Default masa garansi saat barang dijual (0 = tanpa garansi).</p>
            <FieldError msg={state?.errors?.warrantyMonths} />
          </div>
        </CardContent>
      </Card>

      {state?.message && !state.ok && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {mode === "create" ? "Simpan Produk" : "Simpan Perubahan"}
        </Button>
        <Link href="/inventory" className={buttonVariants({ variant: "outline" })}>
          Batal
        </Link>
      </div>
    </form>
  );
}
