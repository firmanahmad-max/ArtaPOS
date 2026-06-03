import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingCart,
  Boxes,
  Wrench,
  AlertTriangle,
  BarChart3,
  PackagePlus,
  ArrowRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [license, todayAgg, productCount, lowStock, activeService] =
    await Promise.all([
      db.license.findUnique({
        where: { tenantId: user.tenantId },
        select: { plan: true, status: true },
      }),
      db.sale.aggregate({
        where: {
          tenantId: user.tenantId,
          status: "COMPLETED",
          createdAt: { gte: startOfDay },
        },
        _sum: { total: true },
        _count: true,
      }),
      db.product.count({ where: { tenantId: user.tenantId, isActive: true } }),
      db.product.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          minStock: { gt: 0 },
          stock: { lte: 0 },
        },
      }),
      db.serviceTicket.count({
        where: {
          tenantId: user.tenantId,
          status: { in: ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS"] },
        },
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
      tint: "linear-gradient(135deg, var(--primary), var(--primary-accent))",
    },
    {
      label: "Produk Aktif",
      value: String(productCount),
      icon: Boxes,
      hint: "Total item di katalog",
      tint: "linear-gradient(135deg, #10b981, #14b8a6)",
    },
    {
      label: "Servis Aktif",
      value: String(activeService),
      icon: Wrench,
      hint: "Tiket sedang dikerjakan",
      tint: "linear-gradient(135deg, #f59e0b, #f97316)",
    },
    {
      label: "Stok Habis",
      value: String(lowStock),
      icon: AlertTriangle,
      hint: "Produk perlu restock",
      tint: "linear-gradient(135deg, #f43f5e, #ef4444)",
    },
  ];

  const shortcuts = [
    { label: "Buka Kasir", desc: "Mulai transaksi penjualan", href: "/pos", icon: ShoppingCart },
    { label: "Tambah Produk", desc: "Daftarkan barang baru", href: "/inventory/new", icon: PackagePlus },
    { label: "Tiket Servis", desc: "Kelola jasa servis", href: "/service", icon: Wrench },
    { label: "Laporan", desc: "Analitik & performa toko", href: "/reports", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header sambutan */}
      <div className="overflow-hidden rounded-2xl gradient-brand p-6 text-primary-foreground elevate-lg">
        <h1 className="text-2xl font-bold tracking-tight">
          Halo, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {ROLE_LABELS[user.role]} di {user.tenant.name}
          {license && (
            <span className="ml-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium">
              Lisensi: {license.plan} ({license.status})
            </span>
          )}
        </p>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="card-hover">
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ backgroundImage: s.tint }}
                >
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="truncate text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pintasan cepat */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Pintasan cepat</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href} className="group">
                <Card className="card-hover h-full">
                  <CardContent className="flex items-start gap-3 p-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 font-semibold">
                        {q.label}
                        <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </p>
                      <p className="text-xs text-muted-foreground">{q.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
