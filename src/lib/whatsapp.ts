import { formatRupiah } from "@/lib/utils";
import type { FinanceReport } from "@/server/finance/service";
import { trackExtrasLine, type TrackExtras } from "./track-link";

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
    ...(r.serviceCogs > 0
      ? [`   • Modal sparepart: ${formatRupiah(r.serviceCogs)}`]
      : []),
    `🖥️ Rakit PC: ${formatRupiah(r.buildRevenue)} (${r.buildCount} rakitan)`,
    ...(r.buildCogs > 0 ? [`   • Modal komponen: ${formatRupiah(r.buildCogs)}`] : []),
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
  statusNote?: string | null;
  trackUrl?: string;
  /** Info promo/galeri toko yang ikut tampil di halaman lacak. */
  trackExtras?: TrackExtras | null;
}): string {
  const lines = [
    `Halo, berikut update servis Anda di *${args.storeName}*:`,
    `No. Tiket: ${args.number}`,
    `Perangkat: ${args.device}`,
    `Status: *${args.statusLabel}*`,
  ];
  if (args.statusNote) lines.push(`Keterangan: ${args.statusNote}`);
  pushTrackLink(lines, "Cek status", args.trackUrl, args.trackExtras);
  lines.push("Terima kasih 🙏");
  return lines.join("\n");
}

/** Permintaan ulasan via WhatsApp (link pribadi /ulasan/<token>). */
export function buildReviewRequestText(args: {
  storeName: string;
  customerName?: string | null;
  /** "servis" / "rakitan PC" / "belanja". */
  what: string;
  docNumber: string;
  url: string;
}): string {
  const hi = args.customerName ? `Halo Kak ${args.customerName.split(/\s+/)[0]},` : "Halo Kak,";
  return [
    `${hi} terima kasih sudah mempercayakan ${args.what} Anda (${args.docNumber}) di *${args.storeName}* 🙏`,
    "",
    "Boleh minta waktu 30 detik untuk menilai pengalaman Anda? Cukup pilih bintang ⭐ di link berikut:",
    args.url,
    "",
    "Masukan Anda sangat berarti agar kami terus memberi layanan terbaik.",
  ].join("\n");
}

/** Kalimat pembuka per status rakitan (pesan "Beri tahu via WhatsApp" Rakit PC). */
const BUILD_STATUS_INTRO: Record<string, string> = {
  DRAFT: "Pesanan rakitan PC Anda sudah kami catat dan segera kami siapkan.",
  ASSEMBLING: "PC Anda sedang dalam proses perakitan. 🔧",
  DONE: "Kabar baik! PC Anda sudah *selesai dirakit & siap diambil*. ✅",
  DELIVERED: "PC Anda sudah diserahkan. Terima kasih atas kepercayaannya! 🎉",
  CANCELLED: "Pesanan rakitan PC Anda telah dibatalkan.",
};

/** Pesan WhatsApp status Rakit PC untuk pelanggan (tanpa rincian harga komponen). */
export function buildPcBuildStatusText(args: {
  storeName: string;
  number: string;
  name: string;
  status: string;
  statusLabel: string;
  total: number;
  paid: number;
  /** Link Portal Member pelanggan terdaftar (opsional). */
  portalUrl?: string | null;
}): string {
  const lines = [
    `Halo, berikut update rakitan PC Anda di *${args.storeName}*:`,
    BUILD_STATUS_INTRO[args.status] ?? "",
    "",
    `No. Rakitan: ${args.number}`,
    `Rakitan: ${args.name}`,
    `Status: *${args.statusLabel}*`,
  ];
  if (args.status !== "CANCELLED" && args.total > 0) {
    const outstanding = args.total - args.paid;
    lines.push(`Total: ${formatRupiah(args.total)}`);
    if (args.paid > 0 && outstanding > 0) lines.push(`Sudah dibayar: ${formatRupiah(args.paid)}`);
    lines.push(outstanding > 0 ? `*Sisa pembayaran: ${formatRupiah(outstanding)}*` : "Pembayaran: *Lunas* ✓");
  }
  const portal = portalLine(args.portalUrl);
  if (portal) lines.push("", portal);
  lines.push("", "Terima kasih 🙏");
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").replace(/^\n+/, "");
}

/** Baris tautan lacak + (bila ada) ajakan melihat promo/galeri di halaman yang sama. */
/** Baris ajakan buka Portal Pelanggan (link pribadi member). */
export function portalLine(url?: string | null): string | null {
  return url ? `👤 Cek poin & riwayat servis Anda: ${url}` : null;
}

function pushTrackLink(rows: string[], label: string, url?: string, extras?: TrackExtras | null) {
  if (!url) return;
  rows.push(`${label}: ${url}`);
  const extra = trackExtrasLine(extras);
  if (extra) rows.push(extra);
}

/** Pesan WhatsApp status klaim RMA (garansi) untuk pelanggan. */
export function buildRmaStatusText(args: {
  storeName: string;
  number: string;
  productName: string;
  statusLabel: string;
  trackUrl?: string;
  trackExtras?: TrackExtras | null;
}): string {
  const lines = [
    `Halo, berikut update klaim garansi Anda di *${args.storeName}*:`,
    `No. Klaim: ${args.number}`,
    `Produk: ${args.productName}`,
    `Status: *${args.statusLabel}*`,
  ];
  pushTrackLink(lines, "Cek status", args.trackUrl, args.trackExtras);
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
  discount?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  total: number;
  paid: number;
  paymentMethodLabel?: string;
  trackUrl?: string;
  trackExtras?: TrackExtras | null;
  /** Info poin pelanggan (loyaltyNoteLines). */
  loyaltyLines?: string[];
  /** Link Portal Pelanggan (hanya untuk member). */
  portalUrl?: string | null;
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
  if (n.discount && n.discount > 0) rows.push(`Diskon: -${formatRupiah(n.discount)}`);
  if (n.pointsDiscount && n.pointsDiscount > 0)
    rows.push(`Tukar poin (${n.pointsRedeemed ?? 0}): -${formatRupiah(n.pointsDiscount)}`);
  rows.push(line);
  rows.push(`*TOTAL: ${formatRupiah(n.total)}*`);
  rows.push(`Dibayar${n.paymentMethodLabel ? ` (${n.paymentMethodLabel})` : ""}: ${formatRupiah(n.paid)}`);
  rows.push(`Sisa: ${formatRupiah(Math.max(0, n.total - n.paid))}`);
  if (n.trackUrl) {
    rows.push(line);
    pushTrackLink(rows, "Lacak status", n.trackUrl, n.trackExtras);
  }
  if (n.loyaltyLines && n.loyaltyLines.length > 0) {
    rows.push(line);
    rows.push(`⭐ ${n.loyaltyLines.join("\n")}`);
  }
  const np = portalLine(n.portalUrl);
  if (np) rows.push(np);
  rows.push("Terima kasih 🙏");
  return rows.join("\n");
}

/** Tanda titip jual (barang pelanggan yang ditawarkan toko) sebagai teks WA. */
export function buildConsignmentText(n: {
  storeName: string;
  number: string;
  dateText: string;
  customerName: string;
  items: {
    category: string;
    name: string;
    serialNumber?: string | null;
    condition?: string | null;
    /** Isi paket/set — dirinci tanpa harga per komponen. */
    components?: { name: string; serialNumber?: string | null; note?: string | null }[];
    askingPrice: number;
    statusLabel?: string;
    /** Diisi bila terjual: hak pemilik saja (komisi toko & harga laku tak ditampilkan). */
    sold?: { ownerShare: number; paid: boolean } | null;
  }[];
  askingTotal: number;
  note?: string | null;
  /** Ringkasan hak pemilik (bila ada yang terjual). */
  owner?: { total: number; paid: number; owed: number } | null;
  /** Tautan Galeri Publik toko (hanya bila ada pajangan aktif). */
  galleryUrl?: string | null;
}): string {
  const line = "────────────────";
  const rows = [
    `*${n.storeName}*`,
    "TANDA TITIP JUAL",
    `No: ${n.number}`,
    `Tgl: ${n.dateText}`,
    `Pemilik: ${n.customerName}`,
    line,
  ];
  n.items.forEach((it, i) => {
    rows.push(`${i + 1}. *${it.category}* — ${it.name}`);
    if (it.serialNumber) rows.push(`   SN: ${it.serialNumber}`);
    const parts = it.components ?? [];
    if (parts.length) {
      rows.push(`   Isi paket (${parts.length}):`);
      for (const c of parts) {
        rows.push(`   - ${c.name}${c.serialNumber ? ` (SN: ${c.serialNumber})` : ""}${c.note ? ` — ${c.note}` : ""}`);
      }
    }
    if (it.condition) rows.push(`   Kondisi: ${it.condition}`);
    rows.push(
      `   ${parts.length ? "Harga paket" : "Harga jual"}: ${formatRupiah(it.askingPrice)}${it.statusLabel ? ` · ${it.statusLabel}` : ""}`,
    );
    if (it.sold) {
      rows.push(`   Hak Anda: *${formatRupiah(it.sold.ownerShare)}* (${it.sold.paid ? "sudah dibayar" : "belum dibayar"})`);
    }
  });
  rows.push(line);
  rows.push(`*Total harga diinginkan: ${formatRupiah(n.askingTotal)}*`);
  if (n.owner && n.owner.total > 0) {
    rows.push(`Hak pemilik dari barang laku: ${formatRupiah(n.owner.total)}`);
    rows.push(`• Sudah dibayar: ${formatRupiah(n.owner.paid)}`);
    rows.push(`• *Belum dibayar: ${formatRupiah(n.owner.owed)}*`);
  }
  if (n.note) rows.push(`Catatan: ${n.note}`);
  rows.push(line);
  rows.push("Simpan tanda titip ini sebagai bukti. Hubungi kami untuk perubahan harga atau pengambilan barang.");
  if (n.galleryUrl) rows.push(`🛍️ Lihat galeri produk kami: ${n.galleryUrl}`);
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
  serviceFee?: number;
  serviceFeeLabel?: string | null;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  total: number;
  methodLabel: string;
  paid: number;
  change: number;
  /** Info poin pelanggan (loyaltyNoteLines). */
  loyaltyLines?: string[];
  footer?: string;
  /** Tautan Galeri Publik toko (hanya bila ada pajangan aktif). */
  galleryUrl?: string | null;
  /** Link Portal Pelanggan (hanya untuk member). */
  portalUrl?: string | null;
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
  if (r.serviceFee && r.serviceFee > 0)
    rows.push(`${r.serviceFeeLabel || "Biaya lain/jasa"}: +${formatRupiah(r.serviceFee)}`);
  if (r.pointsDiscount && r.pointsDiscount > 0)
    rows.push(`Tukar poin (${r.pointsRedeemed ?? 0}): -${formatRupiah(r.pointsDiscount)}`);
  rows.push(`*TOTAL: ${formatRupiah(r.total)}*`);
  rows.push(`Bayar (${r.methodLabel}): ${formatRupiah(r.paid)}`);
  if (r.change > 0) rows.push(`Kembali: ${formatRupiah(r.change)}`);
  rows.push(line);
  if (r.loyaltyLines && r.loyaltyLines.length > 0) {
    rows.push(`⭐ ${r.loyaltyLines.join("\n")}`);
    rows.push(line);
  }
  rows.push(r.footer || "Terima kasih telah berbelanja 🙏");
  if (r.galleryUrl) rows.push(`🛍️ Lihat produk pilihan kami lainnya: ${r.galleryUrl}`);
  const rp = portalLine(r.portalUrl);
  if (rp) rows.push(rp);
  return rows.join("\n");
}

/**
 * Nota Rakit PC sebagai teks WhatsApp — rincian komponen TANPA harga per item,
 * hanya total nilai rakitan (komponen + jasa rakit).
 */
export function buildPcBuildNotaText(n: {
  storeName: string;
  number: string;
  dateText: string;
  statusLabel: string;
  name: string;
  customerName: string | null;
  items: { name: string; qty: number }[];
  subtotal?: number; // nilai kotor sebelum diskon; bila > total → baris diskon tampil
  /** Potongan tukar poin (bagian dari subtotal − total, ditampilkan terpisah). */
  pointsRedeemed?: number;
  pointsDiscount?: number;
  total: number;
  footer?: string | null;
  /** Info poin pelanggan (loyaltyNoteLines). */
  loyaltyLines?: string[];
}): string {
  const line = "────────────────";
  const rows = [
    `*${n.storeName}*`,
    "NOTA RAKIT PC",
    `No: ${n.number}`,
    `Tgl: ${n.dateText}`,
    `Rakitan: *${n.name}*`,
    `Status: *${n.statusLabel}*`,
  ];
  if (n.customerName) rows.push(`Pelanggan: ${n.customerName}`);
  rows.push(line);
  rows.push("Spesifikasi Komponen:");
  n.items.forEach((it, i) => rows.push(`${i + 1}. ${it.name}${it.qty > 1 ? ` (${it.qty}x)` : ""}`));
  rows.push(line);
  if (n.subtotal && n.subtotal > n.total) {
    const pts = Math.max(0, n.pointsDiscount ?? 0);
    const disc = n.subtotal - n.total - pts;
    rows.push(`Subtotal: ${formatRupiah(n.subtotal)}`);
    if (disc > 0) rows.push(`Diskon: -${formatRupiah(disc)}`);
    if (pts > 0) rows.push(`Tukar poin (${n.pointsRedeemed ?? 0}): -${formatRupiah(pts)}`);
  }
  rows.push(`*TOTAL RAKITAN: ${formatRupiah(n.total)}*`);
  if (n.loyaltyLines && n.loyaltyLines.length > 0) {
    rows.push(line);
    rows.push(`⭐ ${n.loyaltyLines.join("\n")}`);
    rows.push(line);
  }
  rows.push(n.footer || "Terima kasih 🙏");
  return rows.join("\n");
}

/**
 * Penawaran (quotation) simulasi rakitan sebagai teks WhatsApp.
 * Sengaja TANPA harga per komponen (juga tanpa rincian jasa rakit) — hanya
 * daftar spesifikasi + TOTAL rakitan, sesuai preferensi penawaran ke pelanggan.
 */
export function buildSimulationText(n: {
  storeName: string;
  number: string;
  dateText: string;
  name: string;
  customerName: string | null;
  items: { name: string; qty: number }[];
  grandTotal: number;
  note?: string | null;
}): string {
  const line = "────────────────";
  const rows = [
    `*${n.storeName}*`,
    "PENAWARAN RAKITAN PC",
    `No: ${n.number}`,
    `Tgl: ${n.dateText}`,
    `Rakitan: *${n.name}*`,
  ];
  if (n.customerName) rows.push(`Pelanggan: ${n.customerName}`);
  rows.push(line);
  rows.push("Spesifikasi Komponen:");
  n.items.forEach((it, i) => rows.push(`${i + 1}. ${it.name}${it.qty > 1 ? ` (${it.qty}x)` : ""}`));
  rows.push(line);
  rows.push(`*TOTAL RAKITAN: ${formatRupiah(n.grandTotal)}*`);
  if (n.note) {
    rows.push(line);
    rows.push(n.note);
  }
  rows.push(line);
  rows.push("Silakan konfirmasi bila spesifikasi & harga sudah sesuai 🙏");
  return rows.join("\n");
}

/**
 * Pesan pengingat servis berkala (mis. cleaning & repaste setiap 6 bulan).
 * `pointsMultiplier` > 1 → sebut bonus poin jasa servis (hanya bila program poin aktif).
 */
export function buildServiceReminderText(r: {
  storeName: string;
  customerName: string;
  device: string;
  serviceName: string;
  monthsAgo: number;
  pointsMultiplier?: number | null;
  /** Link Portal Pelanggan (riwayat servis + jadwal perawatan berikutnya). */
  portalUrl?: string | null;
}): string {
  const rows = [
    `Halo ${r.customerName} 👋`,
    `Sudah ${r.monthsAgo} bulan sejak ${r.device || "perangkat"} Anda mendapat *${r.serviceName}* di *${r.storeName}*.`,
    "Agar performa tetap optimal & lebih awet, sekarang waktunya perawatan berkala lagi 🔧",
  ];
  if (r.pointsMultiplier && r.pointsMultiplier > 1) {
    rows.push(`Bonus: jasa servis dapat *poin member ${r.pointsMultiplier}×* 🎁`);
  }
  rows.push("Balas pesan ini untuk atur jadwal ya. Terima kasih 🙏");
  const rpl = portalLine(r.portalUrl);
  if (rpl) rows.push(rpl);
  return rows.join("\n");
}

/** Undangan Portal Pelanggan (link pribadi tanpa password). */
export function buildPortalInviteText(r: { storeName: string; customerName: string; portalUrl: string }): string {
  return [
    `Halo ${r.customerName} 👋`,
    `Ini link *member pribadi* Anda di *${r.storeName}*:`,
    r.portalUrl,
    "",
    "Di sana Anda bisa cek kapan saja:",
    "⭐ Saldo & riwayat poin member",
    "🔧 Riwayat servis per perangkat + jadwal perawatan berikutnya",
    "🛡️ Status garansi & klaim",
    "🧾 Riwayat belanja",
    "",
    "_Link ini khusus untuk Anda — mohon tidak dibagikan ke orang lain._ 🙏",
  ].join("\n");
}

/** Normalisasi no. HP Indonesia ke format internasional (62…) untuk wa.me. */
export function normalizePhoneId(phone: string): string {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}

/**
 * Bangun URL kirim WhatsApp. `phone` opsional (format internasional tanpa +, mis. 628…).
 * SENGAJA langsung ke `api.whatsapp.com/send`, BUKAN `wa.me`: redirect wa.me merusak
 * emoji 4-byte (🙏 🛍️ → "�", terverifikasi pada header Location-nya).
 */
export function waLink(text: string, phone?: string): string {
  const q = new URLSearchParams();
  if (phone) q.set("phone", normalizePhoneId(phone));
  q.set("text", text);
  return `https://api.whatsapp.com/send?${q.toString().replace(/\+/g, "%20")}`;
}
