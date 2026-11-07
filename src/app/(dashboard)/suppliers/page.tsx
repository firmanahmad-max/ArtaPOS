import type { Metadata } from "next";
import { Truck, Phone } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { countSuppliers, countSuppliersWithPhone, listSuppliers } from "@/server/suppliers/service";
import { createSupplierAction, deactivateSupplierAction } from "@/server/suppliers/actions";
import { ContactManager } from "@/components/contacts/contact-manager";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Supplier" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { tenantId } = await getAuthContext();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const [suppliers, matched, all, withPhone] = await Promise.all([
    listSuppliers(tenantId, q),
    countSuppliers(tenantId, q),
    countSuppliers(tenantId),
    countSuppliersWithPhone(tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Supplier</h1>
        <p className="text-muted-foreground">Daftar pemasok barang toko Anda.</p>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Truck} label="Total Supplier" value={all.toLocaleString("id-ID")} hint="Pemasok aktif" tone="blue" />
        <StatCard icon={Phone} label="Dengan No. HP" value={String(withPhone)} hint="Bisa dihubungi/WhatsApp" tone="emerald" />
      </div>

      <ContactManager
        items={suppliers}
        createAction={createSupplierAction}
        deleteAction={deactivateSupplierAction}
        editBase="/suppliers"
        noun="Supplier"
        query={q}
        total={matched}
      />
    </div>
  );
}
