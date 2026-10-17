import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BellRing } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listCatalog } from "@/server/service-catalog/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CatalogManager } from "./catalog-manager";

export const metadata: Metadata = { title: "Katalog Jasa" };

export default async function ServiceCatalogPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const items = await listCatalog(user.tenantId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/service" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Katalog Jasa</h1>
          <p className="text-sm text-muted-foreground">
            Jasa servis standar beserta harga &amp; interval perawatan. Jasa berinterval akan muncul di Pengingat Servis
            setelah jatuh tempo.
          </p>
        </div>
        <Link href="/service/reminders" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <BellRing /> Pengingat Servis
        </Link>
      </div>
      <CatalogManager
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          intervalMonths: i.intervalMonths,
          isActive: i.isActive,
        }))}
      />
    </div>
  );
}
