import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, Download } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listSales } from "@/server/pos/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Riwayat Penjualan" };

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Anda tidak punya izin melihat riwayat penjualan.
      </Card>
    );
  }
  const sales = await listSales(user.tenantId, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Riwayat Penjualan</h1>
          <p className="text-muted-foreground">Daftar transaksi penjualan toko.</p>
        </div>
        {sales.length > 0 && (
          <a href="/api/export/sales" className={buttonVariants({ variant: "outline" })}>
            <Download /> Export CSV
          </a>
        )}
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Belum ada transaksi"
          description="Transaksi penjualan akan muncul di sini setelah Anda menggunakan kasir."
          action={
            <Link href="/pos" className={buttonVariants({})}>
              Buka Kasir
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Pelanggan</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 font-medium">{s.number}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-3 text-muted-foreground">{s.customerName || "Umum"}</td>
                  <td className="p-3 text-right font-medium">{formatRupiah(s.total)}</td>
                  <td className="p-3 text-center">
                    {s.status === "VOID" ? (
                      <Badge variant="destructive">Void</Badge>
                    ) : (
                      <Badge variant="success">Selesai</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/sales/${s.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
