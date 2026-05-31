import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getFinanceReport } from "@/server/finance/service";
import { buildReportText } from "@/lib/whatsapp";
import { formatRupiah } from "@/lib/utils";
import type { ReportPeriod } from "@/lib/validations/finance";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Keuangan" };

const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "today", label: "Hari Ini" },
  { key: "month", label: "Bulan Ini" },
  { key: "year", label: "Tahun Ini" },
];

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
  const period: ReportPeriod = rawPeriod === "today" || rawPeriod === "year" ? rawPeriod : "month";

  const report = await getFinanceReport(user.tenantId, period);
  const reportText = buildReportText(user.tenant.name, report);

  const rows = [
    { label: "Penjualan (omzet)", value: report.salesRevenue, hint: `${report.salesCount} transaksi` },
    { label: "HPP (modal terjual)", value: -report.salesCogs },
    { label: "Laba kotor penjualan", value: report.salesGrossProfit, strong: true },
    { label: "Pendapatan servis", value: report.serviceRevenue, hint: `${report.serviceCount} tiket` },
    { label: "Pendapatan rakit PC", value: report.buildRevenue, hint: `${report.buildCount} rakitan` },
    { label: "Biaya operasional", value: -report.expenseTotal },
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

      <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardDescription>Estimasi Laba Bersih</CardDescription>
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
