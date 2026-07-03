import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getRmaClaim } from "@/server/rma/service";
import { formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RMA_STATUS_META, RMA_RESOLUTION_LABEL } from "../status-config";
import { RmaDetail } from "./rma-detail";
import { RmaPhotos } from "./rma-photos";

export const metadata: Metadata = { title: "Detail Klaim RMA" };

export default async function RmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const claim = await getRmaClaim(user.tenantId, id);
  if (!claim) notFound();

  const s = RMA_STATUS_META[claim.status];

  const infoRows: { label: string; value: React.ReactNode }[] = [
    { label: "Produk", value: <span className="font-medium">{claim.productName}</span> },
    { label: "Nomor Seri", value: claim.serialNumber || "—" },
    { label: "Kerusakan/Keluhan", value: claim.complaint },
    { label: "Distributor", value: claim.supplierName },
    { label: "No. Resi", value: claim.trackingNumber || "—" },
    { label: "Tanggal Dikirim", value: formatLocalDate(claim.sentAt, { dateStyle: "long" }) },
    {
      label: "Tanggal Diterima Kembali",
      value: claim.receivedAt ? formatLocalDate(claim.receivedAt, { dateStyle: "long" }) : "—",
    },
    {
      label: "Hasil Klaim",
      value: claim.resolution ? RMA_RESOLUTION_LABEL[claim.resolution] : "—",
    },
    ...(claim.replacementSn ? [{ label: "SN Unit Pengganti", value: claim.replacementSn }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/rma" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            {claim.number}
            <Badge variant={s.variant}>{s.label}</Badge>
          </h1>
          <p className="truncate text-muted-foreground">
            {claim.productName} → {claim.supplierName}
          </p>
        </div>
      </div>

      <Card className="divide-y">
        {infoRows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[200px_1fr] sm:gap-4">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="whitespace-pre-wrap">{r.value}</span>
          </div>
        ))}
      </Card>

      <RmaDetail
        claimId={claim.id}
        status={claim.status}
        note={claim.note}
      />

      <RmaPhotos
        rmaId={claim.id}
        photos={claim.photos.map((p) => ({
          id: p.id,
          dataUrl: p.dataUrl,
          caption: p.caption,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
