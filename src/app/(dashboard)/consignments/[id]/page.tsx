import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getConsignment, saleNumbersFor } from "@/server/consignment/service";
import { summarizeConsignment, soldSplit } from "@/lib/consignment-calc";
import { formatRupiah } from "@/lib/utils";
import { formatLocalDateTime } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsignmentDetail } from "../consignment-detail";

export const metadata: Metadata = { title: "Detail Titip Jual" };

export default async function ConsignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const c = await getConsignment(user.tenantId, id);
  if (!c) notFound();
  const sum = summarizeConsignment(c.items);
  const saleNumbers = await saleNumbersFor(user.tenantId, c.items.map((i) => i.saleId ?? ""));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/consignments" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{c.number}</h1>
        <Link href={`/consignments/${c.id}/nota`} className={`${buttonVariants({ size: "sm" })} ml-auto`}>
          <FileText /> Tanda Titip Jual
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Pemilik: </span>{c.customerName}{c.customerPhone ? ` (${c.customerPhone})` : ""}</div>
          <div><span className="text-muted-foreground">Dititipkan: </span>{formatLocalDateTime(c.createdAt, { dateStyle: "medium", timeStyle: "short" })}</div>
          <div><span className="text-muted-foreground">Masih dititipkan: </span>{sum.available} barang · <span className="font-mono">{formatRupiah(sum.availableValue)}</span></div>
          <div><span className="text-muted-foreground">Terjual: </span>{sum.sold} barang · <span className="font-mono">{formatRupiah(sum.soldValue)}</span>{sum.returned > 0 ? ` · ${sum.returned} diambil kembali` : ""}</div>
          {sum.sold > 0 && (
            <>
              <div><span className="text-muted-foreground">Komisi toko: </span><span className="font-mono">{formatRupiah(sum.commissionTotal)}</span></div>
              <div>
                <span className="text-muted-foreground">Hak pemilik: </span>
                <span className="font-mono">{formatRupiah(sum.ownerShareTotal)}</span>
                {sum.ownerOwed > 0 ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400"> · belum dibayar {formatRupiah(sum.ownerOwed)}</span>
                ) : (
                  <span className="text-success"> · lunas</span>
                )}
              </div>
            </>
          )}
          {c.note && <div className="sm:col-span-2"><span className="text-muted-foreground">Catatan: </span>{c.note}</div>}
        </CardContent>
      </Card>

      <ConsignmentDetail
        consignmentId={c.id}
        ownerOwed={sum.ownerOwed}
        items={c.items.map((i) => {
          const split = i.status === "SOLD" ? soldSplit(i) : null;
          return {
            id: i.id,
            category: i.category,
            name: i.name,
            serialNumber: i.serialNumber,
            condition: i.condition,
            askingPrice: i.askingPrice,
            status: i.status,
            soldPrice: i.soldPrice,
            statusAtText: i.statusAt ? formatLocalDateTime(i.statusAt, { dateStyle: "medium" }) : null,
            commissionType: i.commissionType,
            commissionValue: i.commissionValue,
            storeCommission: split?.commission ?? null,
            ownerShare: split?.ownerShare ?? null,
            saleId: i.saleId,
            saleNumber: i.saleId ? (saleNumbers.get(i.saleId) ?? null) : null,
            ownerPaidAtText: i.ownerPaidAt ? formatLocalDateTime(i.ownerPaidAt, { dateStyle: "medium" }) : null,
          };
        })}
      />
    </div>
  );
}
