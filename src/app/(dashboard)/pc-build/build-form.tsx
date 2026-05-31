"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createBuildAction } from "@/server/pcbuild/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface Option { id: string; name: string }

export function BuildForm({ customers }: { customers: Option[] }) {
  const [state, action, pending] = useActionState(createBuildAction, undefined);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Nama Rakitan *</Label>
            <Input id="name" name="name" placeholder="mis. PC Gaming Budi" required />
            {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerName">Nama Pelanggan</Label>
            <Input id="customerName" name="customerName" placeholder="opsional" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerId">Tautkan pelanggan terdaftar</Label>
            <Select id="customerId" name="customerId" defaultValue="">
              <option value="">— Tidak ditautkan —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="buildFee">Biaya Rakit (Rp)</Label>
            <Input id="buildFee" name="buildFee" type="number" min="0" defaultValue={0} />
          </div>
        </CardContent>
      </Card>

      {state?.message && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.message}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Buat Rakitan
        </Button>
        <Link href="/pc-build" className={buttonVariants({ variant: "outline" })}>Batal</Link>
      </div>
    </form>
  );
}
