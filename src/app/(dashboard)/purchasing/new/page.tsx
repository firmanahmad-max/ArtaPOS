import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listProductsForPurchase } from "@/server/purchasing/service";
import { listSuppliers } from "@/server/suppliers/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PurchaseForm } from "../purchase-form";

export const metadata: Metadata = { title: "Pembelian Baru" };

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [products, suppliers] = await Promise.all([
    listProductsForPurchase(user.tenantId),
    listSuppliers(user.tenantId),
  ]);

  // Prefill dari saran pembelian: ?items=id:qty,id:qty
  const { items } = await searchParams;
  const initialItems = (items ?? "")
    .split(",")
    .map((pair) => {
      const [productId, qtyStr] = pair.split(":");
      return { productId: productId?.trim() ?? "", qty: Number(qtyStr) || 1 };
    })
    .filter((it) => it.productId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchasing" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Pembelian Baru</h1>
      </div>
      <PurchaseForm
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, costPrice: p.costPrice }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        initialItems={initialItems}
      />
    </div>
  );
}
