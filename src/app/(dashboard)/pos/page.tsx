import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listProductsForSale } from "@/server/pos/service";
import { listCustomers } from "@/server/customers/service";
import { listConsignmentItemsForSale } from "@/server/consignment/service";
import { listUsedItemsForSale } from "@/server/used-items/service";
import { gradeMeta } from "@/lib/used-item";
import { parseComponents, setContentsText, setSerials } from "@/lib/consignment-set";
import { getLoyaltyConfig } from "@/server/customers/service";
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

  const [products, customers, consignmentItems, usedItems, loyalty] = await Promise.all([
    listProductsForSale(user.tenantId),
    listCustomers(user.tenantId),
    listConsignmentItemsForSale(user.tenantId),
    listUsedItemsForSale(user.tenantId),
    getLoyaltyConfig(user.tenantId),
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
          minStock: p.minStock,
          unit: p.unit,
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, points: c.points }))}
        loyalty={loyalty}
        consignmentItems={consignmentItems.map((ci) => {
          // Barang titipan tampil seperti produk 1 unit; barcode = no. seri (bisa di-scan).
          // Paket/set: no. seri komponen mana pun juga menemukan paketnya.
          const parts = parseComponents(ci.components);
          return {
            id: ci.id,
            name: `${ci.category} ${ci.name}`,
            sku: ci.serialNumber ?? "",
            barcode: ci.serialNumber,
            sellPrice: ci.askingPrice,
            stock: 1,
            minStock: 0,
            unit: null,
            consignment: {
              owner: ci.consignment.customerName,
              number: ci.consignment.number,
              contents: parts.length ? setContentsText(parts) : undefined,
              serials: setSerials(parts),
            },
          };
        })}
        usedItems={usedItems.map((u) => ({
          // Barang bekas tampil seperti produk 1 unit; bisa di-scan via no. seri atau no. BK.
          id: u.id,
          name: `${u.category} ${u.name}`,
          sku: u.serialNumber ?? "",
          barcode: u.serialNumber,
          sellPrice: u.sellPrice,
          stock: 1,
          minStock: 0,
          unit: null,
          used: { number: u.number, gradeCode: gradeMeta(u.grade).code, warrantyDays: u.warrantyDays },
        }))}
      />
    </div>
  );
}
