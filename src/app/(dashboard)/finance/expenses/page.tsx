import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listExpenses } from "@/server/finance/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExpenseForm, DeleteExpenseButton } from "./expenses-client";

export const metadata: Metadata = { title: "Biaya" };

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "finance.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const expenses = await listExpenses(user.tenantId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/finance" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Biaya Operasional</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Catat Biaya Baru</CardTitle></CardHeader>
        <CardContent><AddExpenseForm /></CardContent>
      </Card>

      <Card className="overflow-x-auto">
        {expenses.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Belum ada biaya tercatat.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Kategori</th>
                <th className="p-3 font-medium">Keterangan</th>
                <th className="p-3 text-right font-medium">Jumlah</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3 text-muted-foreground">{e.description || "—"}</td>
                  <td className="p-3 text-right font-medium">{formatRupiah(e.amount)}</td>
                  <td className="p-3 text-right"><DeleteExpenseButton id={e.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
