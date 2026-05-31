import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listProductsForSale } from "@/server/pos/service";
import { listCustomers } from "@/server/customers/service";
import { Card } from "@/components/ui/card";
import { PosTerminal } from "./pos-terminal";

export const metadata: Metadata = { title: "Penjualan (POS)" };

export default async function PosPage() {
  const user = await getCurrentUser();

  if (!can(user.role, "pos.use")) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Anda tidak punya izin mengakses kasir.
      </Card>
    );
  }

  const [products, customers] = await Promise.all([
    listProductsForSale(user.tenantId),
    listCustomers(user.tenantId),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Penjualan (POS)</h1>
      <PosTerminal
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          sellPrice: p.sellPrice,
          stock: p.stock,
          unit: p.unit,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
