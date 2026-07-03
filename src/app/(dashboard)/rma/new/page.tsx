import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listProductsForWarranty, listWarranties } from "@/server/warranty/service";
import { listSuppliers } from "@/server/suppliers/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RmaForm } from "../rma-form";

export const metadata: Metadata = { title: "Klaim RMA Baru" };

export default async function NewRmaPage({
  searchParams,
}: {
  searchParams: Promise<{ wu?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { wu } = await searchParams;
  const [products, suppliers, warranties] = await Promise.all([
    listProductsForWarranty(user.tenantId),
    listSuppliers(user.tenantId),
    listWarranties(user.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/rma" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Klaim RMA Baru</h1>
      </div>
      <RmaForm
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        warranties={warranties.map((w) => ({
          id: w.id,
          productName: w.productName,
          serialNumber: w.serialNumber,
          customerName: w.customerName,
        }))}
        defaultWarrantyUnitId={wu}
      />
    </div>
  );
}
