import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getProduct } from "@/server/inventory/service";
import { buttonVariants } from "@/components/ui/button";
import { BarcodeLabel } from "@/components/barcode/barcode-label";

export const metadata: Metadata = { title: "Label Barcode" };

export default async function LabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const product = await getProduct(user.tenantId, id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="no-print flex items-center gap-3">
        <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Label Barcode</h1>
      </div>

      <BarcodeLabel
        storeName={user.tenant.name}
        productName={product.name}
        code={product.barcode || product.sku}
        price={product.sellPrice}
      />
    </div>
  );
}
