import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { reorderSuggestions } from "@/server/purchasing/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Saran Pembelian" };

export default async function ReorderPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const items = await reorderSuggestions(user.tenantId);
  const estTotal = items.reduce((s, i) => s + i.suggestedQty * i.costPrice, 0);
  const prefill = items.map((i) => `${i.id}:${i.suggestedQty}`).join(",");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/purchasing" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saran Pembelian</h1>
            <p className="text-muted-foreground">Produk di bawah stok minimum + saran jumlah beli.</p>
          </div>
        </div>
        {items.length > 0 && (
          <Link href={`/purchasing/new?items=${encodeURIComponent(prefill)}`} className={buttonVariants({})}>
            <ShoppingBag /> Buat Pembelian Semua
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <p className="text-sm text-muted-foreground">Semua stok di atas minimum. Tidak perlu restock. 🎉</p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Perkiraan biaya restock (harga modal): <span className="font-medium text-foreground">{formatRupiah(estTotal)}</span>
          </p>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3 font-medium">Produk</th>
                  <th className="p-3 text-center font-medium">Stok / Min</th>
                  <th className="p-3 text-center font-medium">Terjual 30 hr</th>
                  <th className="p-3 text-center font-medium">Saran Beli</th>
                  <th className="p-3 text-right font-medium">Est. Biaya</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3">
                      <Link href={`/inventory/${i.id}/edit`} className="font-medium hover:underline">{i.name}</Link>
                      <div className="text-xs text-muted-foreground">{i.sku}</div>
                    </td>
                    <td className="p-3 text-center">
                      {i.stock <= 0 ? <Badge variant="destructive">Habis</Badge> : <span>{i.stock}</span>}
                      <span className="text-muted-foreground"> / {i.minStock}</span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{i.sold30}</td>
                    <td className="p-3 text-center font-semibold text-primary">{i.suggestedQty}</td>
                    <td className="p-3 text-right">{formatRupiah(i.suggestedQty * i.costPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
