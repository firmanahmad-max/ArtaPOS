import "server-only";
import { db } from "@/lib/db";
import { localParts, startOfDay, formatLocalDate } from "@/lib/timezone";
import type { ExpenseInput, ReportPeriod } from "@/lib/validations/finance";

/** Service Keuangan — biaya + agregasi laporan. Ter-scope tenantId. */

// ── Biaya ───────────────────────────────────────────────────────────────—
export function listExpenses(tenantId: string, limit = 100) {
  return db.expense.findMany({ where: { tenantId }, orderBy: { date: "desc" }, take: limit });
}

export function createExpense(tenantId: string, userId: string, input: ExpenseInput) {
  return db.expense.create({
    data: {
      tenantId,
      category: input.category,
      description: input.description || null,
      amount: input.amount,
      date: input.date ? new Date(input.date) : new Date(),
      createdById: userId,
    },
  });
}

export async function deleteExpense(tenantId: string, id: string) {
  const e = await db.expense.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Biaya tidak ditemukan.");
  return db.expense.delete({ where: { id } });
}

// ── Rentang periode ──────────────────────────────────────────────────────—
export function periodRange(period: ReportPeriod): { from: Date; to: Date; label: string } {
  // Batas hari dihitung pada zona laporan (WIB), bukan zona server (UTC di Vercel).
  const { y, m, d } = localParts();
  if (period === "today") {
    const from = startOfDay(y, m, d);
    const to = startOfDay(y, m, d + 1);
    return { from, to, label: formatLocalDate(from, { dateStyle: "full" }) };
  }
  if (period === "year") {
    return { from: startOfDay(y, 0, 1), to: startOfDay(y + 1, 0, 1), label: `Tahun ${y}` };
  }
  if (period === "last-month") {
    // Bulan m-1 (Date.UTC menormalkan luapan negatif ke tahun sebelumnya).
    const from = startOfDay(y, m - 1, 1);
    const to = startOfDay(y, m, 1);
    return { from, to, label: formatLocalDate(from, { month: "long", year: "numeric" }) };
  }
  // month (bulan berjalan)
  const from = startOfDay(y, m, 1);
  const to = startOfDay(y, m + 1, 1);
  return { from, to, label: formatLocalDate(from, { month: "long", year: "numeric" }) };
}

/** Rentang periode SEBELUMNYA yang sebanding (untuk perbandingan). */
export function previousRange(period: ReportPeriod): { from: Date; to: Date; label: string } {
  const { y, m, d } = localParts();
  if (period === "today") {
    const from = startOfDay(y, m, d - 1);
    const to = startOfDay(y, m, d);
    return { from, to, label: formatLocalDate(from, { dateStyle: "full" }) };
  }
  if (period === "year") {
    return { from: startOfDay(y - 1, 0, 1), to: startOfDay(y, 0, 1), label: `Tahun ${y - 1}` };
  }
  if (period === "last-month") {
    const from = startOfDay(y, m - 2, 1);
    const to = startOfDay(y, m - 1, 1);
    return { from, to, label: formatLocalDate(from, { month: "long", year: "numeric" }) };
  }
  // month → bulan sebelumnya
  const from = startOfDay(y, m - 1, 1);
  const to = startOfDay(y, m, 1);
  return { from, to, label: formatLocalDate(from, { month: "long", year: "numeric" }) };
}

export interface FinanceReport {
  periodLabel: string;
  salesRevenue: number;
  salesCogs: number;
  salesGrossProfit: number;
  salesCount: number;
  serviceRevenue: number;
  /** Bagian pendapatan servis yang berasal dari sparepart (stok keluar). */
  servicePartsRevenue: number;
  /** Modal sparepart yang terpakai di servis. */
  serviceCogs: number;
  serviceCount: number;
  buildRevenue: number;
  /** Bagian pendapatan rakit PC dari komponen (stok keluar). */
  buildPartsRevenue: number;
  /** Modal komponen yang terpakai di rakitan. */
  buildCogs: number;
  buildCount: number;
  purchaseTotal: number;
  expenseTotal: number;
  estimatedNet: number;
}

/**
 * Klausa tanggal PENGAKUAN pendapatan tiket servis / rakitan.
 * Pendapatan diakui saat pekerjaan SELESAI/DISERAHKAN (`completedAt`), bukan
 * saat tiket dibuat — tiket yang dibuka 3 minggu lalu lalu diserahkan hari ini
 * masuk ke hari ini. Baris lama tanpa `completedAt` jatuh ke `createdAt`.
 */
function recognizedOn(range: { gte: Date; lt: Date }) {
  return [{ completedAt: range }, { completedAt: null, createdAt: range }];
}

/**
 * Modal (HPP) dari baris yang mengambil stok. Memakai `costPrice` yang di-
 * snapshot saat sparepart/komponen dipakai, jadi laba tiket lama tidak berubah
 * ketika harga modal produk diperbarui. Baris jasa/non-stok (productId null)
 * tidak punya modal.
 */
function stockCogs(items: { productId: string | null; qty: number; costPrice: number }[]): number {
  return items.reduce((s, i) => s + (i.productId ? i.costPrice * i.qty : 0), 0);
}

export async function getFinanceReport(
  tenantId: string,
  period: ReportPeriod,
): Promise<FinanceReport> {
  const { from, to, label } = periodRange(period);
  return computeReport(tenantId, from, to, label);
}

/** Laporan periode terpilih + periode sebelumnya (untuk perbandingan). */
export async function getFinanceComparison(
  tenantId: string,
  period: ReportPeriod,
): Promise<{ current: FinanceReport; previous: FinanceReport }> {
  const cur = periodRange(period);
  const prev = previousRange(period);
  // SENGAJA berurutan (bukan Promise.all): tiap computeReport menembakkan 6
  // query. Menjalankan kedua periode bersamaan = 12 koneksi serentak per
  // request — di serverless dengan pool kecil (lihat DB_POOL_MAX) ini menaikkan
  // tekanan koneksi ke Supabase dan bisa memicu error transien. Berurutan
  // memangkas puncak koneksi per-request jadi setengahnya.
  const current = await computeReport(tenantId, cur.from, cur.to, cur.label);
  const previous = await computeReport(tenantId, prev.from, prev.to, prev.label);
  return { current, previous };
}

async function computeReport(
  tenantId: string,
  from: Date,
  to: Date,
  label: string,
): Promise<FinanceReport> {
  const range = { gte: from, lt: to };

  const [sales, servicePayments, builds, purchaseAgg, expenseAgg, returns] = await Promise.all([
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED", createdAt: range },
      select: { total: true, items: { select: { costPrice: true, qty: true } } },
    }),
    // Servis: BASIS KAS — diakui per PEMBAYARAN (tanggal uang diterima), bukan
    // saat selesai/diserahkan. HPP & bagian sparepart dialokasikan proporsional
    // terhadap porsi tiket yang dibayar.
    db.servicePayment.findMany({
      where: { tenantId, createdAt: range },
      select: {
        amount: true,
        ticketId: true,
        ticket: {
          select: {
            total: true,
            items: { select: { productId: true, qty: true, subtotal: true, costPrice: true } },
          },
        },
      },
    }),
    db.pcBuild.findMany({
      where: { tenantId, status: { in: ["DONE", "DELIVERED"] }, OR: recognizedOn(range) },
      select: {
        total: true,
        items: { select: { productId: true, qty: true, subtotal: true, costPrice: true } },
      },
    }),
    db.purchase.aggregate({ where: { tenantId, createdAt: range }, _sum: { total: true } }),
    db.expense.aggregate({ where: { tenantId, date: range }, _sum: { amount: true } }),
    // Retur penjualan yang TERJADI di periode ini (per tanggal retur). Diambil
    // costPrice snapshot dari saleItem induk untuk mengurangi HPP secara benar.
    // Hanya untuk penjualan yang masih COMPLETED — bila sudah di-void, seluruh
    // penjualannya sudah dikecualikan sehingga tak boleh dikurangi dua kali.
    db.saleReturn.findMany({
      where: { tenantId, createdAt: range, sale: { status: "COMPLETED" } },
      select: {
        refundAmount: true,
        items: { select: { productId: true, qty: true } },
        sale: { select: { items: { select: { productId: true, costPrice: true } } } },
      },
    }),
  ]);

  const buildItems = builds.flatMap((b) => b.items);
  const buildCogs = stockCogs(buildItems);

  // Servis (basis kas): akumulasi per pembayaran, alokasi HPP & sparepart
  // proporsional terhadap porsi tiket yang dibayar.
  const partsRevenue = (items: { productId: string | null; subtotal: number }[]) =>
    items.reduce((s, i) => s + (i.productId ? i.subtotal : 0), 0);
  let serviceRevenue = 0;
  let serviceCogs = 0;
  let servicePartsRevenue = 0;
  const paidServiceTickets = new Set<string>();
  for (const p of servicePayments) {
    serviceRevenue += p.amount;
    paidServiceTickets.add(p.ticketId);
    const total = p.ticket.total;
    const ratio = total > 0 ? p.amount / total : 0;
    serviceCogs += Math.round(stockCogs(p.ticket.items) * ratio);
    servicePartsRevenue += Math.round(partsRevenue(p.ticket.items) * ratio);
  }

  // Kurangi retur: uang yang dikembalikan menurunkan omzet, dan modal barang
  // yang kembali ke gudang menurunkan HPP.
  let refundTotal = 0;
  let returnedCogs = 0;
  for (const r of returns) {
    refundTotal += r.refundAmount;
    const costByProduct = new Map<string, number>();
    for (const si of r.sale.items) {
      if (!costByProduct.has(si.productId)) costByProduct.set(si.productId, si.costPrice);
    }
    for (const it of r.items) returnedCogs += (costByProduct.get(it.productId) ?? 0) * it.qty;
  }

  const salesRevenue =
    sales.reduce((s, x) => s + x.total, 0) - refundTotal;
  const salesCogs =
    sales.reduce((s, x) => s + x.items.reduce((c, i) => c + i.costPrice * i.qty, 0), 0) - returnedCogs;
  const salesGrossProfit = salesRevenue - salesCogs;
  const buildRevenue = builds.reduce((s, b) => s + b.total, 0);
  const buildPartsRevenue = partsRevenue(buildItems);
  const purchaseTotal = purchaseAgg._sum.total ?? 0;
  const expenseTotal = expenseAgg._sum.amount ?? 0;
  const estimatedNet =
    salesGrossProfit + serviceRevenue - serviceCogs + buildRevenue - buildCogs - expenseTotal;

  return {
    periodLabel: label,
    salesRevenue,
    salesCogs,
    salesGrossProfit,
    salesCount: sales.length,
    serviceRevenue,
    servicePartsRevenue,
    serviceCogs,
    serviceCount: paidServiceTickets.size,
    buildRevenue,
    buildPartsRevenue,
    buildCogs,
    buildCount: builds.length,
    purchaseTotal,
    expenseTotal,
    estimatedNet,
  };
}
