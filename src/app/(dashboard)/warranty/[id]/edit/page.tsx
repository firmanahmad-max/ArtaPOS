import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getWarranty, listProductsForWarranty } from "@/server/warranty/service";
import { listCustomers } from "@/server/customers/service";
import { updateWarrantyAction } from "@/server/warranty/actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteWarrantyButton, RegisterWarrantyForm } from "../../warranty-client";

export const metadata: Metadata = { title: "Ubah Garansi" };

/** "YYYY-MM-DD" tanggal WIB untuk input type=date. */
function dateInput(d: Date): string {
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export default async function EditWarrantyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [w, products, customers] = await Promise.all([
    getWarranty(user.tenantId, id),
    listProductsForWarranty(user.tenantId),
    listCustomers(user.tenantId),
  ]);
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/warranty" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Ubah Garansi</h1>
          <p className="truncate font-mono text-sm text-muted-foreground">{w.serialNumber}</p>
        </div>
        {w.rmaClaims.length === 0 && (
          <DeleteWarrantyButton id={w.id} label={`${w.productName} · ${w.serialNumber}`} redirectTo="/warranty" />
        )}
      </div>

      {w.rmaClaims.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          Unit ini punya klaim RMA ({w.rmaClaims.map((r) => r.number).join(", ")}), jadi tidak bisa dihapus. Data masih bisa
          diubah.
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Garansi</CardTitle>
        </CardHeader>
        <CardContent>
          <RegisterWarrantyForm
            products={products.map((p) => ({ id: p.id, name: p.name, warrantyMonths: p.warrantyMonths }))}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            action={updateWarrantyAction.bind(null, w.id)}
            submitLabel="Simpan Perubahan"
            initial={{
              productId: w.productId,
              productName: w.productName,
              serialNumber: w.serialNumber,
              warrantyMonths: w.warrantyMonths,
              customerId: w.customerId,
              soldAt: dateInput(w.soldAt),
              saleNumber: w.saleNumber ?? "",
              note: w.note ?? "",
            }}
          />
          <p className="mt-4 text-xs text-muted-foreground">
            Tanggal berakhir garansi dihitung ulang dari tanggal jual + masa garansi. Kartu garansi digital (QR) tetap sama dan
            langsung menampilkan data terbaru.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
