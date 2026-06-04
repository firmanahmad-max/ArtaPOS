"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, ImagePlus, Trash2 } from "lucide-react";
import { updateSettingsAction, updateLicenseAction, updateStoreLogoAction } from "@/server/admin/actions";
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

/** Resize logo di browser → PNG data URL (maks 240px, latar putih). */
function fileToLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const max = 240;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas tidak didukung"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function StoreLogoForm({ logo }: { logo: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<string | null>(logo);

  const onFile = async (file: File) => {
    let dataUrl: string;
    try {
      dataUrl = await fileToLogoDataUrl(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses gambar.");
      return;
    }
    start(async () => {
      const r = await updateStoreLogoAction(dataUrl);
      if (r.ok) {
        setCurrent(dataUrl);
        toast.success("Logo toko diperbarui");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal mengunggah logo.");
      }
    });
  };

  const onRemove = () =>
    start(async () => {
      const r = await updateStoreLogoAction(null);
      if (r.ok) {
        setCurrent(null);
        toast.success("Logo toko dihapus");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal menghapus logo.");
      }
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Logo toko" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Logo tampil di bagian atas struk (cetak & Bluetooth). PNG/JPG, maks ~350KB.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />} {current ? "Ganti Logo" : "Unggah Logo"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
              <Trash2 className="text-destructive" /> Hapus
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
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
