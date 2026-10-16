import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getUsedItem } from "@/server/used-items/service";
import { dayKey } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UsedItemForm } from "../../used-item-form";

export const metadata: Metadata = { title: "Ubah Barang Bekas" };

export default async function EditUsedItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const it = await getUsedItem(user.tenantId, id);
  if (!it) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/used-items/${it.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Ubah <span className="font-mono">{it.number}</span>
        </h1>
      </div>
      <UsedItemForm
        id={it.id}
        priceLocked={it.status !== "AVAILABLE"}
        initial={{
          category: it.category,
          name: it.name,
          serialNumber: it.serialNumber ?? "",
          grade: it.grade,
          condition: it.condition ?? "",
          completeness: it.completeness ?? "",
          specs: it.specs ?? "",
          costPrice: it.costPrice,
          sellPrice: it.sellPrice,
          warrantyDays: it.warrantyDays,
          source: it.source,
          sourceName: it.sourceName ?? "",
          sourcePhone: it.sourcePhone ?? "",
          acquiredAt: dayKey(it.acquiredAt),
          note: it.note ?? "",
        }}
      />
    </div>
  );
}
