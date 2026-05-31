import type { Metadata } from "next";
import {
  ShoppingCart,
  Boxes,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatRupiah } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [license, todayAgg, productCount, lowStock] = await Promise.all([
    db.license.findUnique({
      where: { tenantId: user.tenantId },
      select: { plan: true, status: true },
    }),
    db.sale.aggregate({
      where: { tenantId: user.tenantId, status: "COMPLETED", createdAt: { gte: startOfDay } },
      _sum: { total: true },
      _count: true,
    }),
    db.product.count({ where: { tenantId: user.tenantId, isActive: true } }),
    db.product.count({
      where: { tenantId: user.tenantId, isActive: true, minStock: { gt: 0 }, stock: { lte: 0 } },
    }),
  ]);

  const todayTotal = todayAgg._sum.total ?? 0;
  const todayCount = todayAgg._count;

  const stats = [
    {
      label: "Penjualan Hari Ini",
      value: formatRupiah(todayTotal),
      icon: ShoppingCart,
      hint: `${todayCount} transaksi`,
    },
    { label: "Produk", value: String(productCount), icon: Boxes, hint: "Produk aktif" },
    { label: "Servis Aktif", value: "0", icon: Wrench, hint: "Mulai di Fase 5 (Servis)" },
    {
      label: "Stok Habis",
      value: String(lowStock),
      icon: AlertTriangle,
      hint: "Produk perlu restock",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Halo, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          {ROLE_LABELS[user.role]} di {user.tenant.name}
          {license && (
            <span className="ml-2 rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              Lisensi: {license.plan} ({license.status})
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{s.label}</CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fondasi siap ✅</CardTitle>
          <CardDescription>
            Autentikasi, multi-tenant, tema terang/gelap, dan dashboard sudah aktif.
            Modul berikutnya (Inventory, POS, Servis, Keuangan) akan mengisi menu di
            samping secara bertahap.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
