"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { onboardingAction } from "@/server/onboarding/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function FieldError({ msg }: { msg?: string[] }) {
  if (!msg?.length) return null;
  return <p className="text-sm text-destructive">{msg[0]}</p>;
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboardingAction, undefined);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Logo size={52} className="mb-2" />
        <CardTitle className="text-xl">Selamat datang! 👋</CardTitle>
        <CardDescription>
          Setup awal toko Anda. Cukup sekali, lalu langsung bisa dipakai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="storeName">Nama Toko</Label>
            <Input id="storeName" name="storeName" placeholder="Toko Komputer Jaya" required />
            <FieldError msg={state?.errors?.storeName} />
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Akun Pemilik
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ownerName">Nama Lengkap</Label>
                <Input id="ownerName" name="ownerName" placeholder="Budi Santoso" required />
                <FieldError msg={state?.errors?.ownerName} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <Input id="ownerEmail" name="ownerEmail" type="email" placeholder="budi@toko.com" required />
                <FieldError msg={state?.errors?.ownerEmail} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" required />
                <FieldError msg={state?.errors?.password} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Ulangi Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                <FieldError msg={state?.errors?.confirmPassword} />
              </div>
            </div>
          </div>

          {state?.message && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending && <Loader2 className="animate-spin" />}
            Buat Toko & Mulai
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
