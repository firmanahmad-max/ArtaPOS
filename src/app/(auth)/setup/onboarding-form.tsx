"use client";

import { useActionState, useState } from "react";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { onboardingAction } from "@/server/onboarding/actions";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
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

function StepDot({ n, label, state }: { n: number; label: string; state: "done" | "active" | "todo" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-bold",
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "active"
              ? "gradient-brand text-primary-foreground shadow-brand"
              : "bg-muted text-muted-foreground",
        )}
      >
        {state === "done" ? <Check className="size-3.5" /> : n}
      </span>
      <span className={cn("text-sm font-medium", state === "todo" && "text-muted-foreground")}>{label}</span>
    </div>
  );
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboardingAction, undefined);
  const [step, setStep] = useState<1 | 2>(1);
  const [storeName, setStoreName] = useState("");

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
        {/* Indikator progres 2 langkah */}
        <div className="mb-5 flex items-center gap-3">
          <StepDot n={1} label="Toko" state={step === 1 ? "active" : "done"} />
          <div className="h-px flex-1 bg-border" />
          <StepDot n={2} label="Akun Pemilik" state={step === 2 ? "active" : "todo"} />
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="storeName">Nama Toko</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Toko Komputer Jaya"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && storeName.trim()) {
                    e.preventDefault();
                    setStep(2);
                  }
                }}
              />
              <FieldError msg={state?.errors?.storeName} />
            </div>
            <Button type="button" disabled={!storeName.trim()} onClick={() => setStep(2)} className="mt-2">
              Lanjut <ArrowRight />
            </Button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-4">
            {/* Nama toko dari langkah 1 dibawa ke server. */}
            <input type="hidden" name="storeName" value={storeName} />

            {/* Ringkasan langkah 1 (selesai) + Ubah */}
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Nama Toko</p>
                <p className="truncate font-medium">{storeName}</p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="shrink-0 text-sm font-medium text-primary hover:underline">
                Ubah
              </button>
            </div>
            <FieldError msg={state?.errors?.storeName} />

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ownerName">Nama Lengkap</Label>
                <Input id="ownerName" name="ownerName" placeholder="Budi Santoso" required autoFocus />
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
        )}
      </CardContent>
    </Card>
  );
}
