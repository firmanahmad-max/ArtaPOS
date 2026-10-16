import "server-only";
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

const TENANT_SELECT = { id: true, name: true, slug: true, trackPromo: true, trackPromoImage: true } as const;

/**
 * Info publik untuk halaman lacak servis (/lacak).
 * - `slug` (dari `?t=` di tautan WA) → promo & galeri milik toko PENGIRIM.
 * - Tanpa slug / slug tak dikenal → toko milik OPERATOR (super-admin), yaitu toko
 *   utama pemilik deployment (kompatibel dgn tautan lama; mencegah promo akun demo
 *   ikut tampil). Bila belum ada super-admin, fallback ke tenant aktif pertama.
 * Defensif: bila kolom belum ada (migrasi produksi belum jalan) → null.
 */
export async function getTrackPagePromo(slug?: string | null): Promise<{
  storeName: string | null;
  promo: string | null;
  promoImage: string | null;
  slug: string | null;
  hasGallery: boolean;
}> {
  const empty = { storeName: null, promo: null, promoImage: null, slug: null, hasGallery: false };
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
    };
  } catch {
    return empty;
  }
}

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
