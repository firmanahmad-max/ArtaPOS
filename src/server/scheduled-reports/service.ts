import "server-only";
import { db } from "@/lib/db";
import { computeReport } from "@/server/finance/service";
import {
  buildScheduledReportText,
  dueReportSlots,
  slotFor,
  type ReportKind,
  type ReportOps,
  type ReportScheduleConfig,
} from "@/lib/report-schedule";

/**
 * Laporan WhatsApp Terjadwal (semi-otomatis). TANPA cron: slot jatuh jadwal dihitung
 * saat Dashboard dibuka; isi laporan baru dihitung saat tombol Kirim/Pratinjau ditekan
 * (agar Dashboard tetap ringan). Tindakan per periode dicatat di ReportDispatch.
 * Semua query ter-scope tenantId.
 */

export interface ReportSettings extends ReportScheduleConfig {
  phone: string | null;
}

export async function getReportSettings(tenantId: string): Promise<ReportSettings> {
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { reportDaily: true, reportWeekly: true, reportMonthly: true, reportDailyHour: true, reportPhone: true },
  });
  if (!t) throw new Error("Toko tidak ditemukan.");
  return {
    daily: t.reportDaily,
    weekly: t.reportWeekly,
    monthly: t.reportMonthly,
    dailyHour: t.reportDailyHour,
    phone: t.reportPhone,
  };
}

export async function updateReportSettings(tenantId: string, s: ReportSettings) {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      reportDaily: s.daily,
      reportWeekly: s.weekly,
      reportMonthly: s.monthly,
      reportDailyHour: s.dailyHour,
      reportPhone: s.phone,
    },
  });
}

/** Laporan yang jatuh jadwal & belum dikirim/dilewati. Gagal (belum dimigrasi) → []. */
export async function listDueReports(tenantId: string, now: number = Date.now()) {
  try {
    const settings = await getReportSettings(tenantId);
    const slots = dueReportSlots(now, settings);
    if (slots.length === 0) return [];
    const acted = await db.reportDispatch.findMany({
      where: { tenantId, OR: slots.map((s) => ({ kind: s.kind, periodKey: s.periodKey })) },
      select: { kind: true, periodKey: true },
    });
    const done = new Set(acted.map((a) => `${a.kind}:${a.periodKey}`));
    return slots
      .filter((s) => !done.has(`${s.kind}:${s.periodKey}`))
      .map((s) => ({ kind: s.kind, periodKey: s.periodKey, label: s.label }));
  } catch {
    return [];
  }
}

/** Kondisi operasional saat ini (servis, piutang lewat tempo, stok habis). */
async function opsSnapshot(tenantId: string, now: number): Promise<ReportOps> {
  const [activeService, readyService, outOfStock, receivables] = await Promise.all([
    db.serviceTicket.count({ where: { tenantId, status: { in: ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS"] } } }),
    db.serviceTicket.count({ where: { tenantId, status: "DONE" } }),
    db.product.count({ where: { tenantId, isActive: true, stock: { lte: 0 } } }),
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED", paymentStatus: { not: "PAID" }, dueDate: { lt: new Date(now) } },
      select: { total: true, paid: true },
      take: 500,
    }),
  ]);
  return {
    activeService,
    readyService,
    outOfStock,
    overdueCount: receivables.length,
    overdueAmount: receivables.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0),
  };
}

/** 5 barang terlaris (penjualan kasir, bersih retur) dalam rentang. */
async function topSold(tenantId: string, from: Date, to: Date) {
  const rows = await db.saleItem.groupBy({
    by: ["productName"],
    where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: from, lt: to } } },
    _sum: { qty: true, returnedQty: true },
  });
  return rows
    .map((r) => ({ name: r.productName, qty: (r._sum.qty ?? 0) - (r._sum.returnedQty ?? 0) }))
    .filter((r) => r.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

/**
 * Susun teks laporan untuk (jenis, periode). Periode divalidasi ulang terhadap jadwal
 * sekarang → tidak bisa meminta rentang sembarang lewat action.
 */
export async function buildReport(
  tenantId: string,
  storeName: string,
  kind: ReportKind,
  periodKey: string,
  now: number = Date.now(),
) {
  const settings = await getReportSettings(tenantId);
  const slot = slotFor(kind, periodKey, now, settings);
  if (!slot) throw new Error("Periode laporan sudah berganti — muat ulang halaman.");
  // Berurutan (bukan Promise.all) — tiap computeReport menembakkan banyak query; jaga pool koneksi.
  const cur = await computeReport(tenantId, slot.from, slot.to, slot.label);
  const prev = slot.prev ? await computeReport(tenantId, slot.prev.from, slot.prev.to, slot.prev.label) : null;
  const top = kind === "DAILY" ? [] : await topSold(tenantId, slot.from, slot.to);
  const ops = kind === "MONTHLY" ? null : await opsSnapshot(tenantId, now);
  const text = buildScheduledReportText({
    kind,
    storeName,
    periodLabel: slot.label,
    cur,
    prev,
    prevLabel: slot.prev?.label,
    top,
    ops,
  });
  return { text, phone: settings.phone };
}

/** Catat laporan periode ini sudah dikirim / dilewati (idempoten per periode). */
export async function markReport(
  tenantId: string,
  userId: string,
  kind: ReportKind,
  periodKey: string,
  status: "SENT" | "SKIPPED",
) {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(periodKey)) throw new Error("Periode tidak valid.");
  await db.reportDispatch.upsert({
    where: { tenantId_kind_periodKey: { tenantId, kind, periodKey } },
    create: { tenantId, kind, periodKey, status, actedById: userId },
    update: { status, actedById: userId, actedAt: new Date() },
  });
}

/** Riwayat tindakan terakhir (untuk Pengaturan). */
export async function listRecentDispatches(tenantId: string, take = 8) {
  try {
    return await db.reportDispatch.findMany({
      where: { tenantId },
      orderBy: { actedAt: "desc" },
      take,
      select: { id: true, kind: true, periodKey: true, status: true, actedAt: true },
    });
  } catch {
    return [];
  }
}
