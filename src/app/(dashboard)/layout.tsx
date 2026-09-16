import { getCurrentUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";
import { getOpenShift } from "@/server/shift/service";
import { AppShell } from "@/components/layout/app-shell";
import { QuickStart } from "@/components/onboarding/quick-start";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // DAL: enforce auth + tenant aktif (redirect ke /login jika tidak valid).
  const user = await getCurrentUser();

  // Badge perhatian di sidebar: produk yang perlu restock (stok ≤ minimum).
  // Shift kasir berjalan (untuk chip header).
  const [lowStock, openShift] = await Promise.all([
    db.product.count({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        minStock: { gt: 0 },
        stock: { lte: db.product.fields.minStock },
      },
    }),
    getOpenShift(user.tenantId, user.id),
  ]);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        storeName: user.tenant.name,
        isSuperAdmin: isPlatformAdmin(user),
      }}
      badges={{ "/inventory": lowStock }}
      shift={openShift ? { openedAt: openShift.openedAt.toISOString() } : null}
    >
      {children}
      <QuickStart />
    </AppShell>
  );
}
