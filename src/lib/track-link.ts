/**
 * Tautan & teks promosi halaman lacak (/lacak) — murni (tanpa I/O), unit-tested.
 *
 * Tautan membawa slug toko (`t`) agar halaman lacak menampilkan promo & galeri
 * milik toko PENGIRIM (bukan toko operator). Tanpa `t`, halaman memakai toko
 * operator seperti sebelumnya (kompatibel dengan tautan lama).
 */

export interface TrackExtras {
  /** Toko punya teks/foto promo untuk halaman lacak. */
  hasPromo: boolean;
  /** Toko punya pajangan Galeri Publik yang sedang tampil. */
  hasGallery: boolean;
}

export function buildTrackUrl(origin: string, number: string, slug?: string | null): string {
  const q = new URLSearchParams({ no: number });
  if (slug) q.set("t", slug);
  return `${origin.replace(/\/+$/, "")}/lacak?${q.toString()}`;
}

/**
 * Asal kunjungan yang dicatat (metrik tautan WA). Nilai = nama enum Prisma
 * `LinkVisitKind` (didefinisikan ulang di sini agar modul tetap murni).
 */
export const LINK_VISIT_KINDS = [
  "LACAK_OPEN", // halaman lacak dibuka dari tautan WA (membawa no. tiket)
  "GALLERY_FROM_LACAK", // galeri dibuka lewat tombol di halaman lacak
  "GALLERY_FROM_RECEIPT", // galeri dibuka dari tautan di struk penjualan
  "GALLERY_FROM_CONSIGNMENT", // galeri dibuka dari tautan di tanda titip jual
] as const;
export type LinkVisitKind = (typeof LINK_VISIT_KINDS)[number];

/** Parameter `?ref=` di tautan galeri → jenis kunjungan. */
const GALLERY_REF_KIND: Record<string, LinkVisitKind> = {
  lacak: "GALLERY_FROM_LACAK",
  struk: "GALLERY_FROM_RECEIPT",
  titip: "GALLERY_FROM_CONSIGNMENT",
};
export type GalleryRef = "lacak" | "struk" | "titip";

export function isLinkVisitKind(v: unknown): v is LinkVisitKind {
  return typeof v === "string" && (LINK_VISIT_KINDS as readonly string[]).includes(v);
}

/** `ref` tak dikenal (atau kosong) → null: kunjungan biasa, tak dicatat sebagai asal tautan. */
export function galleryRefKind(ref?: string | null): LinkVisitKind | null {
  return ref && Object.hasOwn(GALLERY_REF_KIND, ref) ? GALLERY_REF_KIND[ref] : null;
}

/** Tautan galeri publik toko, opsional dengan penanda asal (`?ref=`). */
export function buildGalleryUrl(origin: string, slug: string, ref?: GalleryRef): string {
  const base = `${origin.replace(/\/+$/, "")}/galeri/${encodeURIComponent(slug)}`;
  return ref ? `${base}?ref=${ref}` : base;
}

export interface LinkVisitSummary {
  lacakOpen: number;
  galleryFromLacak: number;
  galleryFromReceipt: number;
  galleryFromConsignment: number;
  /** Total kunjungan galeri yang berasal dari tautan (lacak + struk + titip). */
  galleryTotal: number;
  /** % pembuka halaman lacak yang lanjut ke galeri (null bila belum ada data). */
  lacakToGalleryRate: number | null;
}

/** Ringkas baris statistik harian (jenis + jumlah) menjadi total per jenis. */
export function summarizeLinkVisits(rows: { kind: string; count: number }[]): LinkVisitSummary {
  const sum = (k: LinkVisitKind) => rows.reduce((a, r) => (r.kind === k ? a + r.count : a), 0);
  const lacakOpen = sum("LACAK_OPEN");
  const galleryFromLacak = sum("GALLERY_FROM_LACAK");
  const galleryFromReceipt = sum("GALLERY_FROM_RECEIPT");
  const galleryFromConsignment = sum("GALLERY_FROM_CONSIGNMENT");
  return {
    lacakOpen,
    galleryFromLacak,
    galleryFromReceipt,
    galleryFromConsignment,
    galleryTotal: galleryFromLacak + galleryFromReceipt + galleryFromConsignment,
    // Dibatasi 100%: pengunjung bisa membuka galeri lebih sering dari halaman lacak.
    lacakToGalleryRate: lacakOpen > 0 ? Math.min(100, Math.round((galleryFromLacak / lacakOpen) * 100)) : null,
  };
}

/**
 * Kalimat ajakan setelah tautan lacak — hanya menyebut yang BENAR-BENAR ada,
 * supaya pelanggan tak dijanjikan halaman kosong. null = tak ada yang disebut.
 */
export function trackExtrasLine(extras?: TrackExtras | null): string | null {
  if (!extras) return null;
  const { hasPromo, hasGallery } = extras;
  if (hasPromo && hasGallery) return "Di link tersebut juga ada info promo terbaru & galeri produk kami 🛍️";
  if (hasGallery) return "Di link tersebut juga ada galeri produk pilihan kami 🛍️";
  if (hasPromo) return "Di link tersebut juga ada info promo terbaru dari kami 🎁";
  return null;
}
