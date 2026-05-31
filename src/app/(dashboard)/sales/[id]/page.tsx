import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getSale } from "@/server/pos/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VoidSaleButton } from "../void-button";
import { ReceivablePaymentForm } from "../receivable-payment-form";
import { ReturnForm } from "../return-form";

export const metadata: Metadata = { title: "Detail Penjualan" };

const METHOD: Record<string, string> = { CASH: "Tunai", TRANSFER: "Transfer", QRIS: "QRIS", CREDIT: "Kredit" };

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const sale = await getSale(user.tenantId, id);
  if (!sale) notFound();

  const canVoid = can(user.role, "inventory.manage") && sale.status === "COMPLETED";
  const outstanding = sale.total - sale.paid;
  const isReceivable = sale.status === "COMPLETED" && outstanding > 0;
  const canCollect = can(user.role, "pos.use");
  const returnableItems = sale.items.filter((i) => i.qty - i.returnedQty > 0);
  const canReturn = can(user.role, "inventory.manage") && sale.status === "COMPLETED" && returnableItems.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/sales" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{sale.number}</h1>
            {sale.status === "VOID" ? (
              <Badge variant="destructive">Void</Badge>
            ) : (
              <Badge variant="success">Selesai</Badge>
            )}
          </div>
        </div>
        <Link href={`/pos/receipt/${sale.id}`} className={buttonVariants({ variant: "outline" })}>
          <Printer /> Struk
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Tanggal</span>
          <span className="text-right">
            {new Date(sale.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </span>
          <span className="text-muted-foreground">Kasir</span>
          <span className="text-right">{sale.cashierName ?? "-"}</span>
          <span className="text-muted-foreground">Pelanggan</span>
          <span className="text-right">{sale.customerName || "Umum"}</span>
          <span className="text-muted-foreground">Metode</span>
          <span className="text-right">{METHOD[sale.paymentMethod] ?? sale.paymentMethod}</span>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Produk</th>
              <th className="p-3 text-center font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Harga</th>
              <th className="p-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="p-3">{it.productName}</td>
                <td className="p-3 text-center">{it.qty}</td>
                <td className="p-3 text-right">{formatRupiah(it.price)}</td>
                <td className="p-3 text-right">{formatRupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardContent className="space-y-1 pt-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRupiah(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diskon</span>
              <span>-{formatRupiah(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatRupiah(sale.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bayar</span>
            <span>{formatRupiah(sale.paid)}</span>
          </div>
          {sale.change > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kembali</span>
              <span>{formatRupiah(sale.change)}</span>
            </div>
          )}
          {isReceivable && (
            <div className="flex justify-between font-medium">
              <span className="text-destructive">Sisa Piutang</span>
              <span className="text-destructive">{formatRupiah(outstanding)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {sale.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sale.payments.map((p) => (
              <div key={p.id} className="flex justify-between border-b pb-1 last:border-0">
                <span className="text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span>{formatRupiah(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isReceivable && canCollect && (
        <Card>
          <CardHeader>
            <CardTitle>Terima Pembayaran Piutang</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceivablePaymentForm saleId={sale.id} outstanding={outstanding} />
          </CardContent>
        </Card>
      )}

      {sale.returns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Retur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sale.returns.map((r) => (
              <div key={r.id} className="border-b pb-2 last:border-0">
                <div className="flex justify-between font-medium">
                  <span>{r.number}</span>
                  <span className="text-destructive">refund {formatRupiah(r.refundAmount)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                  {r.items.map((it) => `${it.productName} ×${it.qty}`).join(", ")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canReturn && (
        <Card>
          <CardHeader>
            <CardTitle>Retur Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnForm
              saleId={sale.id}
              items={returnableItems.map((i) => ({
                id: i.id,
                productName: i.productName,
                qty: i.qty,
                returnedQty: i.returnedQty,
                price: i.price,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {canVoid && <VoidSaleButton saleId={sale.id} number={sale.number} />}
    </div>
  );
}
