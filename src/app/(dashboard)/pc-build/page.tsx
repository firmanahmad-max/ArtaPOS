import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Cpu, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listBuilds } from "@/server/pcbuild/service";
import { cn, formatRupiah } from "@/lib/utils";
import type { BuildStatus } from "@/generated/prisma/enums";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BUILD_STATUS_META } from "./build-status";
import { formatLocalDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Rakit PC" };

const STATUS_ORDER: BuildStatus[] = ["DRAFT", "ASSEMBLING", "DONE", "DELIVERED", "CANCELLED"];

const TINT_BY_VARIANT: Record<string, string> = {
  default: "bg-primary/10",
  secondary: "bg-slate-500/12",
  warning: "bg-amber-500/15",
  success: "bg-emerald-500/12",
  muted: "bg-slate-400/12",
  destructive: "bg-rose-500/12",
};

export default async function PcBuildPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const builds = await listBuilds(user.tenantId);

  const counts = builds.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rakit PC</h1>
          <p className="text-muted-foreground">Rakitan PC dari komponen + jasa rakit.</p>
        </div>
        <Link href="/pc-build/new" className={buttonVariants({})}><Plus /> Rakitan Baru</Link>
      </div>

      {/* Ringkasan status */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {STATUS_ORDER.map((st) => {
          const s = BUILD_STATUS_META[st];
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

      {builds.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="Belum ada rakitan"
          description="Buat rakitan pertama dari komponen + jasa rakit."
          action={
            <Link href="/pc-build/new" className={buttonVariants({})}>
              <Plus /> Rakitan Baru
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {builds.map((b) => {
            const s = BUILD_STATUS_META[b.status];
            return (
              <Link key={b.id} href={`/pc-build/${b.id}`} className="block">
                <Card className="card-hover flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-primary">{b.number}</span>
                      <Badge variant={s.variant}>
                        {s.emoji} {s.label}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-semibold">{b.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {b.customerName || "Pelanggan umum"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold tabular-nums">{formatRupiah(b.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocalDate(b.createdAt, { dateStyle: "medium" })}
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
