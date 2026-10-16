import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Recycle, ChevronRight, Search, Package, Wallet, TrendingUp, BadgeCheck, Images } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listUsedItems } from "@/server/used-items/service";
import { daysInStock, gradeMeta, summarizeUsedItems, usedMargin } from "@/lib/used-item";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { AGING_DAYS, USED_GRADE_VARIANT, USED_STATUS_META } from "./status-config";

export const metadata: Metadata = { title: "Barang Bekas" };

export default async function UsedItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { filter = "available", q = "" } = await searchParams;
  const rows = (await listUsedItems(user.tenantId)).map((r) => ({ ...r, age: daysInStock(r.acquiredAt) }));
  const sum = summarizeUsedItems(rows);

  const needle = q.trim().toLowerCase();
  const matched = needle
    ? rows.filter((r) =>
        [r.number, r.category, r.name, r.serialNumber ?? ""].some((x) => x.toLowerCase().includes(needle)),
      )
    : rows;

  const available = matched.filter((r) => r.status === "AVAILABLE");
  const aging = available.filter((r) => r.age > AGING_DAYS);
  const sold = matched.filter((r) => r.status === "SOLD");
  const withdrawn = matched.filter((r) => r.status === "WITHDRAWN");
  const shown =
    filter === "aging"
      ? aging
      : filter === "sold"
        ? sold
        : filter === "withdrawn"
          ? withdrawn
          : filter === "all"
            ? matched
            : available;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barang Bekas</h1>
          <p className="text-muted-foreground">
            Barang second milik toko — kondisi, harga &amp; garansi per unit. Dijual lewat kasir (tab “Bekas”).
          </p>
        </div>
        <Link href="/used-items/new" className={buttonVariants()}>
          <Plus /> Tambah Barang Bekas
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tersedia" value={sum.available} icon={Package} tone="violet" hint={`Nilai jual ${formatRupiah(sum.stockValue)}`} />
        <StatCard label="Modal tertanam" value={formatRupiah(sum.stockCost)} icon={Wallet} tone="amber" hint="Harga beli barang tersedia" />
        <StatCard label="Potensi laba" value={formatRupiah(sum.potentialProfit)} icon={TrendingUp} tone="blue" hint="Bila semua laku di harga jual" />
        <StatCard label="Terjual" value={sum.sold} icon={BadgeCheck} tone="emerald" hint={`Laba ${formatRupiah(sum.realizedProfit)}`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterChips
          defaultValue="available"
          chips={[
            { value: "available", label: "Tersedia", count: available.length },
            { value: "aging", label: `Lama >${AGING_DAYS} hari`, count: aging.length, tone: "warning" },
            { value: "sold", label: "Terjual", count: sold.length, tone: "success" },
            { value: "withdrawn", label: "Ditarik", count: withdrawn.length },
            { value: "all", label: "Semua", count: matched.length },
          ]}
        />
        <form className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          {filter !== "available" && <input type="hidden" name="filter" value={filter} />}
          <Input name="q" defaultValue={q} placeholder="Cari no. BK, nama, SN…" className="pl-9" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Recycle}
          title="Belum ada barang bekas"
          description="Catat laptop/komponen second milik toko lengkap dengan grade kondisi, harga beli & jual, lalu jual lewat kasir atau pajang di Galeri Publik."
          action={
            <Link href="/used-items/new" className={buttonVariants()}>
              <Plus /> Tambah Barang Bekas
            </Link>
          }
        />
      ) : shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada barang pada filter ini.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((r) => {
            const st = USED_STATUS_META[r.status];
            const g = gradeMeta(r.grade);
            const price = r.status === "SOLD" ? (r.soldPrice ?? r.sellPrice) : r.sellPrice;
            const m = usedMargin(r.costPrice, price);
            return (
              <Link key={r.id} href={`/used-items/${r.id}`} className="block">
                <Card className="card-hover flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-primary">{r.number}</span>
                      <Badge variant={USED_GRADE_VARIANT[r.grade]}>Grade {g.code}</Badge>
                      {r.status !== "AVAILABLE" && <Badge variant={st.variant}>{st.label}</Badge>}
                      {r.status === "AVAILABLE" && r.age > AGING_DAYS && <Badge variant="warning">{r.age} hari</Badge>}
                      {r.galleryItem && (
                        <span title={r.galleryItem.isActive ? "Dipajang di Galeri" : "Di Galeri (disembunyikan)"}>
                          <Images className="size-4 text-success" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-semibold">
                      <span className="text-muted-foreground">{r.category} · </span>
                      {r.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.serialNumber ? `SN ${r.serialNumber} · ` : ""}
                      Modal {formatRupiah(r.costPrice)} · margin{" "}
                      <span className={m.margin < 0 ? "text-destructive" : undefined}>{formatRupiah(m.margin)}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono font-bold tabular-nums">{formatRupiah(price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "AVAILABLE" ? `${r.age} hari di toko` : st.label.toLowerCase()}
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
