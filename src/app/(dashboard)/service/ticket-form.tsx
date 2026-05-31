"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createTicketAction } from "@/server/service-jobs/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Option { id: string; name: string }

function Err({ msg }: { msg?: string[] }) {
  return msg?.length ? <p className="text-sm text-destructive">{msg[0]}</p> : null;
}

export function TicketForm({
  customers,
  technicians,
}: {
  customers: Option[];
  technicians: Option[];
}) {
  const [state, action, pending] = useActionState(createTicketAction, undefined);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Pelanggan</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerName">Nama Pelanggan *</Label>
            <Input id="customerName" name="customerName" placeholder="Nama" required />
            <Err msg={state?.errors?.customerName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerPhone">No. Telepon</Label>
            <Input id="customerPhone" name="customerPhone" placeholder="08…" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="customerId">Tautkan pelanggan terdaftar (opsional)</Label>
            <Select id="customerId" name="customerId" defaultValue="">
              <option value="">— Tidak ditautkan —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
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

      {state?.message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
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
