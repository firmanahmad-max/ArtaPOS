import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, TrendingUp, LineChart, Receipt, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getFinanceComparison } from "@/server/finance/service";
import { buildReportText } from "@/lib/whatsapp";
import { formatRupiah } from "@/lib/utils";
import type { ReportPeriod } from "@/lib/validations/finance";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Keuangan" };

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "month", label: "Bulan Ini" },
  { key: "last-month", label: "Bulan Lalu" },
  { key: "year", label: "Tahun Ini" },
];

/** Persentase perubahan; null bila tak ada pembanding (periode lalu nol). */
function deltaPct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function DeltaBadge({ cur, prev, higherIsBetter = true }: { cur: number; prev: number; higherIsBetter?: boolean }) {
  const pct = deltaPct(cur, prev);
  if (pct === null) return <span className="text-xs font-medium text-muted-foreground">baru</span>;
  if (Math.abs(pct) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  const up = pct > 0;
  const good = up === higherIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(pct).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "finance.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin melihat keuangan.</Card>;
  }
  const { period: rawPeriod } = await searchParams;
  const period: ReportPeriod =
    rawPeriod === "today" || rawPeriod === "year" || rawPeriod === "last-month" ? rawPeriod : "month";

  const { current: report, previous } = await getFinanceComparison(user.tenantId, period);
  const reportText = buildReportText(user.tenant.name, report);

  const rows = [
    { label: "Penjualan (omzet)", value: report.salesRevenue, hint: `${report.salesCount} transaksi` },
    { label: "HPP (modal terjual)", value: -report.salesCogs },
    { label: "Laba kotor penjualan", value: report.salesGrossProfit, strong: true },
    {
      label: "Pendapatan servis",
      value: report.serviceRevenue,
      hint:
        report.servicePartsRevenue > 0
          ? `${report.serviceCount} tiket · termasuk sparepart ${formatRupiah(report.servicePartsRevenue)}`
          : `${report.serviceCount} tiket`,
    },
    ...(report.serviceCogs > 0
      ? [{ label: "Modal sparepart servis", value: -report.serviceCogs }]
      : []),
    {
      label: "Pendapatan rakit PC",
      value: report.buildRevenue,
      hint:
        report.buildPartsRevenue > 0
          ? `${report.buildCount} rakitan · termasuk komponen ${formatRupiah(report.buildPartsRevenue)}`
          : `${report.buildCount} rakitan`,
    },
    ...(report.buildCogs > 0 ? [{ label: "Modal komponen rakitan", value: -report.buildCogs }] : []),
    { label: "Biaya operasional", value: -report.expenseTotal },
  ];

  // Ringkasan KPI (kartu atas) + turunan pembanding. Laba kotor servis/rakitan
  // dihitung setelah modal stok yang terpakai, bukan omzet mentahnya.
  const totalRevenue = report.salesRevenue + report.serviceRevenue + report.buildRevenue;
  const grossProfit =
    report.salesGrossProfit +
    (report.serviceRevenue - report.serviceCogs) +
    (report.buildRevenue - report.buildCogs);
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const prevRevenue = previous.salesRevenue + previous.serviceRevenue + previous.buildRevenue;
  const prevGross =
    previous.salesGrossProfit +
    (previous.serviceRevenue - previous.serviceCogs) +
    (previous.buildRevenue - previous.buildCogs);

  const compareRows: { label: string; cur: number; prev: number; higherIsBetter?: boolean }[] = [
    { label: "Pendapatan", cur: totalRevenue, prev: prevRevenue },
    { label: "Laba kotor", cur: grossProfit, prev: prevGross },
    { label: "Laba bersih", cur: report.estimatedNet, prev: previous.estimatedNet },
    { label: "Biaya operasional", cur: report.expenseTotal, prev: previous.expenseTotal, higherIsBetter: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keuangan</h1>
          <p className="text-muted-foreground">Ringkasan laba-rugi · {report.periodLabel}</p>
        </div>
        <Link href="/finance/expenses" className={buttonVariants({ variant: "outline" })}>
          <Wallet /> Catat Biaya
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/finance?period=${p.key}`}
            className={cn(buttonVariants({ variant: p.key === period ? "default" : "outline", size: "sm" }))}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Pendapatan"
          value={formatRupiah(totalRevenue)}
          hint="Total omzet periode ini"
          tone="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Laba Kotor"
          value={formatRupiah(grossProfit)}
          hint={`Margin ${grossMargin}%`}
          tone="emerald"
        />
        <StatCard
          icon={LineChart}
          label="Laba Bersih"
          value={formatRupiah(report.estimatedNet)}
          hint={report.estimatedNet >= 0 ? "Setelah biaya" : "Rugi periode ini"}
          tone={report.estimatedNet >= 0 ? "violet" : "rose"}
        />
        <StatCard
          icon={Receipt}
          label="Biaya"
          value={formatRupiah(report.expenseTotal)}
          hint="Operasional periode ini"
          tone="amber"
        />
      </div>

      {/* Perbandingan dengan periode sebelumnya */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perbandingan dengan {previous.periodLabel}</CardTitle>
          <CardDescription>Perubahan {report.periodLabel} terhadap periode sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0.5">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b pb-1.5 text-xs font-medium text-muted-foreground">
            <span>Metrik</span>
            <span className="text-right">{report.periodLabel}</span>
            <span className="text-right">vs {previous.periodLabel}</span>
          </div>
          {compareRows.map((r) => (
            <div key={r.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-1.5 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="text-right font-medium tabular-nums">{formatRupiah(r.cur)}</span>
              <span className="text-right">
                <DeltaBadge cur={r.cur} prev={r.prev} higherIsBetter={r.higherIsBetter} />
              </span>
            </div>
          ))}
          <p className="pt-1.5 text-xs text-muted-foreground">
            {previous.periodLabel}: pendapatan {formatRupiah(prevRevenue)} · laba bersih {formatRupiah(previous.estimatedNet)}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Estimasi Laba Bersih · {report.periodLabel}</CardDescription>
          <CardTitle className={cn("text-3xl", report.estimatedNet >= 0 ? "text-success" : "text-destructive")}>
            {formatRupiah(report.estimatedNet)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {rows.map((r) => (
            <div key={r.label} className={cn("flex justify-between", r.strong && "border-t pt-1 font-semibold")}>
              <span className="text-muted-foreground">
                {r.label}
                {r.hint ? <span className="ml-1 text-xs">({r.hint})</span> : null}
              </span>
              <span className={cn(r.value < 0 && "text-destructive")}>{formatRupiah(r.value)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kirim Laporan</CardTitle>
          <CardDescription>Kirim ringkasan ini ke WhatsApp (pemilik/grup) atau salin teksnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReportActions reportText={reportText} />
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{reportText}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
