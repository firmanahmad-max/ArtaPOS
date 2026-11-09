"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, Search, ShieldCheck, Trash2 } from "lucide-react";
import { registerWarrantyAction, claimWarrantyAction, deleteWarrantyAction } from "@/server/warranty/actions";
import type { FormState } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmButton, ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ProductOpt { id: string; name: string; warrantyMonths: number }
interface CustomerOpt { id: string; name: string }

export interface WarrantyFormInitial {
  productId: string | null;
  productName: string;
  serialNumber: string;
  warrantyMonths: number;
  customerId: string | null;
  soldAt: string; // YYYY-MM-DD
  saleNumber: string;
  note: string;
}

const FIELD_ORDER = ["productId", "productName", "serialNumber", "warrantyMonths", "customerId", "soldAt", "saleNumber", "note"];

/**
 * Form daftar / ubah garansi. Scanner barcode USB mengetik SN lalu menekan Enter —
 * di sini Enter HANYA memindah fokus ke kolom berikutnya (tak mengirim form), dan
 * simpan selalu lewat konfirmasi ringkasan agar tak ada unit terdaftar tak sengaja.
 */
export function RegisterWarrantyForm({
  products,
  customers,
  initial,
  action: actionProp,
  submitLabel = "Daftarkan Garansi",
}: {
  products: ProductOpt[];
  customers: CustomerOpt[];
  /** Diisi saat mengubah unit yang sudah terdaftar. */
  initial?: WarrantyFormInitial;
  action?: (prev: FormState, fd: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(actionProp ?? registerWarrantyAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const monthsRef = useRef<HTMLInputElement>(null);
  const [, startTx] = useTransition();
  const [confirm, setConfirm] = useState<{ fd: FormData; rows: [string, string][] } | null>(null);
  const editing = !!initial;

  useEffect(() => {
    if (state?.ok && !editing) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("#serialNumber")?.focus();
      router.refresh();
    }
  }, [state, router, editing]);

  // Isi field via DOM (uncontrolled) saat produk dipilih — tanpa setState.
  const onPickProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      if (nameRef.current) nameRef.current.value = p.name;
      if (monthsRef.current) monthsRef.current.value = String(p.warrantyMonths);
    }
  };

  /** Enter (mis. dari scanner) → pindah ke kolom berikutnya, jangan kirim form. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const t = e.target as HTMLElement;
    if (t.tagName === "BUTTON" || t.tagName === "TEXTAREA") return;
    e.preventDefault();
    const name = (t as HTMLInputElement).name;
    const next = FIELD_ORDER[FIELD_ORDER.indexOf(name) + 1];
    const el = next ? ref.current?.querySelector<HTMLElement>(`[name="${next}"]`) : null;
    el?.focus();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const months = Number(fd.get("warrantyMonths") || 0);
    const cust = customers.find((c) => c.id === fd.get("customerId"))?.name ?? "Umum";
    const sold = String(fd.get("soldAt") || "") || (editing ? "tidak diubah" : "hari ini");
    const rows: [string, string][] = [
      ["Produk", String(fd.get("productName") || "—")],
      ["No. seri", String(fd.get("serialNumber") || "—")],
      ["Garansi", months > 0 ? `${months} bulan` : "Tanpa garansi"],
      ["Pelanggan", cust],
      ["Tanggal jual", sold],
    ];
    if (fd.get("saleNumber")) rows.push(["Invoice", String(fd.get("saleNumber"))]);
    setConfirm({ fd, rows });
  };

  return (
    <>
      <form ref={ref} onSubmit={onSubmit} onKeyDown={onKeyDown} className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="productId">Produk (dari inventory)</Label>
          <Select
            id="productId"
            name="productId"
            defaultValue={initial?.productId ?? ""}
            onChange={(e) => onPickProduct(e.target.value)}
          >
            <option value="">— Pilih / ketik manual —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="productName">Nama Produk *</Label>
          <Input id="productName" name="productName" ref={nameRef} defaultValue={initial?.productName ?? ""} required />
          {state?.errors?.productName && <p className="text-sm text-destructive">{state.errors.productName[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="serialNumber">
            Nomor Seri * <span className="font-normal text-muted-foreground">(bisa di-scan)</span>
          </Label>
          <Input
            id="serialNumber"
            name="serialNumber"
            placeholder="SN-…"
            defaultValue={initial?.serialNumber ?? ""}
            required
            className="font-mono"
          />
          {state?.errors?.serialNumber && <p className="text-sm text-destructive">{state.errors.serialNumber[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="warrantyMonths">Garansi (bulan)</Label>
          <Input
            id="warrantyMonths"
            name="warrantyMonths"
            type="number"
            min="0"
            ref={monthsRef}
            defaultValue={initial?.warrantyMonths ?? 0}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerId">Pelanggan</Label>
          <Select id="customerId" name="customerId" defaultValue={initial?.customerId ?? ""}>
            <option value="">— Umum —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="soldAt">Tanggal Jual</Label>
          <Input id="soldAt" name="soldAt" type="date" defaultValue={initial?.soldAt ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="saleNumber">No. Invoice (opsional)</Label>
          <Input id="saleNumber" name="saleNumber" placeholder="INV-…" defaultValue={initial?.saleNumber ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Catatan</Label>
          <Input id="note" name="note" defaultValue={initial?.note ?? ""} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : editing ? <Save /> : <Plus />} {submitLabel}
          </Button>
          {state?.message && (
            <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
          )}
          {!editing && (
            <span className="text-xs text-muted-foreground">
              Scan SN tidak langsung menyimpan — periksa ringkasan lalu konfirmasi. Salah daftar? Ubah atau hapus di daftar di
              bawah.
            </span>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
        autoFocusConfirm={false}
        title={editing ? "Simpan perubahan garansi?" : "Daftarkan garansi unit ini?"}
        description="Periksa kembali data berikut sebelum disimpan."
        confirmText={editing ? "Ya, simpan" : "Ya, daftarkan"}
        onConfirm={() => {
          const fd = confirm?.fd;
          if (fd) startTx(() => action(fd));
        }}
      >
        <dl className="divide-y rounded-lg border text-sm">
          {confirm?.rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-1.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className={k === "No. seri" ? "font-mono font-semibold" : "text-right font-medium"}>{v}</dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </>
  );
}

/** Hapus unit garansi (mis. salah scan) — dengan konfirmasi. */
export function DeleteWarrantyButton({ id, label, redirectTo }: { id: string; label: string; redirectTo?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      destructive
      disabled={pending}
      title={`Hapus garansi "${label}"?`}
      description="Data unit dan kartu garansi digitalnya (QR) akan dihapus dan tidak bisa dikembalikan."
      confirmText="Ya, hapus"
      aria-label="Hapus"
      onConfirm={() =>
        start(async () => {
          const r = await deleteWarrantyAction(id);
          if (r.ok) {
            toast.success(r.message ?? "Dihapus.");
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          } else toast.error(r.message ?? "Gagal menghapus.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
    </ConfirmButton>
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
