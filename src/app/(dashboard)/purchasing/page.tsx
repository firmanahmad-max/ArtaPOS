import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Truck, Wallet, ShoppingBag, PackageCheck, CircleDollarSign } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listPurchases } from "@/server/purchasing/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatLocalDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Pembelian" };

const PAY: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  PAID: { label: "Lunas", variant: "success" },
  PARTIAL: { label: "Sebagian", variant: "warning" },
  UNPAID: { label: "Belum bayar", variant: "destructive" },
};

export default async function PurchasingPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const purchases = await listPurchases(user.tenantId);
  const purchaseTotal = purchases.reduce((s, p) => s + p.total, 0);
  const unpaidCount = purchases.filter((p) => p.paymentStatus !== "PAID").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pembelian</h1>
          <p className="text-muted-foreground">Barang masuk dari supplier.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchasing/reorder" className={buttonVariants({ variant: "outline" })}>
            <ShoppingBag /> Saran Pembelian
          </Link>
          <Link href="/payables" className={buttonVariants({ variant: "outline" })}>
            <Wallet /> Utang
          </Link>
          <Link href="/purchasing/new" className={buttonVariants({})}>
            <Plus /> Pembelian Baru
          </Link>
        </div>
      </div>

      {purchases.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={CircleDollarSign}
            label="Total Pembelian"
            value={formatRupiah(purchaseTotal)}
            hint={`${purchases.length} transaksi`}
            tone="blue"
          />
          <StatCard
            icon={PackageCheck}
            label="Sudah Lunas"
            value={String(purchases.length - unpaidCount)}
            hint="Pembelian terbayar"
            tone="emerald"
          />
          <StatCard
            icon={Wallet}
            label="Belum Lunas"
            value={String(unpaidCount)}
            hint="Masih ada utang"
            tone="amber"
          />
        </div>
      )}

      {purchases.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Truck className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pembelian.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Supplier</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const s = PAY[p.paymentStatus] ?? PAY.UNPAID;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-medium">{p.number}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatLocalDate(p.createdAt, { dateStyle: "medium" })}
                    </td>
                    <td className="p-3 text-muted-foreground">{p.supplierName || "—"}</td>
                    <td className="p-3 text-right font-medium">{formatRupiah(p.total)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/purchasing/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
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
