"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { setSuperAdminAction } from "@/server/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  tenantName: string;
  lockedByEnv: boolean;
}

export function AccessClient({
  initialQuery,
  currentUserId,
  users,
}: {
  initialQuery: string;
  currentUserId: string;
  users: UserRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q ? `/admin/access?q=${encodeURIComponent(q)}` : "/admin/access");
  };

  const toggle = (u: UserRow) => {
    setPendingId(u.id);
    start(async () => {
      const r = await setSuperAdminAction(u.id, !u.isSuperAdmin);
      setPendingId(null);
      if (r.ok) router.refresh();
      else alert(r.message ?? "Gagal.");
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / email pengguna…" className="pl-9" />
      </form>

      {users.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Tidak ada pengguna cocok.</Card>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const busy = pendingId === u.id;
            return (
              <Card key={u.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {u.name}
                    {u.id === currentUserId && <span className="text-xs text-muted-foreground">(Anda)</span>}
                    {u.isSuperAdmin && <Badge variant="default">Admin Platform</Badge>}
                    {!u.isActive && <Badge variant="muted">Nonaktif</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.email} · {u.tenantName} · {ROLE_LABELS[u.role]}
                  </p>
                </div>
                {u.lockedByEnv ? (
                  <Badge variant="secondary" title="Ditetapkan lewat env SUPER_ADMIN_EMAILS">terkunci (env)</Badge>
                ) : (
                  <Button
                    variant={u.isSuperAdmin ? "outline" : "default"}
                    size="sm"
                    disabled={busy || (u.id === currentUserId && u.isSuperAdmin)}
                    onClick={() => toggle(u)}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : u.isSuperAdmin ? <ShieldOff /> : <ShieldCheck />}
                    {u.isSuperAdmin ? "Cabut Admin" : "Jadikan Admin"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Pengguna yang emailnya terdaftar di <code>SUPER_ADMIN_EMAILS</code> selalu admin dan tak bisa dicabut dari sini.
      </p>
    </div>
  );
}
