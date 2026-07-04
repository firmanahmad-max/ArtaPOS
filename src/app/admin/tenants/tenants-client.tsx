"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RotateCcw, Power, ChevronDown, Search } from "lucide-react";
import {
  updateTenantLicenseAction,
  setTenantActiveAction,
  resetLicenseUsageAction,
} from "@/server/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LICENSE_PLANS, LICENSE_STATUSES } from "@/lib/validations/platform";
import { cn } from "@/lib/utils";

interface License {
  plan: string;
  status: string;
  maxTransactions: number | null;
  transactionsUsed: number;
  validUntil: string | null;
}
interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  users: number;
  license: License | null;
}

const PLAN_LABEL: Record<string, string> = {
  DEMO_DAILY: "Demo Harian",
  DEMO_MONTHLY: "Demo Bulanan",
  DEMO_TRANSACTIONS: "Demo (batas transaksi)",
  UNLIMITED: "Unlimited",
};

export function TenantsClient({ tenants }: { tenants: Tenant[] }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = q
    ? tenants.filter((t) => (t.name + t.slug).toLowerCase().includes(q.toLowerCase()))
    : tenants;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama toko…" className="pl-9" />
      </div>

      {shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada toko.</Card>
      ) : (
        <div className="space-y-3">
          {shown.map((t) => (
            <TenantRow key={t.id} tenant={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TenantRow({ tenant, open, onToggle }: { tenant: Tenant; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const lic = tenant.license;
  const [plan, setPlan] = useState(lic?.plan ?? "DEMO_MONTHLY");
  const [status, setStatus] = useState(lic?.status ?? "ACTIVE");
  const [maxTx, setMaxTx] = useState(lic?.maxTransactions != null ? String(lic.maxTransactions) : "");
  const [validUntil, setValidUntil] = useState(lic?.validUntil ? lic.validUntil.slice(0, 10) : "");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okText: string) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else setMsg({ ok: false, text: r.message ?? "Gagal." });
    });
  };

  return (
    <Card className={cn(!tenant.isActive && "opacity-70")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{tenant.name}</span>
            {!tenant.isActive && <Badge variant="destructive">Nonaktif</Badge>}
            {lic ? (
              <Badge variant={lic.status === "ACTIVE" ? "success" : "warning"}>
                {PLAN_LABEL[lic.plan] ?? lic.plan}
              </Badge>
            ) : (
              <Badge variant="muted">Tanpa lisensi</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {tenant.users} pengguna
            {lic && lic.plan === "DEMO_TRANSACTIONS" && lic.maxTransactions != null
              ? ` · transaksi ${lic.transactionsUsed}/${lic.maxTransactions}`
              : ""}
            {lic?.validUntil ? ` · s/d ${new Date(lic.validUntil).toLocaleDateString("id-ID", { dateStyle: "medium" })}` : ""}
          </p>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-4 border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Paket</Label>
              <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                {LICENSE_PLANS.map((p) => <option key={p} value={p}>{PLAN_LABEL[p] ?? p}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {LICENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Batas Transaksi (DEMO_TRANSACTIONS)</Label>
              <Input type="number" min={1} value={maxTx} onChange={(e) => setMaxTx(e.target.value)} placeholder="Kosongkan = tanpa batas" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Berlaku s/d</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          {msg && (
            <p className={cn("text-sm", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    updateTenantLicenseAction(tenant.id, {
                      plan,
                      status,
                      maxTransactions: maxTx || undefined,
                      validUntil: validUntil || undefined,
                    }),
                  "Lisensi disimpan.",
                )
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Lisensi
            </Button>
            {lic && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => resetLicenseUsageAction(tenant.id), "Pemakaian transaksi direset.")}>
                <RotateCcw /> Reset Pemakaian
              </Button>
            )}
            <Button
              variant={tenant.isActive ? "destructive" : "outline"}
              size="sm"
              disabled={pending}
              onClick={() => {
                if (!confirm(tenant.isActive ? "Nonaktifkan toko ini? Pengguna tak bisa login." : "Aktifkan kembali toko ini?")) return;
                run(() => setTenantActiveAction(tenant.id, !tenant.isActive), tenant.isActive ? "Toko dinonaktifkan." : "Toko diaktifkan.");
              }}
            >
              <Power /> {tenant.isActive ? "Nonaktifkan Toko" : "Aktifkan Toko"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Slug: {tenant.slug} · dibuat {new Date(tenant.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
        </CardContent>
      )}
    </Card>
  );
}
