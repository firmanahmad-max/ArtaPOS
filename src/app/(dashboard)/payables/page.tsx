import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listPayables } from "@/server/purchasing/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Utang" };

export default async function PayablesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const payables = await listPayables(user.tenantId);
  const totalOutstanding = payables.reduce((s, p) => s + p.outstanding, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchasing" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utang Supplier</h1>
          <p className="text-muted-foreground">Pembelian yang belum lunas.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Total Utang Berjalan</CardDescription>
          <CardTitle className="text-3xl">{formatRupiah(totalOutstanding)}</CardTitle>
        </CardHeader>
      </Card>

      {payables.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="text-sm text-muted-foreground">Tidak ada utang. Semua pembelian lunas. 🎉</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Supplier</th>
                <th className="p-3 font-medium">Jatuh Tempo</th>
                <th className="p-3 text-right font-medium">Sisa Utang</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payables.map((p) => {
                const outstanding = p.outstanding;
                const overdue = p.overdue;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-medium">{p.number}</td>
                    <td className="p-3 text-muted-foreground">{p.supplierName || "—"}</td>
                    <td className="p-3">
                      {p.dueDate ? (
                        <span className="flex items-center gap-2">
                          {new Date(p.dueDate).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                          {overdue && <Badge variant="destructive">Lewat tempo</Badge>}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-destructive">{formatRupiah(outstanding)}</td>
                    <td className="p-3 text-right">
                      <Link href={`/purchasing/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Bayar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
