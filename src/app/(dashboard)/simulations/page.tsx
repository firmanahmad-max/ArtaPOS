import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ClipboardList, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listSimulations } from "@/server/build-sim/service";
import { simTotals } from "@/lib/build-sim-calc";
import { cn, formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatLocalDate } from "@/lib/timezone";
import type { SimStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Simulasi Rakitan" };

const STATUS_META: Record<SimStatus, { label: string; variant: "default" | "secondary" | "warning" | "success" | "destructive" }> = {
  DRAFT: { label: "Draf", variant: "secondary" },
  SENT: { label: "Terkirim", variant: "warning" },
  APPROVED: { label: "Disetujui", variant: "success" },
  IMPORTED: { label: "Diimpor", variant: "default" },
  REJECTED: { label: "Ditolak", variant: "destructive" },
};

export default async function SimulationsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const sims = await listSimulations(user.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simulasi Rakitan</h1>
          <p className="text-muted-foreground">Susun penawaran rakitan sesuai bujet pelanggan, kirim via WA, lalu impor ke Rakit PC bila disetujui.</p>
        </div>
        <Link href="/simulations/new" className={buttonVariants({})}><Plus /> Simulasi Baru</Link>
      </div>

      {sims.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada simulasi"
          description="Buat penawaran rakitan pertama — komponen dari inventory atau bebas, lengkap dengan bujet & margin."
          action={<Link href="/simulations/new" className={buttonVariants({})}><Plus /> Simulasi Baru</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sims.map((s) => {
            const t = simTotals(s.items, s.buildFee, s.budget);
            const meta = STATUS_META[s.status];
            return (
              <Link key={s.id} href={`/simulations/${s.id}`} className="block">
                <Card className="card-hover flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">{s.number}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 truncate font-semibold">{s.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{s.customerName || "Tanpa pelanggan"} · {s.items.length} komponen</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums">{formatRupiah(t.grandSell)}</p>
                    <p className={cn("text-xs font-medium tabular-nums", t.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                      margin {formatRupiah(t.margin)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatLocalDate(s.createdAt, { dateStyle: "medium" })}</p>
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
