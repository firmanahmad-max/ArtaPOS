"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, ShieldCheck } from "lucide-react";
import { registerWarrantyAction, claimWarrantyAction } from "@/server/warranty/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface ProductOpt { id: string; name: string; warrantyMonths: number }
interface CustomerOpt { id: string; name: string }

export function RegisterWarrantyForm({
  products,
  customers,
}: {
  products: ProductOpt[];
  customers: CustomerOpt[];
}) {
  const [state, action, pending] = useActionState(registerWarrantyAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const monthsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  // Isi field via DOM (uncontrolled) saat produk dipilih — tanpa setState.
  const onPickProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      if (nameRef.current) nameRef.current.value = p.name;
      if (monthsRef.current) monthsRef.current.value = String(p.warrantyMonths);
    }
  };

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="productId">Produk (dari inventory)</Label>
        <Select id="productId" name="productId" defaultValue="" onChange={(e) => onPickProduct(e.target.value)}>
          <option value="">— Pilih / ketik manual —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="productName">Nama Produk *</Label>
        <Input id="productName" name="productName" ref={nameRef} defaultValue="" required />
        {state?.errors?.productName && <p className="text-sm text-destructive">{state.errors.productName[0]}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="serialNumber">Nomor Seri *</Label>
        <Input id="serialNumber" name="serialNumber" placeholder="SN-…" required />
        {state?.errors?.serialNumber && <p className="text-sm text-destructive">{state.errors.serialNumber[0]}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="warrantyMonths">Garansi (bulan)</Label>
        <Input id="warrantyMonths" name="warrantyMonths" type="number" min="0" ref={monthsRef} defaultValue={0} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Pelanggan</Label>
        <Select id="customerId" name="customerId" defaultValue="">
          <option value="">— Umum —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="soldAt">Tanggal Jual</Label>
        <Input id="soldAt" name="soldAt" type="date" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="saleNumber">No. Invoice (opsional)</Label>
        <Input id="saleNumber" name="saleNumber" placeholder="INV-…" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Catatan</Label>
        <Input id="note" name="note" />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Daftarkan Garansi
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function WarrantySearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    startTransition(() => router.push(`/warranty?${next.toString()}`));
  };

  return (
    <form onSubmit={submit} className="relative flex-1 sm:max-w-md">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Cari no. seri / produk / pelanggan / invoice…" className="pl-9" />
      {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
    </form>
  );
}

export function ClaimButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        const note = prompt("Catatan klaim garansi (mis. kerusakan):");
        if (note === null) return;
        start(async () => {
          await claimWarrantyAction(id, note);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Klaim
    </Button>
  );
}
