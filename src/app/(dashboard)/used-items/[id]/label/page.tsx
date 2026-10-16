import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getUsedItem } from "@/server/used-items/service";
import { gradeMeta } from "@/lib/used-item";
import { buttonVariants } from "@/components/ui/button";
import { BarcodeLabel } from "@/components/barcode/barcode-label";

export const metadata: Metadata = { title: "Label Barang Bekas" };

/** Label barcode berisi no. BK — bisa di-scan langsung di kasir. */
export default async function UsedItemLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const it = await getUsedItem(user.tenantId, id);
  if (!it) notFound();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="no-print flex items-center gap-3">
        <Link href={`/used-items/${it.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Label Barang Bekas</h1>
      </div>

      <BarcodeLabel
        storeName={user.tenant.name}
        productName={`${it.category} ${it.name} · Bekas ${gradeMeta(it.grade).code}`}
        code={it.number}
        price={it.sellPrice}
      />
    </div>
  );
}
