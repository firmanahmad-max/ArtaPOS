import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Trophy, PackageX, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { salesTrend, topProducts, deadStock, lowStock } from "@/server/analytics/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";

export const metadata: Metadata = { title: "Laporan & Analitik" };

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin melihat laporan.</Card>;
  }

  const [trend, top, dead, low] = await Promise.all([
    salesTrend(user.tenantId, 14),
    topProducts(user.tenantId, 30, 5),
    deadStock(user.tenantId, 60, 10),
    lowStock(user.tenantId, 10),
  ]);

  const trendTotal = trend.reduce((s, d) => s + d.total, 0);
  const topMaxQty = Math.max(1, ...top.map((t) => t.qty));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan & Analitik</h1>
          <p className="text-muted-foreground">Ringkasan performa toko Anda.</p>
        </div>
        <Link href="/finance" className={buttonVariants({ variant: "outline" })}>Laporan Keuangan</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5" /> Tren Penjualan (14 hari)</CardTitle>
          <CardDescription>Total omzet 14 hari: <span className="font-medium text-foreground">{formatRupiah(trendTotal)}</span></CardDescription>
        </CardHeader>
        <CardContent>
          {trendTotal === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada penjualan dalam 14 hari terakhir.</p>
          ) : (
            <BarChart data={trend.map((d) => ({ label: d.label, value: d.total }))} formatValue={formatRupiah} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="size-5" /> Produk Terlaris (30 hari)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data penjualan.</p>
            ) : (
              top.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{i + 1}. {t.name}</span>
                    <span className="text-muted-foreground">{t.qty} terjual · {formatRupiah(t.revenue)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((t.qty / topMaxQty) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" /> Stok Menipis / Habis</CardTitle>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua stok aman. 👍</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <Link href={`/inventory/${p.id}/edit`} className="font-medium hover:underline">{p.name}</Link>
                    {p.stock <= 0 ? (
                      <Badge variant="destructive">Habis</Badge>
                    ) : (
                      <Badge variant="warning">{p.stock} / min {p.minStock}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageX className="size-5" /> Stok Mati (tak terjual 60 hari)</CardTitle>
          <CardDescription>Pertimbangkan promo/diskon untuk produk berikut.</CardDescription>
        </CardHeader>
        <CardContent>
          {dead.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada stok mati. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2 font-medium">Produk</th>
                    <th className="p-2 text-center font-medium">Stok</th>
                    <th className="p-2 text-right font-medium">Nilai (harga jual)</th>
                  </tr>
                </thead>
                <tbody>
                  {dead.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-2">
                        <Link href={`/inventory/${p.id}/edit`} className="hover:underline">{p.name}</Link>
                      </td>
                      <td className="p-2 text-center">{p.stock}</td>
                      <td className="p-2 text-right">{formatRupiah(p.stock * p.sellPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
