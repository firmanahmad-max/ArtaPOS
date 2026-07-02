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
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS, can, type Permission } from "@/lib/rbac";
import { cn, formatRupiah } from "@/lib/utils";
import { localParts, startOfDay as startOfLocalDay, formatLocalDate } from "@/lib/timezone";
import { salesTrend, serviceTrend } from "@/server/analytics/service";
import { getArtaInsights } from "@/server/insights/service";
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
  // Panel dashboard bersifat tambahan: bila salah satu query gagal sesaat
  // (mis. koneksi DB), degradasi anggun — JANGAN meng-crash halaman (ini juga
  // tujuan tombol "Ke Dashboard" pada layar error).
  const [trend, svcTrend, recentSales, artaInsights] = canReports
    ? await Promise.all([
        salesTrend(user.tenantId, 14).catch(() => []),
        serviceTrend(user.tenantId, 14).catch(() => []),
        db.sale
          .findMany({
            where: { tenantId: user.tenantId, status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, number: true, customerName: true, total: true, createdAt: true },
          })
          .catch(() => []),
        getArtaInsights(user.tenantId, user.role).catch(() => []),
      ])
    : [[], [], [], []];
  const trendTotal = trend.reduce((s, d) => s + d.total, 0);
  const svcTrendTotal = svcTrend.reduce((s, d) => s + d.total, 0);
  const topInsights = artaInsights.slice(0, 3);
  const insightDot: Record<string, string> = {
    critical: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-primary",
    positive: "bg-emerald-500",
  };

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

      {/* Ringkasan insight Arta */}
      {canReports && topInsights.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5 text-primary" /> Tanya Arta
            </CardTitle>
            <Link href="/insights" className="text-xs font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y">
              {topInsights.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href ?? "/insights"}
                    className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", insightDot[it.tone])} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{it.detail}</p>
                    </div>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
                            {formatLocalDate(s.createdAt, { day: "numeric", month: "short" })}
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

      {/* Panel tren jasa servis */}
      {canReports && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-5 text-amber-600 dark:text-amber-400" /> Tren Jasa Servis (14 hari)
              </CardTitle>
              <CardDescription>
                Total pendapatan servis:{" "}
                <span className="font-medium text-foreground">{formatRupiah(svcTrendTotal)}</span>
              </CardDescription>
            </div>
            <Link href="/service" className="text-xs font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardContent>
            {svcTrendTotal === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Belum ada pendapatan servis dalam 14 hari terakhir.
              </p>
            ) : (
              <BarChart
                data={svcTrend.map((d) => ({ label: d.label, value: d.total }))}
                formatValue={formatRupiah}
              />
            )}
          </CardContent>
        </Card>
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
