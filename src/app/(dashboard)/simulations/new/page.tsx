import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listProductsForSim, listCustomersForSim } from "@/server/build-sim/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimulationEditor } from "../simulation-editor";

export const metadata: Metadata = { title: "Simulasi Baru" };

export default async function NewSimulationPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [products, customers] = await Promise.all([
    listProductsForSim(user.tenantId),
    listCustomersForSim(user.tenantId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/simulations" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Simulasi Baru</h1>
      </div>
      <SimulationEditor products={products} customers={customers} storeName={user.tenant.name} initial={null} />
    </div>
  );
}
