import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Handshake, ChevronRight, Search, Package, Wallet, BadgeCheck, Coins } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listConsignments } from "@/server/consignment/service";
import { summarizeConsignment } from "@/lib/consignment-calc";
import { parseComponents } from "@/lib/consignment-set";
import { formatRupiah } from "@/lib/utils";
import { formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";

export const metadata: Metadata = { title: "Titip Jual" };

export default async function ConsignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { filter = "active", q = "" } = await searchParams;
  const rows = (await listConsignments(user.tenantId)).map((c) => ({ ...c, sum: summarizeConsignment(c.items) }));

  const needle = q.trim().toLowerCase();
  const matched = needle
    ? rows.filter(
        (c) =>
          c.number.toLowerCase().includes(needle) ||
          c.customerName.toLowerCase().includes(needle) ||
          (c.customerPhone ?? "").includes(needle) ||
          c.items.some((i) =>
            [i.category, i.name, ...parseComponents(i.components).flatMap((p) => [p.name, p.serialNumber ?? ""])]
              .join(" ")
              .toLowerCase()
              .includes(needle),
          ),
      )
    : rows;

  const active = matched.filter((c) => !c.sum.done);
  const done = matched.filter((c) => c.sum.done);
  const owed = matched.filter((c) => c.sum.ownerOwed > 0);
  const shown = filter === "done" ? done : filter === "owed" ? owed : filter === "all" ? matched : active;

  const totals = rows.reduce(
    (t, c) => ({
      items: t.items + c.sum.available,
      value: t.value + c.sum.availableValue,
      sold: t.sold + c.sum.sold,
      owed: t.owed + c.sum.ownerOwed,
      commission: t.commission + c.sum.commissionTotal,
    }),
    { items: 0, value: 0, sold: 0, owed: 0, commission: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Titip Jual</h1>
          <p className="text-muted-foreground">
            Barang/komponen milik pelanggan yang dititipkan untuk ditawarkan di toko.
          </p>
        </div>
        <Link href="/consignments/new" className={buttonVariants()}>
          <Plus /> Titipan Baru
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Barang dititipkan" value={totals.items} icon={Package} tone="violet" hint={formatRupiah(totals.value)} />
        <StatCard label="Barang terjual" value={totals.sold} icon={BadgeCheck} tone="emerald" />
        <StatCard label="Komisi toko" value={formatRupiah(totals.commission)} icon={Coins} tone="blue" />
        <StatCard
          label="Hak pemilik belum dibayar"
          value={formatRupiah(totals.owed)}
          icon={Wallet}
          tone={totals.owed > 0 ? "amber" : "slate"}
          href={totals.owed > 0 ? "/consignments?filter=owed" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          defaultValue="active"
          chips={[
            { value: "active", label: "Aktif", count: active.length },
            { value: "owed", label: "Hak belum dibayar", count: owed.length, tone: "warning" },
            { value: "done", label: "Selesai", count: done.length, tone: "success" },
            { value: "all", label: "Semua", count: matched.length },
          ]}
        />
        <form className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          {filter !== "active" && <input type="hidden" name="filter" value={filter} />}
          <Input name="q" defaultValue={q} placeholder="Cari pemilik, no., barang…" className="pl-9" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Belum ada titip jual"
          description="Catat barang yang dititipkan pelanggan, lalu kirim tanda titip jual ke WhatsApp mereka."
          action={
            <Link href="/consignments/new" className={buttonVariants()}>
              <Plus /> Titipan Baru
            </Link>
          }
        />
      ) : shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada titipan pada filter ini.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((c) => (
            <Link key={c.id} href={`/consignments/${c.id}`} className="block">
              <Card className="card-hover flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-primary">{c.number}</span>
                    {c.sum.done ? (
                      <Badge variant="muted">Selesai</Badge>
                    ) : (
                      <Badge variant="default">{c.sum.available} dititipkan</Badge>
                    )}
                    {c.sum.sold > 0 && <Badge variant="success">{c.sum.sold} terjual</Badge>}
                    {c.sum.ownerOwed > 0 && <Badge variant="warning">Hak {formatRupiah(c.sum.ownerOwed)}</Badge>}
                  </div>
                  <p className="mt-1 truncate font-semibold">{c.customerName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.items
                      .map((i) => {
                        const n = parseComponents(i.components).length;
                        return `${i.category} ${i.name}${n ? ` (paket ${n} komponen)` : ""}`;
                      })
                      .join(" • ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono font-bold tabular-nums">{formatRupiah(c.sum.askingTotal)}</p>
                  <p className="text-xs text-muted-foreground">{formatLocalDate(c.createdAt, { dateStyle: "medium" })}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
