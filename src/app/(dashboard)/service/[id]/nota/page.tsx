import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getTicket } from "@/server/service-jobs/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { Card } from "@/components/ui/card";
import { SERVICE_STATUS_META } from "../../status-config";
import { ServiceNotaView } from "./service-nota-view";

export const metadata: Metadata = { title: "Nota Servis" };

export default async function ServiceNotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [ticket, store] = await Promise.all([
    getTicket(user.tenantId, id),
    getReceiptStoreInfo(user.tenantId),
  ]);
  if (!ticket) notFound();

  return (
    <div className="py-4">
      <ServiceNotaView
        backHref={`/service/${ticket.id}`}
        data={{
          storeName: user.tenant.name,
          storeLogo: store.logo,
          storeAddress: store.address,
          storePhone: store.phone,
          receiptFooter: store.receiptFooter,
          number: ticket.number,
          dateText: new Date(ticket.createdAt).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          statusLabel: SERVICE_STATUS_META[ticket.status].label,
          customerName: ticket.customerName,
          customerPhone: ticket.customerPhone,
          device: [ticket.deviceType, ticket.deviceBrand, ticket.deviceInfo].filter(Boolean).join(" · "),
          technicianName: ticket.technicianName,
          complaint: ticket.complaint,
          diagnosis: ticket.diagnosis,
          items: ticket.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            price: i.price,
            subtotal: i.subtotal,
            isPart: i.isPart,
          })),
          laborCost: ticket.laborCost,
          total: ticket.total,
          paid: ticket.paid,
        }}
      />
    </div>
  );
}
