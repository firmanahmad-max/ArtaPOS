import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // DAL: enforce auth + tenant aktif (redirect ke /login jika tidak valid).
  const user = await getCurrentUser();

  // Badge perhatian di sidebar: produk yang perlu restock (stok ≤ minimum).
  const lowStock = await db.product.count({
    where: {
      tenantId: user.tenantId,
      isActive: true,
      minStock: { gt: 0 },
      stock: { lte: db.product.fields.minStock },
    },
  });

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        storeName: user.tenant.name,
      }}
      badges={{ "/inventory": lowStock }}
    >
      {children}
    </AppShell>
  );
}
