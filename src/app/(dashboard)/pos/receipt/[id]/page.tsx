import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSale } from "@/server/pos/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { getCustomer } from "@/server/customers/service";
import { getTrackExtras } from "@/server/public/track-info";
import { ReceiptView } from "./receipt-view";

export const metadata: Metadata = { title: "Struk" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [sale, store, track] = await Promise.all([
    getSale(user.tenantId, id),
    getReceiptStoreInfo(user.tenantId),
    getTrackExtras(user.tenantId),
  ]);
  if (!sale) notFound();

  // HP pelanggan terdaftar (untuk kirim struk via WhatsApp).
  const customer = sale.customerId ? await getCustomer(user.tenantId, sale.customerId) : null;

  return (
    <div className="py-4">
      <ReceiptView
        data={{
          storeName: user.tenant.name,
          storeLogo: store.logo,
          storeAddress: store.address,
          storePhone: store.phone,
          receiptFooter: store.receiptFooter,
          // Tautan galeri ikut di pesan WA hanya bila toko punya pajangan aktif.
          gallerySlug: track.hasGallery ? track.slug : null,
          number: sale.number,
          createdAt: sale.createdAt.toISOString(),
          customerName: sale.customerName,
          customerPhone: customer?.phone ?? null,
          cashierName: sale.cashierName,
          subtotal: sale.subtotal,
          discount: sale.discount,
          serviceFee: sale.serviceFee,
          serviceFeeLabel: sale.serviceFeeLabel,
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
