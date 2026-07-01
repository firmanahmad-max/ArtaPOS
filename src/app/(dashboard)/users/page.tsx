import type { Metadata } from "next";
import { Users, UserCheck, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { listUsersFull } from "@/server/users/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { AddUserForm, UserRowActions } from "./users-client";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (!can(me.role, "users.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin mengelola pengguna.</Card>;
  }
  const users = await listUsersFull(me.tenantId);
  const isOwner = me.role === "OWNER";
  const activeCount = users.filter((u) => u.isActive).length;
  const ownerCount = users.filter((u) => u.role === "OWNER").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
        <p className="text-muted-foreground">Kelola akun & peran karyawan toko.</p>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Pengguna" value={String(users.length)} hint="Akun karyawan" tone="blue" />
        <StatCard icon={UserCheck} label="Aktif" value={String(activeCount)} hint="Bisa masuk sistem" tone="emerald" />
        <StatCard icon={ShieldCheck} label="Pemilik" value={String(ownerCount)} hint="Akses penuh (OWNER)" tone="violet" />
      </div>

      <Card>
        <CardHeader><CardTitle>Tambah Pengguna</CardTitle></CardHeader>
        <CardContent><AddUserForm isOwner={isOwner} /></CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Nama</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Peran & Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  {u.name} {u.id === me.id && <span className="text-xs text-muted-foreground">(Anda)</span>}
                </td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  {u.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="muted">Nonaktif</Badge>}
                </td>
                <td className="p-3">
                  <UserRowActions userId={u.id} role={u.role} isActive={u.isActive} isSelf={u.id === me.id} isOwner={isOwner} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Peran: {Object.values(ROLE_LABELS).join(" · ")}. Pemilik akses penuh; Admin operasional; Kasir penjualan; Teknisi servis/rakit.
      </p>
    </div>
  );
}
