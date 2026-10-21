import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getBuild, getBuildCustomerPhone, listProductsForBuild } from "@/server/pcbuild/service";
import { ensurePortalToken } from "@/server/portal/service";
import { jobLoyaltyInfo } from "@/server/customers/service";
import { listUnitsForBuild, unitRefsFor } from "@/server/pcbuild/units";
import { unitKindOf } from "@/lib/build-units";
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
  const [build, products, units] = await Promise.all([
    getBuild(user.tenantId, id),
    listProductsForBuild(user.tenantId),
    listUnitsForBuild(user.tenantId),
  ]);
  if (!build) notFound();
  const [refs, customerPhone, portalToken] = await Promise.all([
    unitRefsFor(user.tenantId, build.items),
    getBuildCustomerPhone(user.tenantId, build.customerId),
    // Link Portal Member dibuat MALAS untuk pelanggan terdaftar (ikut pesan WA).
    build.customerId ? ensurePortalToken(user.tenantId, build.customerId).catch(() => null) : null,
  ]);

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
        <Link
          href={`/pc-build/${build.id}/nota`}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} ml-auto`}
        >
          <Printer /> Cetak Nota
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Pilih komponen dari inventory (otomatis memotong stok) atau dari Barang Bekas / Titip Jual,
          atur jasa rakit, lalu ubah status seiring proses perakitan.
        </CardContent>
      </Card>

      <BuildDetail
        build={{
          id: build.id,
          status: build.status,
          buildFee: build.buildFee,
          componentsCost: build.componentsCost,
          discount: build.discount,
          total: build.total,
          paid: build.paid,
          items: build.items.map((i) => {
            const kind = unitKindOf(i);
            return {
              id: i.id,
              productName: i.productName,
              qty: i.qty,
              price: i.price,
              subtotal: i.subtotal,
              unit: kind ? { kind, ref: refs.get(i.usedItemId ?? i.consignmentItemId ?? "") ?? null } : null,
            };
          }),
        }}
        products={products.map((p) => ({ id: p.id, name: p.name, sellPrice: p.sellPrice, stock: p.stock }))}
        units={units}
        notify={{
          storeName: user.tenant.name,
          number: build.number,
          name: build.name,
          customerName: build.customerName,
          phone: customerPhone,
          portalToken,
        }}
        points={await jobLoyaltyInfo(user.tenantId, build.customerId, { pcBuildId: build.id }, build)}
      />
    </div>
  );
}
