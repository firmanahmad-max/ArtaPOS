import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getPurchase } from "@/server/purchasing/service";
import { listSuppliers } from "@/server/suppliers/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordPaymentForm } from "../payment-form";
import {
  PurchaseHeaderForm,
  DeletePurchaseButton,
  DeletePaymentButton,
} from "../purchase-edit";
import { formatLocalDate, formatLocalDateTime, dayKey } from "@/lib/timezone";

export const metadata: Metadata = { title: "Detail Pembelian" };

const PAY: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  PAID: { label: "Lunas", variant: "success" },
  PARTIAL: { label: "Sebagian", variant: "warning" },
  UNPAID: { label: "Belum bayar", variant: "destructive" },
};

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [purchase, suppliers] = await Promise.all([
    getPurchase(user.tenantId, id),
    listSuppliers(user.tenantId),
  ]);
  if (!purchase) notFound();

  const outstanding = purchase.total - purchase.paidAmount;
  const s = PAY[purchase.paymentStatus] ?? PAY.UNPAID;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchasing" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{purchase.number}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Tanggal</span>
          <span className="text-right">
            {formatLocalDateTime(purchase.createdAt, { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="text-muted-foreground">Supplier</span>
          <span className="text-right">{purchase.supplierName || "—"}</span>
          <span className="text-muted-foreground">Jatuh tempo</span>
          <span className="text-right">
            {purchase.dueDate ? formatLocalDate(purchase.dueDate, { dateStyle: "medium" }) : "—"}
          </span>
          <span className="text-muted-foreground">Dibuat oleh</span>
          <span className="text-right">{purchase.createdByName ?? "—"}</span>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Produk</th>
              <th className="p-3 text-center font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Harga Beli</th>
              <th className="p-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="p-3">{it.productName}</td>
                <td className="p-3 text-center">{it.qty}</td>
                <td className="p-3 text-right">{formatRupiah(it.costPrice)}</td>
                <td className="p-3 text-right">{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardContent className="space-y-1 pt-6 text-sm">
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(purchase.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dibayar</span>
            <span>{formatRupiah(purchase.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>Sisa Utang</span>
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>{formatRupiah(outstanding)}</span>
          </div>
        </CardContent>
      </Card>

      {purchase.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {purchase.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                <span className="text-muted-foreground">
                  {formatLocalDateTime(p.createdAt, { dateStyle: "short", timeStyle: "short" })}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  {formatRupiah(p.amount)}
                  <DeletePaymentButton purchaseId={purchase.id} paymentId={p.id} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {outstanding > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bayar Utang</CardTitle>
          </CardHeader>
          <CardContent>
            <RecordPaymentForm purchaseId={purchase.id} outstanding={outstanding} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ubah Data Pembelian</CardTitle>
          <p className="text-sm text-muted-foreground">
            Perbaiki supplier, jatuh tempo, atau catatan. Untuk salah item/qty/harga, hapus pembelian ini lalu buat ulang.
          </p>
        </CardHeader>
        <CardContent>
          <PurchaseHeaderForm
            purchaseId={purchase.id}
            suppliers={suppliers.map((sup) => ({ id: sup.id, name: sup.name }))}
            initial={{
              supplierId: purchase.supplierId,
              dueDate: purchase.dueDate ? dayKey(purchase.dueDate) : null,
              note: purchase.note,
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Hapus Pembelian</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mengembalikan stok yang ditambahkan dan menghapus dokumen ini{purchase.payments.length > 0 ? " beserta pembayarannya" : ""}. Gunakan untuk mengoreksi salah input.
          </p>
        </CardHeader>
        <CardContent>
          <DeletePurchaseButton
            purchaseId={purchase.id}
            number={purchase.number}
            hasPayments={purchase.payments.length > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
