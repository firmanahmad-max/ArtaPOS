import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { getOpname } from "@/server/opname/service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OpnameSheet } from "../opname-sheet";
import { formatLocalDateTime } from "@/lib/timezone";

export const metadata: Metadata = { title: "Detail Opname" };

export default async function OpnameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await getAuthContext();
  const opname = await getOpname(tenantId, id);
  if (!opname) notFound();

  const isDraft = opname.status === "DRAFT";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory/opname" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Stok Opname</h1>
          <Badge variant={isDraft ? "warning" : "success"}>
            {isDraft ? "Draft" : "Selesai"}
          </Badge>
        </div>
      </div>

      {isDraft ? (
        <p className="text-sm text-muted-foreground">
          Masukkan jumlah hasil hitung fisik tiap produk, lalu klik
          &quot;Selesaikan &amp; Terapkan&quot; untuk menyesuaikan stok.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Opname telah diterapkan ke stok pada{" "}
          {opname.completedAt &&
            formatLocalDateTime(opname.completedAt, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          .
        </p>
      )}

      <OpnameSheet
        opnameId={opname.id}
        status={opname.status}
        items={opname.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          systemQty: i.systemQty,
          countedQty: i.countedQty,
        }))}
      />
    </div>
  );
}
