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
