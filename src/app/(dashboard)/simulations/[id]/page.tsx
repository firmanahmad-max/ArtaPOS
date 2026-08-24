import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getSimulation, listProductsForSim, listCustomersForSim } from "@/server/build-sim/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimulationEditor } from "../simulation-editor";

export const metadata: Metadata = { title: "Detail Simulasi" };

export default async function SimulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [sim, products, customers] = await Promise.all([
    getSimulation(user.tenantId, id),
    listProductsForSim(user.tenantId),
    listCustomersForSim(user.tenantId),
  ]);
  if (!sim) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/simulations" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{sim.number}</h1>
          <p className="text-sm text-muted-foreground">{sim.name}</p>
        </div>
      </div>

      <SimulationEditor
        products={products}
        customers={customers}
        storeName={user.tenant.name}
        initial={{
          id: sim.id,
          number: sim.number,
          status: sim.status,
          name: sim.name,
          customerId: sim.customerId,
          customerName: sim.customerName,
          customerPhone: sim.customerPhone,
          budget: sim.budget,
          buildFee: sim.buildFee,
          note: sim.note,
          createdAt: sim.createdAt.toISOString(),
          importedBuildId: sim.importedBuildId,
          items: sim.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            costPrice: i.costPrice,
            sellPrice: i.sellPrice,
          })),
        }}
      />
    </div>
  );
}
