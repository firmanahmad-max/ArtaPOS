"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { createUserAction, updateUserRoleAction, setUserActiveAction } from "@/server/admin/actions";
import { ROLE_LABELS } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const ROLES: UserRole[] = ["OWNER", "ADMIN", "KASIR", "TEKNISI"];

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUserAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <Input name="name" placeholder="Nama lengkap" required />
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="password" type="password" placeholder="Password (min 8)" required />
      <Select name="role" defaultValue="KASIR" className="h-10">
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </Select>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Tambah Pengguna
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
        {state?.errors && (
          <span className="text-sm text-destructive">
            {Object.values(state.errors)[0]?.[0]}
          </span>
        )}
      </div>
    </form>
  );
}

export function UserRowActions({
  userId,
  role,
  isActive,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const changeRole = (newRole: UserRole) => {
    setErr(null);
    start(async () => {
      const r = await updateUserRoleAction(userId, newRole);
      if (r.ok) router.refresh();
      else setErr(r.message ?? "Gagal");
    });
  };
  const toggleActive = () => {
    setErr(null);
    start(async () => {
      const r = await setUserActiveAction(userId, !isActive);
      if (r.ok) router.refresh();
      else setErr(r.message ?? "Gagal");
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {err && <span className="text-xs text-destructive">{err}</span>}
      <Select
        value={role}
        disabled={pending}
        onChange={(e) => changeRole(e.target.value as UserRole)}
        className="h-8 w-28"
      >
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
      </Select>
      <Button variant="outline" size="sm" disabled={pending || isSelf} onClick={toggleActive}>
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>
    </div>
  );
}
