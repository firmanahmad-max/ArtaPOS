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

/** Nota/struk servis lengkap sebagai teks WhatsApp (wa.me hanya dukung teks). */
export function buildServiceNotaText(n: {
  storeName: string;
  number: string;
  dateText: string;
  statusLabel: string;
  customerName: string | null;
  device: string;
  items: { name: string; qty: number; price: number; subtotal: number; isPart: boolean }[];
  laborCost: number;
  total: number;
  paid: number;
  paymentMethodLabel?: string;
  trackUrl?: string;
}): string {
  const line = "────────────────";
  const rows = [
    `*${n.storeName}*`,
    "NOTA SERVIS",
    `No: ${n.number}`,
    `Tgl: ${n.dateText}`,
    `Status: *${n.statusLabel}*`,
  ];
  if (n.customerName) rows.push(`Pelanggan: ${n.customerName}`);
  if (n.device) rows.push(`Perangkat: ${n.device}`);
  rows.push(line);
  if (n.items.length > 0) {
    rows.push("Sparepart & Jasa:");
    for (const it of n.items) {
      rows.push(`• ${it.name}${it.isPart ? " (part)" : ""} ${it.qty}x ${formatRupiah(it.price)} = ${formatRupiah(it.subtotal)}`);
    }
  }
  if (n.laborCost > 0) rows.push(`Biaya Jasa: ${formatRupiah(n.laborCost)}`);
  rows.push(line);
  rows.push(`*TOTAL: ${formatRupiah(n.total)}*`);
  rows.push(`Dibayar${n.paymentMethodLabel ? ` (${n.paymentMethodLabel})` : ""}: ${formatRupiah(n.paid)}`);
  rows.push(`Sisa: ${formatRupiah(Math.max(0, n.total - n.paid))}`);
  if (n.trackUrl) {
    rows.push(line);
    rows.push(`Lacak status: ${n.trackUrl}`);
  }
  rows.push("Terima kasih 🙏");
  return rows.join("\n");
}

/** Struk penjualan (POS) sebagai teks WhatsApp (wa.me hanya dukung teks). */
export function buildSaleReceiptText(r: {
  storeName: string;
  number: string;
  dateText: string;
  cashierName: string | null;
  customerName: string | null;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  methodLabel: string;
  paid: number;
  change: number;
  footer?: string;
}): string {
  const line = "────────────────";
  const rows = [`*${r.storeName}*`, "STRUK PENJUALAN", `No: ${r.number}`, `Tgl: ${r.dateText}`];
  if (r.cashierName) rows.push(`Kasir: ${r.cashierName}`);
  rows.push(`Pelanggan: ${r.customerName || "Umum"}`);
  rows.push(line);
  for (const it of r.items) {
    rows.push(`• ${it.name} ${it.qty}x ${formatRupiah(it.price)} = ${formatRupiah(it.subtotal)}`);
  }
  rows.push(line);
  rows.push(`Subtotal: ${formatRupiah(r.subtotal)}`);
  if (r.discount > 0) rows.push(`Diskon: -${formatRupiah(r.discount)}`);
  rows.push(`*TOTAL: ${formatRupiah(r.total)}*`);
  rows.push(`Bayar (${r.methodLabel}): ${formatRupiah(r.paid)}`);
  if (r.change > 0) rows.push(`Kembali: ${formatRupiah(r.change)}`);
  rows.push(line);
  rows.push(r.footer || "Terima kasih telah berbelanja 🙏");
  return rows.join("\n");
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
