import type { Metadata } from "next";
import { Users, Star, Phone } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { listCustomers } from "@/server/customers/service";
import { createCustomerAction, deactivateCustomerAction } from "@/server/customers/actions";
import { ContactManager } from "@/components/contacts/contact-manager";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Pelanggan" };

export default async function CustomersPage() {
  const { tenantId } = await getAuthContext();
  const customers = await listCustomers(tenantId);
  const totalPoints = customers.reduce((s, c) => s + (c.points ?? 0), 0);
  const withPhone = customers.filter((c) => c.phone).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
        <p className="text-muted-foreground">Daftar pelanggan toko Anda.</p>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Pelanggan" value={String(customers.length)} hint="Terdaftar & aktif" tone="blue" />
        <StatCard icon={Star} label="Total Poin Loyalitas" value={totalPoints.toLocaleString("id-ID")} hint="Akumulasi semua pelanggan" tone="violet" />
        <StatCard icon={Phone} label="Dengan No. HP" value={String(withPhone)} hint="Bisa dihubungi/WhatsApp" tone="emerald" />
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
