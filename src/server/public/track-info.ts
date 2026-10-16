import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { publicGalleryWhere } from "@/server/gallery/service";
import type { TrackExtras } from "@/lib/track-link";

/** Ada pajangan galeri yang sedang tampil? Defensif bila tabel belum ada (migrasi). */
async function tenantHasGallery(tenantId: string): Promise<boolean> {
  try {
    return (await db.galleryItem.count({ where: publicGalleryWhere(tenantId) })) > 0;
  } catch {
    return false;
  }
}

const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  trackPromo: true,
  trackPromoImage: true,
  updatedAt: true,
} as const;

/**
 * URL gambar pratinjau tautan (OG) toko: logo toko di kanvas 1200×630.
 * `v` = versi (updatedAt) agar cache pratinjau WhatsApp ikut berganti saat logo diubah.
 */
export function storeOgImageUrl(slug: string, updatedAt?: Date | null): string {
  const v = updatedAt ? `?v=${updatedAt.getTime().toString(36)}` : "";
  return `/api/og/store/${encodeURIComponent(slug)}${v}`;
}

/**
 * Info publik untuk halaman lacak servis (/lacak).
 * - `slug` (dari `?t=` di tautan WA) → promo & galeri milik toko PENGIRIM.
 * - Tanpa slug / slug tak dikenal → toko milik OPERATOR (super-admin), yaitu toko
 *   utama pemilik deployment (kompatibel dgn tautan lama; mencegah promo akun demo
 *   ikut tampil). Bila belum ada super-admin, fallback ke tenant aktif pertama.
 * Defensif: bila kolom belum ada (migrasi produksi belum jalan) → null.
 * Di-`cache` per request: dipakai generateMetadata (pratinjau tautan) & halaman.
 */
export const getTrackPagePromo = cache(async function getTrackPagePromo(slug?: string | null): Promise<{
  storeName: string | null;
  promo: string | null;
  promoImage: string | null;
  slug: string | null;
  hasGallery: boolean;
  ogImage: string | null;
}> {
  const empty = { storeName: null, promo: null, promoImage: null, slug: null, hasGallery: false, ogImage: null };
  try {
    const bySlug =
      slug && /^[a-z0-9-]{1,80}$/.test(slug)
        ? await db.tenant.findFirst({ where: { slug, isActive: true }, select: TENANT_SELECT })
        : null;
    let t = bySlug;
    if (!t) {
      const admin = await db.user.findFirst({
        where: { isSuperAdmin: true, isActive: true, tenant: { isActive: true } },
        orderBy: { createdAt: "asc" },
        select: { tenant: { select: TENANT_SELECT } },
      });
      t =
        admin?.tenant ??
        (await db.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: TENANT_SELECT }));
    }
    if (!t) return empty;
    return {
      storeName: t.name,
      promo: t.trackPromo,
      promoImage: t.trackPromoImage,
      slug: t.slug,
      hasGallery: await tenantHasGallery(t.id),
      ogImage: storeOgImageUrl(t.slug, t.updatedAt),
    };
  } catch {
    return empty;
  }
});

/**
 * Untuk halaman internal yang membuat tautan lacak ke pelanggan (servis, nota, RMA):
 * slug toko (dibawa di tautan) + apakah halaman lacak toko ini punya promo/galeri,
 * agar pesan WA hanya menyebut yang benar-benar ada.
 */
export async function getTrackExtras(tenantId: string): Promise<{ slug: string | null } & TrackExtras> {
  try {
    const t = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, trackPromo: true, trackPromoImage: true },
    });
    if (!t) return { slug: null, hasPromo: false, hasGallery: false };
    return {
      slug: t.slug,
      hasPromo: !!(t.trackPromo?.trim() || t.trackPromoImage),
      hasGallery: await tenantHasGallery(tenantId),
    };
  } catch {
    return { slug: null, hasPromo: false, hasGallery: false };
  }
}

/** Nama + logo toko aktif untuk gambar pratinjau tautan (route OG publik). */
export async function getStoreOgSource(slug: string): Promise<{ name: string; logo: string | null } | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  try {
    return await db.tenant.findFirst({ where: { slug, isActive: true }, select: { name: true, logo: true } });
  } catch {
    return null;
  }
}
