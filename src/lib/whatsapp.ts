import { formatRupiah } from "@/lib/utils";
import type { FinanceReport } from "@/server/finance/service";

/**
 * WhatsApp — arsitektur PLUGGABLE.
 * - Default (mode "link"): buka WhatsApp via `wa.me` dengan teks ter-isi.
 *   Nol biaya, nol setup, jalan di semua perangkat.
 * - Gateway (Fonnte/Wablas) atau WhatsApp Cloud API bisa ditambahkan nanti:
 *   buat fungsi server `sendViaGateway()` yang membaca API key dari env dan
 *   POST ke provider. UI tinggal memanggilnya alih-alih membuka link.
 */

/** Susun teks laporan keuangan siap kirim (plain text + sedikit markdown WA). */
export function buildReportText(storeName: string, r: FinanceReport): string {
  const line = "────────────────";
  return [
    `*${storeName}*`,
    `Laporan Keuangan`,
    `Periode: ${r.periodLabel}`,
    line,
    `🛒 Penjualan: ${formatRupiah(r.salesRevenue)} (${r.salesCount} transaksi)`,
    `   • HPP: ${formatRupiah(r.salesCogs)}`,
    `   • Laba kotor: ${formatRupiah(r.salesGrossProfit)}`,
    `🔧 Servis: ${formatRupiah(r.serviceRevenue)} (${r.serviceCount} tiket)`,
    `🖥️ Rakit PC: ${formatRupiah(r.buildRevenue)} (${r.buildCount} rakitan)`,
    `📦 Pembelian: ${formatRupiah(r.purchaseTotal)}`,
    `💸 Biaya operasional: ${formatRupiah(r.expenseTotal)}`,
    line,
    `*Estimasi Laba Bersih: ${formatRupiah(r.estimatedNet)}*`,
    "",
    `_Dibuat otomatis oleh ArtaPOS_`,
  ].join("\n");
}

/** Pesan WhatsApp status servis untuk pelanggan. */
export function buildServiceStatusText(args: {
  storeName: string;
  number: string;
  device: string;
  statusLabel: string;
  trackUrl?: string;
}): string {
  const lines = [
    `Halo, berikut update servis Anda di *${args.storeName}*:`,
    `No. Tiket: ${args.number}`,
    `Perangkat: ${args.device}`,
    `Status: *${args.statusLabel}*`,
  ];
  if (args.trackUrl) lines.push(`Cek status: ${args.trackUrl}`);
  lines.push("Terima kasih 🙏");
  return lines.join("\n");
}

/** Normalisasi no. HP Indonesia ke format internasional (62…) untuk wa.me. */
export function normalizePhoneId(phone: string): string {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}

/** Bangun URL wa.me. `phone` opsional (format internasional tanpa +, mis. 628…). */
export function waLink(text: string, phone?: string): string {
  const base = phone ? `https://wa.me/${normalizePhoneId(phone)}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
