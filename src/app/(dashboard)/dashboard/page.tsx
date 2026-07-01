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
  TrendingUp,
  Receipt,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS, can, type Permission } from "@/lib/rbac";
import { formatRupiah } from "@/lib/utils";
import { localParts, startOfDay as startOfLocalDay } from "@/lib/timezone";
import { salesTrend } from "@/server/analytics/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { BarChart } from "@/components/charts/bar-chart";
import { MonthlyReportReminder } from "@/components/finance/monthly-report-reminder";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // "Hari ini" dihitung pada zona laporan (WIB), bukan zona server (UTC di Vercel).
  const { y, m, d } = localParts();
  const startOfDay = startOfLocalDay(y, m, d);

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

  // Panel tren & aktivitas hanya untuk yang boleh lihat laporan.
  const canReports = can(user.role, "reports.view");
  const [trend, recentSales] = canReports
    ? await Promise.all([
        salesTrend(user.tenantId, 14),
        db.sale.findMany({
          where: { tenantId: user.tenantId, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, number: true, customerName: true, total: true, createdAt: true },
        }),
      ])
    : [[], []];
  const trendTotal = trend.reduce((s, d) => s + d.total, 0);

  const stats: {
    label: string;
    value: string;
    icon: typeof ShoppingCart;
    hint: string;
    tone: StatTone;
    href: string;
    perm?: Permission;
  }[] = [
    {
      label: "Penjualan Hari Ini",
      value: formatRupiah(todayTotal),
      icon: ShoppingCart,
      hint: `${todayCount} transaksi`,
      tone: "blue",
      href: "/sales",
      perm: "reports.view",
    },
    {
      label: "Produk Aktif",
      value: String(productCount),
      icon: Boxes,
      hint: "Total item di katalog",
      tone: "emerald",
      href: "/inventory",
      perm: "inventory.manage",
    },
    {
      label: "Servis Aktif",
      value: String(activeService),
      icon: Wrench,
      hint: "Tiket sedang dikerjakan",
      tone: "amber",
      href: "/service",
      perm: "service.manage",
    },
    {
      label: "Stok Habis",
      value: String(lowStock),
      icon: AlertTriangle,
      hint: "Produk perlu restock",
      tone: "rose",
      href: "/inventory",
      perm: "inventory.manage",
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
      {/* Pengingat kirim laporan bulanan (akhir/awal bulan) — untuk peran keuangan */}
      {can(user.role, "finance.view") && <MonthlyReportReminder />}

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
          const accessible = !s.perm || can(user.role, s.perm);
          return (
            <StatCard
              key={s.label}
              icon={s.icon}
              label={s.label}
              value={s.value}
              hint={s.hint}
              tone={s.tone}
              href={accessible ? s.href : undefined}
            />
          );
        })}
      </div>

      {/* Panel tren & aktivitas terbaru */}
      {canReports && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-5 text-primary" /> Tren Penjualan (14 hari)
              </CardTitle>
              <CardDescription>
                Total omzet: <span className="font-medium text-foreground">{formatRupiah(trendTotal)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendTotal === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Belum ada penjualan dalam 14 hari terakhir.
                </p>
              ) : (
                <BarChart data={trend.map((d) => ({ label: d.label, value: d.total }))} formatValue={formatRupiah} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-5 text-primary" /> Penjualan Terbaru
              </CardTitle>
              <Link href="/sales" className="text-xs font-medium text-primary hover:underline">
                Lihat semua
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {recentSales.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
              ) : (
                <ul className="divide-y">
                  {recentSales.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/sales/${s.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-primary">{s.number}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.customerName || "Pelanggan umum"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatRupiah(s.total)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
