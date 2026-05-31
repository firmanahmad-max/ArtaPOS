import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { listCategories, listUnits, ensureDefaultUnits } from "@/server/inventory/service";
import { createProductAction } from "@/server/inventory/actions";
import { buttonVariants } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Tambah Produk" };

export default async function NewProductPage() {
  const { tenantId } = await getAuthContext();
  await ensureDefaultUnits(tenantId);
  const [categories, units] = await Promise.all([
    listCategories(tenantId),
    listUnits(tenantId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk</h1>
      </div>
      <ProductForm
        mode="create"
        action={createProductAction}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
      />
    </div>
  );
}
