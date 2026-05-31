import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getBuild, listProductsForBuild } from "@/server/pcbuild/service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BuildDetail } from "../build-detail";

export const metadata: Metadata = { title: "Detail Rakitan" };

export default async function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [build, products] = await Promise.all([
    getBuild(user.tenantId, id),
    listProductsForBuild(user.tenantId),
  ]);
  if (!build) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pc-build" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{build.number}</h1>
          <p className="text-sm text-muted-foreground">
            {build.name}
            {build.customerName ? ` · ${build.customerName}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Pilih komponen dari inventory (otomatis memotong stok), atur jasa rakit, lalu ubah status
          seiring proses perakitan.
        </CardContent>
      </Card>

      <BuildDetail
        build={{
          id: build.id,
          status: build.status,
          buildFee: build.buildFee,
          componentsCost: build.componentsCost,
          total: build.total,
          paid: build.paid,
          items: build.items.map((i) => ({ id: i.id, productName: i.productName, qty: i.qty, price: i.price, subtotal: i.subtotal })),
        }}
        products={products.map((p) => ({ id: p.id, name: p.name, sellPrice: p.sellPrice, stock: p.stock }))}
      />
    </div>
  );
}
