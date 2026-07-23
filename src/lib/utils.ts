import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabungkan className Tailwind dengan aman (dedupe konflik). Konvensi shadcn/ui. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ubah teks jadi slug URL-friendly. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Format angka ke Rupiah. */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Pastikan bilangan bulat > 0 (mis. qty/jumlah bayar); lempar error ramah bila tidak. */
export function assertPositiveInt(n: number, label = "Jumlah"): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} harus bilangan bulat lebih dari 0.`);
  return n;
}

/** Pastikan bilangan bulat >= 0 (mis. harga/biaya); lempar error ramah bila tidak. */
export function assertNonNegativeInt(n: number, label = "Nilai"): number {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} harus bilangan bulat tidak negatif.`);
  return n;
}

/**
 * Rapikan input jumlah (qty) dari kolom angka: bilangan bulat, minimal 1.
 * `max` opsional — dipakai untuk barang berstok (dibatasi stok tersedia);
 * untuk baris jasa/non-stok tak ada batas atas. Menangani kosong/NaN/desimal/
 * negatif agar pengguna tak mengirim jumlah yang pasti ditolak server.
 */
export function clampQty(value: number, max?: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (max === undefined) return n;
  return Math.min(n, Math.max(1, max));
}
