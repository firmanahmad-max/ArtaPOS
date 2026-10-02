import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listGalleryAdmin } from "@/server/gallery/service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GalleryManager, type GalleryRow } from "./gallery-client";

export const metadata: Metadata = { title: "Galeri Publik" };

export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin mengelola galeri.</Card>;
  }

  const [items, products, tenant] = await Promise.all([
    listGalleryAdmin(user.tenantId),
    db.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true, sellPrice: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true, phone: true } }),
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
    isActive: i.isActive,
    views: i.views,
    clicks: i.clicks,
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

      <GalleryManager items={rows} products={products} />
    </div>
  );
}
