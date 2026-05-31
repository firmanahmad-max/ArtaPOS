import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth/guard";
import { listSuppliers } from "@/server/suppliers/service";
import { createSupplierAction, deactivateSupplierAction } from "@/server/suppliers/actions";
import { ContactManager } from "@/components/contacts/contact-manager";

export const metadata: Metadata = { title: "Supplier" };

export default async function SuppliersPage() {
  const { tenantId } = await getAuthContext();
  const suppliers = await listSuppliers(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supplier</h1>
        <p className="text-muted-foreground">Daftar pemasok barang toko Anda.</p>
      </div>
      <ContactManager
        items={suppliers}
        createAction={createSupplierAction}
        deleteAction={deactivateSupplierAction}
        editBase="/suppliers"
        noun="Supplier"
      />
    </div>
  );
}
