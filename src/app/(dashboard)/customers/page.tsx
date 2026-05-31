import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth/guard";
import { listCustomers } from "@/server/customers/service";
import { createCustomerAction, deactivateCustomerAction } from "@/server/customers/actions";
import { ContactManager } from "@/components/contacts/contact-manager";

export const metadata: Metadata = { title: "Pelanggan" };

export default async function CustomersPage() {
  const { tenantId } = await getAuthContext();
  const customers = await listCustomers(tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
        <p className="text-muted-foreground">Daftar pelanggan toko Anda.</p>
      </div>
      <ContactManager
        items={customers}
        createAction={createCustomerAction}
        deleteAction={deactivateCustomerAction}
        editBase="/customers"
        noun="Pelanggan"
      />
    </div>
  );
}
