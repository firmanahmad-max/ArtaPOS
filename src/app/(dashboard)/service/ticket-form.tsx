"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTicketAction } from "@/server/service-jobs/actions";
import { queueOfflineOp } from "@/lib/offline/enqueue";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option { id: string; name: string }
interface CustomerOption { id: string; name: string; phone: string | null }

function Err({ msg }: { msg?: string[] }) {
  return msg?.length ? <p className="text-sm text-destructive">{msg[0]}</p> : null;
}

export function TicketForm({
  customers,
  technicians,
}: {
  customers: CustomerOption[];
  technicians: Option[];
}) {
  const [state, action, pending] = useActionState(createTicketAction, undefined);
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [offlineErr, setOfflineErr] = useState<string | null>(null);

  // Saat OFFLINE, cegah submit ke server → antre ke outbox (disinkron nanti).
  // Validasi wajib (nama/perangkat/keluhan) sudah dijaga atribut `required`.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (typeof navigator === "undefined" || navigator.onLine) return; // online: biarkan action jalan
    e.preventDefault();
    setOfflineErr(null);
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    const laborCost = Number(fd.get("laborCost") ?? 0) || 0;
    const deviceType = str("deviceType") ?? "";
    const payload = {
      customerId: str("customerId"),
      customerName: str("customerName") ?? "",
      customerPhone: str("customerPhone"),
      deviceType,
      deviceBrand: str("deviceBrand"),
      deviceInfo: str("deviceInfo"),
      accessories: str("accessories"),
      complaint: str("complaint") ?? "",
      technicianId: str("technicianId"),
      laborCost,
      note: str("note"),
    };
    void queueOfflineOp("service", payload, {
      itemCount: 1,
      total: laborCost,
      label: `Servis ${deviceType} · ${payload.customerName}`,
    })
      .then(() => {
        toast.success("Tiket servis tersimpan offline", {
          description: "Akan disinkronkan otomatis saat online (nomor tiket final menyusul).",
        });
        router.push("/service");
      })
      .catch((err) => setOfflineErr(err instanceof Error ? err.message : "Gagal menyimpan offline."));
  }

  // Tautkan pelanggan terdaftar → isi otomatis nama & HP (tetap bisa diedit).
  function onLink(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      if (c.phone) setCustomerPhone(c.phone);
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Pelanggan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="customerId">Tautkan pelanggan terdaftar (opsional)</Label>
            <Select id="customerId" name="customerId" value={customerId} onChange={(e) => onLink(e.target.value)}>
              <option value="">— Tidak ditautkan —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Memilih pelanggan akan mengisi nama & nomor HP di bawah otomatis.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerName">Nama Pelanggan *</Label>
            <Input id="customerName" name="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama" required />
            <Err msg={state?.errors?.customerName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerPhone">No. Telepon</Label>
            <Input id="customerPhone" name="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="08…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Perangkat & Keluhan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="deviceType">Jenis Perangkat *</Label>
            <Input id="deviceType" name="deviceType" placeholder="Laptop / PC / Printer" required />
            <Err msg={state?.errors?.deviceType} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deviceBrand">Merk</Label>
            <Input id="deviceBrand" name="deviceBrand" placeholder="Asus / HP / dll" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="deviceInfo">Model / No. Seri</Label>
            <Input id="deviceInfo" name="deviceInfo" placeholder="opsional" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="accessories">Kelengkapan Unit Diterima</Label>
            <Textarea id="accessories" name="accessories" placeholder="mis. Charger, tas, baterai, kabel, dus — untuk dicatat saat serah terima" />
            <p className="text-xs text-muted-foreground">Catat aksesori/kelengkapan yang ikut diserahkan pelanggan. Muncul di nota sebagai bukti serah terima.</p>
            <Err msg={state?.errors?.accessories} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="complaint">Keluhan *</Label>
            <Textarea id="complaint" name="complaint" placeholder="Jelaskan kerusakan…" required />
            <Err msg={state?.errors?.complaint} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Penugasan & Biaya</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="technicianId">Teknisi</Label>
            <Select id="technicianId" name="technicianId" defaultValue="">
              <option value="">— Belum ditugaskan —</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="laborCost">Estimasi Biaya Jasa (Rp)</Label>
            <Input id="laborCost" name="laborCost" type="number" min="0" defaultValue={0} />
          </div>
        </CardContent>
      </Card>

      {(state?.message || offlineErr) && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{offlineErr ?? state?.message}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Buat Tiket
        </Button>
        <Link href="/service" className={buttonVariants({ variant: "outline" })}>Batal</Link>
      </div>
    </form>
  );
}
