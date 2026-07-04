"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Ticket, Trash2, Power, Copy, Check } from "lucide-react";
import {
  createPromoCodeAction,
  setPromoActiveAction,
  deletePromoCodeAction,
} from "@/server/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LICENSE_PLANS } from "@/lib/validations/platform";
import { cn } from "@/lib/utils";

interface Promo {
  id: string;
  code: string;
  plan: string;
  durationDays: number | null;
  maxTransactions: number | null;
  maxRedemptions: number | null;
  redemptionsUsed: number;
  expiresAt: string | null;
  isActive: boolean;
  note: string | null;
  redemptions: number;
}

const PLAN_LABEL: Record<string, string> = {
  DEMO_DAILY: "Demo Harian",
  DEMO_MONTHLY: "Demo Bulanan",
  DEMO_TRANSACTIONS: "Demo (batas transaksi)",
  UNLIMITED: "Unlimited",
};

function randomCode() {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "ARTA-";
  for (let i = 0; i < 6; i++) out += s[Math.floor(Math.random() * s.length)];
  return out;
}

export function PromoClient({ codes }: { codes: Promo[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createPromoCodeAction, undefined);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (codeRef.current) codeRef.current.value = ""; // mutasi DOM (uncontrolled), bukan setState
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-5" /> Buat Kode Baru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Kode *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  name="code"
                  ref={codeRef}
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                  placeholder="ARTA-XXXXXX"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (codeRef.current) codeRef.current.value = randomCode();
                  }}
                >
                  Acak
                </Button>
              </div>
              {state?.errors?.code && <p className="text-sm text-destructive">{state.errors.code[0]}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan">Paket yang Diberikan *</Label>
              <Select id="plan" name="plan" defaultValue="UNLIMITED">
                {LICENSE_PLANS.map((p) => <option key={p} value={p}>{PLAN_LABEL[p] ?? p}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="durationDays">Masa Berlaku (hari)</Label>
              <Input id="durationDays" name="durationDays" type="number" min={1} placeholder="Kosong = tanpa kedaluwarsa" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxTransactions">Batas Transaksi</Label>
              <Input id="maxTransactions" name="maxTransactions" type="number" min={1} placeholder="Untuk paket Demo transaksi" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxRedemptions">Kuota Penukaran</Label>
              <Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} placeholder="Kosong = tak terbatas" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="expiresAt">Kode Kedaluwarsa</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" name="note" placeholder="mis. Promo pameran, distributor A…" />
            </div>
            {state?.message && <p className="text-sm text-destructive sm:col-span-2">{state.message}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Ticket />} Buat Kode
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Daftar Kode ({codes.length})</h2>
        {codes.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada kode.</Card>
        ) : (
          codes.map((c) => <PromoRow key={c.id} promo={c} />)
        )}
      </div>
    </div>
  );
}

function PromoRow({ promo }: { promo: Promo }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const quota =
    promo.maxRedemptions != null ? `${promo.redemptionsUsed}/${promo.maxRedemptions}` : `${promo.redemptionsUsed}×`;

  const copy = () => {
    navigator.clipboard?.writeText(promo.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else alert(r.message ?? "Gagal.");
    });
  };

  return (
    <Card className={cn("p-4", !promo.isActive && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-sm font-semibold hover:bg-accent" title="Salin kode">
              {promo.code} {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
            </button>
            <Badge variant={promo.isActive ? "success" : "muted"}>{promo.isActive ? "Aktif" : "Nonaktif"}</Badge>
            <Badge variant="secondary">{PLAN_LABEL[promo.plan] ?? promo.plan}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {promo.durationDays != null ? `${promo.durationDays} hari` : "Tanpa kedaluwarsa"}
            {promo.maxTransactions != null ? ` · ${promo.maxTransactions} transaksi` : ""}
            {` · Ditukar ${quota}`}
            {promo.expiresAt ? ` · kode kedaluwarsa ${new Date(promo.expiresAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}` : ""}
            {promo.note ? ` · ${promo.note}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setPromoActiveAction(promo.id, !promo.isActive))}>
            <Power /> {promo.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            className="text-destructive"
            title="Hapus kode"
            onClick={() => {
              if (!confirm(`Hapus kode ${promo.code}? Riwayat penukaran ikut terhapus.`)) return;
              run(() => deletePromoCodeAction(promo.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </Card>
  );
}
