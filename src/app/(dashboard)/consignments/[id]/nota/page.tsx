import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getConsignment } from "@/server/consignment/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { summarizeConsignment } from "@/lib/consignment-calc";
import { formatLocalDateTime } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { CONSIGNMENT_STATUS_META } from "../../status-config";
import { ConsignmentNotaView } from "./consignment-nota-view";

export const metadata: Metadata = { title: "Tanda Titip Jual" };

export default async function ConsignmentNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [c, store] = await Promise.all([getConsignment(user.tenantId, id), getReceiptStoreInfo(user.tenantId)]);
  if (!c) notFound();
  const sum = summarizeConsignment(c.items);

  return (
    <div className="py-4">
      <ConsignmentNotaView
        backHref={`/consignments/${c.id}`}
        data={{
          storeName: user.tenant.name,
          storeLogo: store.logo,
          storeAddress: store.address,
          storePhone: store.phone,
          number: c.number,
          dateText: formatLocalDateTime(c.createdAt, { dateStyle: "medium", timeStyle: "short" }),
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          note: c.note,
          askingTotal: sum.askingTotal,
          items: c.items.map((i) => ({
            category: i.category,
            name: i.name,
            serialNumber: i.serialNumber,
            condition: i.condition,
            askingPrice: i.askingPrice,
            // Status hanya ditampilkan bila sudah bukan "Dititipkan" (nota awal tetap bersih).
            statusLabel: i.status === "AVAILABLE" ? undefined : CONSIGNMENT_STATUS_META[i.status].label,
          })),
        }}
      />
    </div>
  );
}
