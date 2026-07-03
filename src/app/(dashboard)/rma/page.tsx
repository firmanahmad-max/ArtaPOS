import type { Metadata } from "next";
import Link from "next/link";
import { Plus, PackageOpen, Truck, PackageCheck, PackageX } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listRmaClaims } from "@/server/rma/service";
import { formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { RMA_STATUS_META } from "./status-config";
import { RmaSearch } from "./rma-search";

export const metadata: Metadata = { title: "Klaim RMA" };

export default async function RmaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { q } = await searchParams;
  const claims = await listRmaClaims(user.tenantId, q);

  const sentCount = claims.filter((c) => c.status === "SENT").length;
  const returnedCount = claims.filter((c) => c.status === "RETURNED").length;
  const rejectedCount = claims.filter((c) => c.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Klaim RMA</h1>
          <p className="text-muted-foreground">Barang yang dikirim ke distributor untuk klaim garansi.</p>
        </div>
        <Link href="/rma/new" className={buttonVariants({})}>
          <Plus /> Klaim Baru
        </Link>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={PackageOpen} label="Total Klaim" value={String(claims.length)} hint="Semua klaim RMA" tone="blue" />
        <StatCard icon={Truck} label="Di Distributor" value={String(sentCount)} hint="Menunggu kembali" tone="amber" />
        <StatCard icon={PackageCheck} label="Sudah Kembali" value={String(returnedCount)} hint="Diservis / diganti" tone="emerald" />
        <StatCard icon={PackageX} label="Ditolak" value={String(rejectedCount)} hint="Klaim tidak diterima" tone="rose" />
      </div>

      <div className="flex items-center gap-3">
        <RmaSearch initial={q ?? ""} />
        <span className="text-sm text-muted-foreground">{claims.length} klaim</span>
      </div>

      {claims.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={q ? "Klaim tidak ditemukan" : "Belum ada klaim RMA"}
          description={
            q
              ? "Coba kata kunci lain (nomor, produk, SN, atau distributor)."
              : "Catat barang yang dikirim ke distributor untuk klaim garansi di sini."
          }
          action={
            !q && (
              <Link href="/rma/new" className={buttonVariants({})}>
                <Plus /> Klaim Baru
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Produk</th>
                <th className="hidden p-3 font-medium md:table-cell">Distributor</th>
                <th className="hidden p-3 font-medium sm:table-cell">Dikirim</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const s = RMA_STATUS_META[c.status];
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-medium">{c.number}</td>
                    <td className="p-3">
                      <div className="font-medium">{c.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.serialNumber ? `SN: ${c.serialNumber}` : "Tanpa SN"}
                      </div>
                    </td>
                    <td className="hidden p-3 text-muted-foreground md:table-cell">{c.supplierName}</td>
                    <td className="hidden p-3 text-muted-foreground sm:table-cell">
                      {formatLocalDate(c.sentAt, { dateStyle: "medium" })}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/rma/${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
