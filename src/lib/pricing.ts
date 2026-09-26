/**
 * Sumber tunggal skema harga langganan ArtaPOS.
 *
 * Penting: `License` hanya mengatur AKSES + masa berlaku, BUKAN fitur. Semua
 * paket berbayar mendapat aplikasi penuh (plan UNLIMITED). "Tier" di sini murni
 * soal HARGA berdasarkan kapan toko bergabung (kelangkaan + loyalitas), bukan
 * beda fitur. Kelangkaan "Tersisa X/N" dibaca dari kuota PromoCode terkait
 * (`promoCode`), lihat /harga.
 */

export interface PricingTier {
  id: "pendiri" | "early" | "normal";
  name: string;
  tagline: string;
  /** Harga tampilan per bulan (Int rupiah). */
  monthly: number;
  /** Harga tahunan (Int rupiah). */
  annual: number;
  /** Keterangan komitmen/penagihan singkat. */
  billNote: string;
  /** Kode promo aktivasi untuk tier ini (untuk membaca sisa kuota). */
  promoCode?: string;
  /** Total kuota kelangkaan (jumlah slot). undefined = tanpa batas. */
  quota?: number;
  /** Kartu disorot sebagai pilihan utama. */
  highlight?: boolean;
  /** Badge kecil di atas kartu. */
  badge?: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "pendiri",
    name: "Angkatan Pendiri",
    tagline: "10 toko pertama — harga dikunci selama langganan aktif",
    monthly: 12_500,
    annual: 120_000,
    billNote: "Dibayar di muka 6 bulan (Rp 75.000) atau tahunan",
    promoCode: "PENDIRI10",
    quota: 10,
    highlight: true,
    badge: "Paling hemat",
  },
  {
    id: "early",
    name: "Early Adopter",
    tagline: "40 toko berikutnya — tarif perkenalan",
    monthly: 49_000,
    annual: 490_000,
    billNote: "Dibayar di muka 6 bulan atau tahunan",
    promoCode: "EARLY50",
    quota: 40,
  },
  {
    id: "normal",
    name: "Normal",
    tagline: "Harga publik setelah kuota awal terisi",
    monthly: 99_000,
    annual: 1_000_000,
    billNote: "Bulanan, atau tahunan (hemat ~2 bulan)",
  },
];

/** Fitur yang didapat SEMUA paket (pembeda hanya harga, bukan fitur). */
export const PRICING_INCLUDES: string[] = [
  "Semua modul: POS, inventory, pembelian, servis, rakit PC, keuangan",
  "Pengguna & transaksi tak terbatas",
  "Multi-perangkat (desktop, tablet, HP) + mode offline",
  "Scan barcode, cetak struk Bluetooth, kirim laporan via WhatsApp",
  "Garansi, RMA, poin pelanggan, dan lacak servis online",
  "Pembaruan fitur berkala tanpa biaya tambahan",
];

/** Masa uji coba gratis (hari). */
export const TRIAL_DAYS = 30;
