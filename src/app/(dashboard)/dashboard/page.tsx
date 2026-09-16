import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Boxes,
  Wrench,
  AlertTriangle,
  BarChart3,
  PackagePlus,
  ArrowRight,
  Receipt,
  Sparkles,
  Plus,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { ROLE_LABELS, can, type Permission } from "@/lib/rbac";
import { cn, formatRupiah } from "@/lib/utils";
import { localParts, startOfDay as startOfLocalDay, formatLocalDate } from "@/lib/timezone";
import { salesTrend, serviceTrend } from "@/server/analytics/service";
import { getArtaInsights } from "@/server/insights/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { MiniBars } from "@/components/charts/mini-bars";
import { MonthlyReportReminder } from "@/components/finance/monthly-report-reminder";
import { DashboardTrends } from "./dashboard-trends";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // "Hari ini" dihitung pada zona laporan (WIB), bukan zona server (UTC di Vercel).
  const { y, m, d } = localParts();
  const startOfDay = startOfLocalDay(y, m, d);
  const startOfYesterday = startOfLocalDay(y, m, d - 1);

  const [
    license,
    todayAgg,
    yesterdayAgg,
    productCount,
    inStockCount,
    lowStock,
    svcByStatus,
  ] = await Promise.all([
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
    // Total kemarin (untuk delta "Penjualan Hari Ini").
    db.sale.aggregate({
      where: {
        tenantId: user.tenantId,
        status: "COMPLETED",
        createdAt: { gte: startOfYesterday, lt: startOfDay },
      },
      _sum: { total: true },
    }),
    db.product.count({ where: { tenantId: user.tenantId, isActive: true } }),
    // Produk aktif yang masih ada stok (untuk bar cakupan stok).
    db.product.count({ where: { tenantId: user.tenantId, isActive: true, stock: { gt: 0 } } }),
    db.product.count({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        minStock: { gt: 0 },
        stock: { lte: 0 },
      },
    }),
    // Rincian tiket servis aktif per status (untuk segmen amber).
    db.serviceTicket.groupBy({
      by: ["status"],
      where: {
        tenantId: user.tenantId,
        status: { in: ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS"] },
      },
      _count: true,
    }),
  ]);

  const todayTotal = todayAgg._sum.total ?? 0;
  const todayCount = todayAgg._count;
  const yesterdayTotal = yesterdayAgg._sum.total ?? 0;

  // Rincian servis aktif per status → total + segmen.
  const svcCount = (st: string) => svcByStatus.find((r) => r.status === st)?._count ?? 0;
  const svcReceived = svcCount("RECEIVED");
  const svcProgress = svcCount("IN_PROGRESS");
  const svcWaiting = svcCount("WAITING_PARTS");
  const activeService = svcReceived + svcProgress + svcWaiting;

  // Cakupan stok (% produk aktif yang masih ada stok).
  const stockCoverage = productCount > 0 ? Math.round((inStockCount / productCount) * 100) : 0;

  // Delta penjualan hari ini vs kemarin — tampil hanya bila keduanya > 0
  // (hindari "-100%" yang menyesatkan di pagi hari saat hari ini masih Rp 0).
  const salesDelta =
    todayTotal > 0 && yesterdayTotal > 0
      ? {
          value: `${Math.abs(Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100))}%`,
          positive: todayTotal >= yesterdayTotal,
        }
      : undefined;

  // Panel tren & aktivitas hanya untuk yang boleh lihat laporan.
  const canReports = can(user.role, "reports.view");
  // Panel dashboard bersifat tambahan: bila salah satu query gagal sesaat
  // (mis. koneksi DB), degradasi anggun — JANGAN meng-crash halaman (ini juga
  // tujuan tombol "Ke Dashboard" pada layar error).
  // Ambil 90 hari sekaligus; toggle periode (14/30/90) mengiris di klien.
  const [trend, svcTrend, recentSales, artaInsights] = canReports
    ? await Promise.all([
        salesTrend(user.tenantId, 90).catch(() => []),
        serviceTrend(user.tenantId, 90).catch(() => []),
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
  const topInsights = artaInsights.slice(0, 3);
  const insightDot: Record<string, string> = {
    critical: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-primary",
    positive: "bg-emerald-500",
  };

  const last7 = trend.slice(-7).map((d) => d.total);

  // Segmen amber "Servis Aktif" (Diterima / Dikerjakan / Tunggu sparepart).
  const svcSegments =
    activeService > 0 ? (
      <div className="mt-1 flex h-2 gap-1 overflow-hidden rounded-full">
        {[
          { v: svcReceived, c: "bg-amber-500/40" },
          { v: svcProgress, c: "bg-amber-500" },
          { v: svcWaiting, c: "bg-amber-500/70" },
        ]
          .filter((s) => s.v > 0)
          .map((s, i) => (
            <div key={i} className={cn("h-full", s.c)} style={{ flex: s.v }} />
          ))}
      </div>
    ) : undefined;

  const stats: {
    label: string;
    value: string;
    icon: typeof ShoppingCart;
    hint: string;
    tone: StatTone;
    href: string;
    perm?: Permission;
    chart?: ReactNode;
    accent?: boolean;
    delta?: { value: string; positive?: boolean };
    progress?: number;
  }[] = [
    {
      label: "Penjualan Hari Ini",
      value: formatRupiah(todayTotal),
      icon: ShoppingCart,
      hint: `${todayCount} transaksi`,
      tone: "blue",
      href: "/sales",
      perm: "reports.view",
      chart: last7.some((v) => v > 0) ? <MiniBars data={last7} /> : undefined,
      delta: salesDelta,
    },
    {
      label: "Produk Aktif",
      value: String(productCount),
      icon: Boxes,
      hint: `${inStockCount} dari ${productCount} tersedia`,
      tone: "emerald",
      href: "/inventory",
      perm: "inventory.manage",
      progress: stockCoverage,
    },
    {
      label: "Servis Aktif",
      value: String(activeService),
      icon: Wrench,
      hint:
        activeService > 0
          ? `${svcReceived} diterima · ${svcProgress} proses · ${svcWaiting} sparepart`
          : "Tidak ada tiket aktif",
      tone: "amber",
      href: "/service",
      perm: "service.manage",
      chart: svcSegments,
    },
    {
      label: "Stok Habis",
      value: String(lowStock),
      icon: AlertTriangle,
      hint: lowStock > 0 ? "Buat pesanan pembelian →" : "Semua stok aman",
      tone: "rose",
      href: lowStock > 0 ? "/purchasing/reorder" : "/inventory",
      perm: "inventory.manage",
      accent: lowStock > 0,
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
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-6 text-primary-foreground elevate-lg">
        <span aria-hidden className="hero-dots pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground/70">
              {formatLocalDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()} · WIB
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">
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
          {can(user.role, "pos.use") && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/pos"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-[#3b1d7e] shadow-sm transition hover:brightness-95"
              >
                <ShoppingCart className="size-4" /> Buka Kasir
              </Link>
              <Link
                href="/pos"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/30 px-4 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <Plus className="size-4" /> Transaksi baru
              </Link>
            </div>
          )}
        </div>
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
              chart={s.chart}
              accent={s.accent}
              delta={s.delta}
              progress={s.progress}
            />
          );
        })}
      </div>

      {/* Baris tengah: kiri = tren (toggle periode + 2 kartu), kanan = Tanya Arta + Penjualan Terbaru */}
      {canReports && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* Kiri — tren penjualan & jasa servis */}
          <DashboardTrends sales={trend} service={svcTrend} />

          {/* Kanan — Tanya Arta + aktivitas terbaru */}
          <div className="flex flex-col gap-4">
            {topInsights.length > 0 && (
              <div className="relative overflow-hidden rounded-2xl gradient-arta p-5 text-white elevate-lg">
                <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-[#a855f7]/25 blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-bold">
                    <Sparkles className="size-5 text-violet-300" /> Tanya Arta
                  </h2>
                  <Link href="/insights" className="text-xs font-medium text-violet-200 hover:underline">
                    Lihat semua
                  </Link>
                </div>
                <ul className="relative mt-2 divide-y divide-white/10">
                  {topInsights.map((it) => (
                    <li key={it.id}>
                      <Link
                        href={it.href ?? "/insights"}
                        className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/5"
                      >
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-white/10", insightDot[it.tone])} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{it.title}</p>
                          <p className="truncate text-xs text-white/60">{it.detail}</p>
                        </div>
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-white/50" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
