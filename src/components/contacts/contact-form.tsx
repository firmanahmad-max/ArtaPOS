"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/lib/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export interface ContactValues {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export function ContactForm({
  action,
  initial,
  backHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: ContactValues;
  backHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Nama *</Label>
            <Input id="name" name="name" defaultValue={initial.name} required />
            {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">No. Telepon</Label>
            <Input id="phone" name="phone" defaultValue={initial.phone} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={initial.email} />
            {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea id="address" name="address" defaultValue={initial.address} />
          </div>
          {state?.message && !state.ok && (
            <p className="sm:col-span-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Simpan Perubahan
            </Button>
            <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
              Batal
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
