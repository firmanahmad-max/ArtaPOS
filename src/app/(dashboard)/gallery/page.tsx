import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, HandCoins, Images, Receipt, Wrench } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listGalleryAdmin, sourceCategoryOf } from "@/server/gallery/service";
import { listConsignmentItemsForSale } from "@/server/consignment/service";
import { listUsedItemsForSale } from "@/server/used-items/service";
import { gradeText, warrantyText } from "@/lib/used-item";
import { getLinkVisitSummary } from "@/server/link-stats/service";
import type { LinkVisitSummary } from "@/lib/track-link";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GalleryManager, type GalleryRow } from "./gallery-client";

export const metadata: Metadata = { title: "Galeri Publik" };

const VISIT_DAYS = 30;

/** Kunjungan dari tautan yang dibagikan via WA (lacak servis, struk, tanda titip). */
function LinkVisitsCard({ s }: { s: LinkVisitSummary }) {
  const stats: { label: string; value: number; hint: string; icon: React.ReactNode }[] = [
    {
      label: "Halaman lacak dibuka",
      value: s.lacakOpen,
      hint: "dari tautan WA servis/klaim",
      icon: <Wrench className="size-4" />,
    },
    {
      label: "Lanjut ke galeri dari lacak",
      value: s.galleryFromLacak,
      hint: s.lacakToGalleryRate === null ? "belum ada data" : `${s.lacakToGalleryRate}% dari pembuka lacak`,
      icon: <Images className="size-4" />,
    },
    {
      label: "Galeri dari struk",
      value: s.galleryFromReceipt,
      hint: "tautan di struk penjualan",
      icon: <Receipt className="size-4" />,
    },
    {
      label: "Galeri dari tanda titip",
      value: s.galleryFromConsignment,
      hint: "tautan di Tanda Titip Jual",
      icon: <HandCoins className="size-4" />,
    },
  ];
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Kunjungan dari Tautan WhatsApp</p>
        <p className="text-xs text-muted-foreground">
          {VISIT_DAYS} hari terakhir · total {s.galleryTotal.toLocaleString("id-ID")} kunjungan galeri dari tautan
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((x) => (
          <div key={x.label} className="rounded-xl border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {x.icon} {x.label}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{x.value.toLocaleString("id-ID")}</p>
            <p className="text-[11px] text-muted-foreground">{x.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Dihitung sekali per sesi browser; hanya angka agregat, tanpa data pengunjung.
      </p>
    </Card>
  );
}

export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin mengelola galeri.</Card>;
  }

  const [items, products, tenant, consignmentItems, visits, usedItems] = await Promise.all([
    listGalleryAdmin(user.tenantId),
    db.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true, sellPrice: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true, phone: true } }),
    listConsignmentItemsForSale(user.tenantId),
    getLinkVisitSummary(user.tenantId, VISIT_DAYS),
    listUsedItemsForSale(user.tenantId),
  ]);

  const publicUrl = tenant ? `/galeri/${tenant.slug}` : null;
  const rows: GalleryRow[] = items.map((i) => ({
    id: i.id,
    productId: i.productId,
    title: i.title,
    spec: i.spec,
    price: i.price,
    photo: i.photo,
    label: i.label,
    category: i.category,
    brand: i.brand,
    sourceCategory: sourceCategoryOf(i),
    isActive: i.isActive,
    views: i.views,
    clicks: i.clicks,
    consignmentItemId: i.consignmentItemId,
    consignmentStatus: i.consignmentItem?.status ?? null,
    consignmentNumber: i.consignmentItem?.consignment.number ?? null,
    consignmentId: i.consignmentItem?.consignment.id ?? null,
    usedItemId: i.usedItemId,
    usedStatus: i.usedItem?.status ?? null,
    usedNumber: i.usedItem?.number ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Galeri Publik</h1>
          <p className="text-muted-foreground">Etalase produk/promo yang bisa dibagikan ke pelanggan via WhatsApp &amp; media sosial.</p>
        </div>
        {publicUrl && (
          <Link href={publicUrl} target="_blank" className={buttonVariants({ variant: "outline" })}>
            <ExternalLink className="size-4" /> Lihat galeri publik
          </Link>
        )}
      </div>

      {!tenant?.phone && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <strong>Nomor WhatsApp toko belum diisi.</strong> Tombol “Chat WA” di galeri publik membutuhkannya. Isi di{" "}
          <Link href="/settings" className="font-medium text-primary hover:underline">Pengaturan → Profil Toko</Link>.
        </Card>
      )}

      {visits && <LinkVisitsCard s={visits} />}

      <GalleryManager
        items={rows}
        products={products.map((p) => ({ id: p.id, name: p.name, sellPrice: p.sellPrice, category: p.category?.name ?? null }))}
        consignments={consignmentItems.map((ci) => ({
          id: ci.id,
          label: `${ci.category} ${ci.name}`,
          owner: ci.consignment.customerName,
          number: ci.consignment.number,
          askingPrice: ci.askingPrice,
          condition: ci.condition,
          category: ci.category,
          inGallery: !!ci.galleryItem,
        }))}
        usedItems={usedItems.map((u) => ({
          id: u.id,
          label: `${u.category} ${u.name}`,
          number: u.number,
          sellPrice: u.sellPrice,
          category: u.category,
          spec: `Bekas — ${gradeText(u.grade)}\n${warrantyText(u.warrantyDays)}`,
          inGallery: !!u.galleryItem,
        }))}
      />
    </div>
  );
}
