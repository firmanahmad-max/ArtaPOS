import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listCustomers } from "@/server/customers/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BuildForm } from "../build-form";

export const metadata: Metadata = { title: "Rakitan Baru" };

export default async function NewBuildPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const customers = await listCustomers(user.tenantId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pc-build" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Rakitan Baru</h1>
      </div>
      <BuildForm customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
