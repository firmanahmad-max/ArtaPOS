import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Wallet, FileText, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listReceivables } from "@/server/pos/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatLocalDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Piutang" };

export default async function ReceivablesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const receivables = await listReceivables(user.tenantId);
  const totalOutstanding = receivables.reduce((s, r) => s + r.outstanding, 0);
  const overdueCount = receivables.filter((r) => r.overdue).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Piutang Pelanggan</h1>
        <p className="text-muted-foreground">Penjualan kredit yang belum lunas.</p>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Total Piutang Berjalan"
          value={formatRupiah(totalOutstanding)}
          hint="Belum tertagih"
          tone="rose"
        />
        <StatCard
          icon={FileText}
          label="Jumlah Tagihan"
          value={String(receivables.length)}
          hint="Faktur kredit terbuka"
          tone="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Lewat Tempo"
          value={String(overdueCount)}
          hint="Sudah jatuh tempo"
          tone="amber"
        />
      </div>

      {receivables.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="text-sm text-muted-foreground">Tidak ada piutang. Semua lunas. 🎉</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Pelanggan</th>
                <th className="p-3 font-medium">Jatuh Tempo</th>
                <th className="p-3 text-right font-medium">Sisa Piutang</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 font-medium">{r.number}</td>
                  <td className="p-3 text-muted-foreground">{r.customerName || "—"}</td>
                  <td className="p-3">
                    {r.dueDate ? (
                      <span className="flex items-center gap-2">
                        {formatLocalDate(r.dueDate, { dateStyle: "medium" })}
                        {r.overdue && <Badge variant="destructive">Lewat tempo</Badge>}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium text-destructive">{formatRupiah(r.outstanding)}</td>
                  <td className="p-3 text-right">
                    <Link href={`/sales/${r.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Terima
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
