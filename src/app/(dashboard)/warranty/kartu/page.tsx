import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listWarrantyCards } from "@/server/warranty/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WarrantyCardSheet } from "./card-sheet";

export const metadata: Metadata = { title: "Kartu Garansi & QR" };

export default async function WarrantyCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; sale?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { ids, sale } = await searchParams;
  const [units, store] = await Promise.all([
    listWarrantyCards(user.tenantId, {
      ids: (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      saleNumber: sale?.trim() || undefined,
    }),
    getReceiptStoreInfo(user.tenantId),
  ]);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const D = (d: Date) => formatLocalDate(d, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print flex items-center gap-3">
        <Link href="/warranty" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kartu Garansi & QR</h1>
          <p className="text-sm text-muted-foreground">
            {sale ? `Semua unit invoice ${sale}` : `${units.length} unit`} — cetak kartu/stiker, atau kirim kartu digital via WhatsApp.
          </p>
        </div>
      </div>
      {units.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Unit garansi tidak ditemukan.</Card>
      ) : (
        <WarrantyCardSheet
          store={{ name: user.tenant.name, logo: store.logo, phone: store.phone }}
          origin={origin}
          units={units.map((u) => ({
            id: u.id,
            token: u.token,
            productName: u.productName,
            serialNumber: u.serialNumber,
            customerName: u.customerName,
            customerPhone: u.customerPhone,
            saleNumber: u.saleNumber,
            soldText: D(u.soldAt),
            untilText: u.warrantyUntil ? D(u.warrantyUntil) : null,
            periodMonths: u.warrantyMonths,
            status: u.status,
            cardViews: u.cardViews,
          }))}
        />
      )}
    </div>
  );
}
