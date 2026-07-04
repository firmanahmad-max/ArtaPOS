import { listTenants } from "@/server/platform/service";
import { TenantsClient } from "./tenants-client";

export default async function AdminTenantsPage() {
  const tenants = await listTenants();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Toko & Lisensi</h1>
        <p className="text-muted-foreground">Kelola paket lisensi, status, dan aktivasi setiap toko.</p>
      </div>
      <TenantsClient
        tenants={tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          isActive: t.isActive,
          createdAt: t.createdAt.toISOString(),
          users: t._count.users,
          license: t.license
            ? {
                plan: t.license.plan,
                status: t.license.status,
                maxTransactions: t.license.maxTransactions,
                transactionsUsed: t.license.transactionsUsed,
                validUntil: t.license.validUntil ? t.license.validUntil.toISOString() : null,
              }
            : null,
        }))}
      />
    </div>
  );
}
