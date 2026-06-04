"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateSettingsAction, updateLicenseAction } from "@/server/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function useRefreshOnOk(ok?: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.refresh();
  }, [ok, router]);
}

export function StoreSettingsForm({
  name,
  address,
  phone,
  receiptFooter,
}: {
  name: string;
  address: string | null;
  phone: string | null;
  receiptFooter: string | null;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, undefined);
  useRefreshOnOk(state?.ok);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nama Toko</Label>
          <Input id="name" name="name" defaultValue={name} required />
          {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">No. Telepon/HP (struk)</Label>
          <Input id="phone" name="phone" defaultValue={phone ?? ""} placeholder="mis. 0812-3456-7890" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Alamat Toko (struk)</Label>
        <Input id="address" name="address" defaultValue={address ?? ""} placeholder="mis. Jl. Merdeka No. 10, Bandung" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="receiptFooter">Catatan Kaki Struk</Label>
        <Input
          id="receiptFooter"
          name="receiptFooter"
          defaultValue={receiptFooter ?? ""}
          placeholder="mis. Terima kasih · Barang tidak bisa ditukar"
        />
        <p className="text-xs text-muted-foreground">
          Tampil di bagian bawah struk. Kosongkan untuk pakai teks bawaan.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function LicenseForm({
  plan,
  status,
  maxTransactions,
  validUntil,
}: {
  plan: string;
  status: string;
  maxTransactions: number | null;
  validUntil: string | null;
}) {
  const [state, action, pending] = useActionState(updateLicenseAction, undefined);
  useRefreshOnOk(state?.ok);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="plan">Paket</Label>
        <Select id="plan" name="plan" defaultValue={plan} className="h-10">
          <option value="DEMO_DAILY">Demo Harian</option>
          <option value="DEMO_MONTHLY">Demo Bulanan</option>
          <option value="DEMO_TRANSACTIONS">Demo (batas transaksi)</option>
          <option value="UNLIMITED">Unlimited</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={status} className="h-10">
          <option value="ACTIVE">Aktif</option>
          <option value="EXPIRED">Kedaluwarsa</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="maxTransactions">Batas Transaksi (untuk Demo batas transaksi)</Label>
        <Input id="maxTransactions" name="maxTransactions" type="number" min="0" defaultValue={maxTransactions ?? ""} placeholder="kosong = tak dibatasi" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="validUntil">Berlaku Sampai (untuk demo harian/bulanan)</Label>
        <Input id="validUntil" name="validUntil" type="date" defaultValue={validUntil ?? ""} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Lisensi
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
