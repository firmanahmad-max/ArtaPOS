import "server-only";
import { db } from "@/lib/db";

/**
 * Info publik untuk halaman lacak servis (/lacak). Halaman ini tanpa konteks
 * tenant (publik). Toko yang tampil = toko milik OPERATOR (super-admin), yaitu
 * toko utama pemilik deployment. Ini penting saat ada tenant lain (mis. akun
 * DEMO yang di-seed dengan tanggal dibuat lampau) agar promo demo tidak ikut
 * tampil. Bila belum ada super-admin, fallback ke tenant aktif pertama.
 * Defensif: bila kolom belum ada (migrasi produksi belum jalan) → null.
 */
export async function getTrackPagePromo(): Promise<{
  storeName: string | null;
  promo: string | null;
  promoImage: string | null;
}> {
  try {
    const admin = await db.user.findFirst({
      where: { isSuperAdmin: true, isActive: true, tenant: { isActive: true } },
      orderBy: { createdAt: "asc" },
      select: {
        tenant: { select: { name: true, trackPromo: true, trackPromoImage: true } },
      },
    });
    const t =
      admin?.tenant ??
      (await db.tenant.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { name: true, trackPromo: true, trackPromoImage: true },
      }));
    return { storeName: t?.name ?? null, promo: t?.trackPromo ?? null, promoImage: t?.trackPromoImage ?? null };
  } catch {
    return { storeName: null, promo: null, promoImage: null };
  }
}
