import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { getProduct, listCategories, listUnits } from "@/server/inventory/service";
import { updateProductAction } from "@/server/inventory/actions";
import { buttonVariants } from "@/components/ui/button";
import { ProductForm } from "../../product-form";
import { StockAdjustForm } from "../../stock-adjust-form";

export const metadata: Metadata = { title: "Edit Produk" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await getAuthContext();

  const product = await getProduct(tenantId, id);
  if (!product) notFound();

  const [categories, units] = await Promise.all([
    listCategories(tenantId),
    listUnits(tenantId),
  ]);

  // Bind productId ke action update.
  const action = updateProductAction.bind(null, product.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Produk</h1>
      </div>

      <ProductForm
        mode="edit"
        action={action}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        units={units.map((u) => ({ id: u.id, name: u.name }))}
        initial={{
          sku: product.sku,
          barcode: product.barcode ?? "",
          name: product.name,
          categoryId: product.categoryId ?? "",
          unitId: product.unitId ?? "",
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          minStock: product.minStock,
          warrantyMonths: product.warrantyMonths,
          stock: product.stock,
        }}
      />

      <StockAdjustForm productId={product.id} currentStock={product.stock} />
    </div>
  );
}
