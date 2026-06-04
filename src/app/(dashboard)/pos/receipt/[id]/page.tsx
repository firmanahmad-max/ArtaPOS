import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSale } from "@/server/pos/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { ReceiptView } from "./receipt-view";

export const metadata: Metadata = { title: "Struk" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [sale, store] = await Promise.all([
    getSale(user.tenantId, id),
    getReceiptStoreInfo(user.tenantId),
  ]);
  if (!sale) notFound();

  return (
    <div className="py-4">
      <ReceiptView
        data={{
          storeName: user.tenant.name,
          storeAddress: store.address,
          storePhone: store.phone,
          receiptFooter: store.receiptFooter,
          number: sale.number,
          createdAt: sale.createdAt.toISOString(),
          customerName: sale.customerName,
          cashierName: sale.cashierName,
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          paid: sale.paid,
          change: sale.change,
          items: sale.items.map((i) => ({
            productName: i.productName,
            qty: i.qty,
            price: i.price,
            subtotal: i.subtotal,
          })),
        }}
      />
    </div>
  );
}
