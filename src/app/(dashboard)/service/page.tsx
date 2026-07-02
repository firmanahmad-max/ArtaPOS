import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listTickets } from "@/server/service-jobs/service";
import { cn, formatRupiah } from "@/lib/utils";
import type { ServiceStatus } from "@/generated/prisma/enums";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SERVICE_STATUS_META } from "./status-config";
import { formatLocalDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Jasa Servis" };

const STATUS_ORDER: ServiceStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
  "CANCELLED",
];

/** Warna kotak emoji ringkasan status, senada dengan varian badge. */
const TINT_BY_VARIANT: Record<string, string> = {
  default: "bg-primary/10",
  secondary: "bg-slate-500/12",
  warning: "bg-amber-500/15",
  success: "bg-emerald-500/12",
  muted: "bg-slate-400/12",
  destructive: "bg-rose-500/12",
};

export default async function ServicePage() {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const tickets = await listTickets(user.tenantId);

  const counts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jasa Servis</h1>
          <p className="text-muted-foreground">Tiket servis perangkat pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <a href="/lacak" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
            Halaman Lacak Publik
          </a>
          <Link href="/service/new" className={buttonVariants({})}>
            <Plus /> Tiket Baru
          </Link>
        </div>
      </div>

      {/* Ringkasan status */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {STATUS_ORDER.map((st) => {
          const s = SERVICE_STATUS_META[st];
          return (
            <div key={st} className="rounded-xl border bg-card p-3 text-center elevate">
              <div
                className={cn(
                  "mx-auto mb-1.5 flex size-9 items-center justify-center rounded-lg text-base",
                  TINT_BY_VARIANT[s.variant],
                )}
              >
                {s.emoji}
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{counts[st] ?? 0}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Belum ada tiket servis"
          description="Buat tiket pertama untuk mencatat servis perangkat pelanggan."
          action={
            <Link href="/service/new" className={buttonVariants({})}>
              <Plus /> Tiket Baru
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {tickets.map((t) => {
            const s = SERVICE_STATUS_META[t.status];
            const device = [t.deviceType, t.deviceBrand].filter(Boolean).join(" ");
            return (
              <Link key={t.id} href={`/service/${t.id}`} className="block">
                <Card className="card-hover flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">{t.number}</span>
                      <Badge variant={s.variant}>
                        {s.emoji} {s.label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-semibold">{t.customerName || "Pelanggan umum"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {device}
                      {t.complaint ? ` • ${t.complaint}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums">{formatRupiah(t.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocalDate(t.createdAt, { dateStyle: "medium" })}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
