import { getCurrentUser } from "@/lib/auth/dal";
import { listUsersForAccess } from "@/server/platform/service";
import { isEnvSuperAdmin } from "@/lib/auth/super-admin";
import { AccessClient } from "./access-client";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [me, users] = await Promise.all([getCurrentUser(), listUsersForAccess(q)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akses Admin Platform</h1>
        <p className="text-muted-foreground">
          Beri atau cabut akses Dashboard Admin (lintas-toko) untuk pengguna tepercaya.
        </p>
      </div>
      <AccessClient
        initialQuery={q ?? ""}
        currentUserId={me.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          isSuperAdmin: u.isSuperAdmin,
          tenantName: u.tenant.name,
          lockedByEnv: isEnvSuperAdmin(u.email),
        }))}
      />
    </div>
  );
}
