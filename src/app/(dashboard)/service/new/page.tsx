import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can, hasRoleAtLeast } from "@/lib/rbac";
import { listCustomers } from "@/server/customers/service";
import { listUsers } from "@/server/users/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TicketForm } from "../ticket-form";

export const metadata: Metadata = { title: "Tiket Servis Baru" };

export default async function NewTicketPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [customers, users] = await Promise.all([
    listCustomers(user.tenantId),
    listUsers(user.tenantId),
  ]);
  // Teknisi = semua user (teknisi/admin/owner bisa ditugaskan).
  const technicians = users.filter((u) => u.role === "TEKNISI" || hasRoleAtLeast(u.role, "ADMIN"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/service" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tiket Servis Baru</h1>
      </div>
      <TicketForm
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        technicians={technicians.map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
