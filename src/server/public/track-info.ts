import "server-only";
import { db } from "@/lib/db";

/**
 * Info publik untuk halaman lacak servis (/lacak). Halaman ini tanpa konteks
 * tenant (publik), jadi pada deployment 1-toko kita ambil tenant aktif pertama.
 * Defensif: bila kolom belum ada (migrasi produksi belum jalan) → null.
 */
export async function getTrackPagePromo(): Promise<{
  storeName: string | null;
  promo: string | null;
  promoImage: string | null;
}> {
  try {
    const t = await db.tenant.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { name: true, trackPromo: true, trackPromoImage: true },
    });
    return { storeName: t?.name ?? null, promo: t?.trackPromo ?? null, promoImage: t?.trackPromoImage ?? null };
  } catch {
    return { storeName: null, promo: null, promoImage: null };
  }
}
