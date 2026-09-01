import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getBuildForNota } from "@/server/pcbuild/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { Card } from "@/components/ui/card";
import { BUILD_STATUS_META } from "../../build-status";
import { PcBuildNotaView } from "./pc-build-nota-view";
import { formatLocalDateTime } from "@/lib/timezone";

export const metadata: Metadata = { title: "Nota Rakit PC" };

export default async function PcBuildNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [result, store] = await Promise.all([
    getBuildForNota(user.tenantId, id),
    getReceiptStoreInfo(user.tenantId),
  ]);
  if (!result) notFound();
  const { build, customerPhone } = result;

  return (
    <div className="py-4">
      <PcBuildNotaView
        backHref={`/pc-build/${build.id}`}
        data={{
          storeName: user.tenant.name,
          storeLogo: store.logo,
          storeAddress: store.address,
          storePhone: store.phone,
          receiptFooter: store.receiptFooter,
          number: build.number,
          dateText: formatLocalDateTime(build.createdAt, { dateStyle: "medium", timeStyle: "short" }),
          statusLabel: BUILD_STATUS_META[build.status].label,
          name: build.name,
          customerName: build.customerName,
          customerPhone,
          items: build.items.map((i) => ({ name: i.productName, qty: i.qty })),
          // Subtotal = nilai kotor sebenarnya (komponen + jasa). Diskon efektif
          // dihitung di view sbg (subtotal - total) → selalu cocok walau discount
          // tersimpan > gross (mis. komponen dikurangi setelah diskon diisi).
          subtotal: build.componentsCost + build.buildFee,
          total: build.total,
        }}
      />
    </div>
  );
}
