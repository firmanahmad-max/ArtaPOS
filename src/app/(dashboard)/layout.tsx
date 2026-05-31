import { getCurrentUser } from "@/lib/auth/dal";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // DAL: enforce auth + tenant aktif (redirect ke /login jika tidak valid).
  const user = await getCurrentUser();

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        storeName: user.tenant.name,
      }}
    >
      {children}
    </AppShell>
  );
}
