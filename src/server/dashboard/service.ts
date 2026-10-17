import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { computeReport } from "@/server/finance/service";
import { getLoyaltyConfig } from "@/server/customers/service";
import { getPortalStats } from "@/server/portal/service";
import { listServiceReminders } from "@/server/service-reminders/service";
import { getLinkVisitSummary } from "@/server/link-stats/service";
import { localParts, startOfDay, dayKey } from "@/lib/timezone";
import {
  ageDays,
  dayRanges,
  grossProfit,
  monthToDateRanges,
  revenueSplit,
  totalRevenue,
} from "@/lib/dashboard-calc";

/**
 * Data Dashboard "Pusat Kendali Toko". Semua query ter-scope tenantId.
 * - Ringan & harus segar (hero hari ini, Perlu Tindakan) → dihitung langsung.
 * - Berat (KPI bulan, grafik 30 hari, terlaris, program, aset) → `unstable_cache`
 *   60 detik per toko (hasil WAJIB bisa di-JSON: tanggal dikirim sebagai string ISO).
 * Pemanggil membungkus tiap bagian dengan Suspense/try-catch → satu bagian gagal
 * tidak menjatuhkan halaman.
 */

const TTL = 60;
const ACTIVE_SERVICE = ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS"] as const;

// ── A · Hari ini ─────────────────────────────────────────────────────────────

const cachedDayRevenue = unstable_cache(
  async (tenantId: string, fromIso: string, toIso: string) => {
    const r = await computeReport(tenantId, new Date(fromIso), new Date(toIso), "");
    return totalRevenue(r);
  },
  ["dash-day-revenue"],
  { revalidate: 300 },
);

export async function getTodayPulse(tenantId: string, now: number) {
  const { today, yesterday } = dayRanges(now);
  const r = await computeReport(tenantId, today.from, today.to, "");
  const revenue = totalRevenue(r);
  const gross = grossProfit(r);
  const yesterdayRevenue = await cachedDayRevenue(tenantId, yesterday.from.toISOString(), yesterday.to.toISOString());
  return {
    revenue,
    yesterdayRevenue,
    salesCount: r.salesCount,
    serviceCount: r.serviceCount,
    avgTicket: r.salesCount > 0 ? Math.round(r.salesRevenue / r.salesCount) : 0,
    gross,
    margin: revenue > 0 ? Math.round((gross / revenue) * 100) : 0,
  };
}

// ── B · Perlu tindakan ───────────────────────────────────────────────────────

const cachedDueReminderCount = unstable_cache(
  async (tenantId: string) => {
    try {
      const { rows } = await listServiceReminders(tenantId, Date.now());
      return rows.filter((r) => r.state === "pending" && r.bucket === "overdue").length;
    } catch {
      return 0;
    }
  },
  ["dash-due-reminders"],
  { revalidate: TTL },
);

export async function getActionCounts(
  tenantId: string,
  now: number,
  can: { service: boolean; reports: boolean; inventory: boolean },
) {
  const [ready, oldestReady, overdue, stockOut, firstOut, consign, reminders] = await Promise.all([
    can.service ? db.serviceTicket.count({ where: { tenantId, status: "DONE" } }) : 0,
    can.service
      ? db.serviceTicket.findFirst({
          where: { tenantId, status: "DONE" },
          orderBy: [{ completedAt: "asc" }, { createdAt: "asc" }],
          select: { number: true, completedAt: true, createdAt: true },
        })
      : null,
    can.reports
      ? db.sale.findMany({
          where: { tenantId, status: "COMPLETED", paymentStatus: { not: "PAID" }, dueDate: { lt: new Date(now) } },
          select: { total: true, paid: true, dueDate: true },
          take: 500,
        })
      : [],
    can.inventory ? db.product.count({ where: { tenantId, isActive: true, minStock: { gt: 0 }, stock: { lte: 0 } } }) : 0,
    can.inventory
      ? db.product.findFirst({
          where: { tenantId, isActive: true, minStock: { gt: 0 }, stock: { lte: 0 } },
          orderBy: { name: "asc" },
          select: { name: true },
        })
      : null,
    can.inventory
      ? db.consignmentItem
          .aggregate({
            where: { consignment: { tenantId }, status: "SOLD", ownerPaidAt: null },
            _sum: { ownerShare: true },
            _count: true,
          })
          .catch(() => null)
      : null,
    can.service ? cachedDueReminderCount(tenantId) : 0,
  ]);
  const oldestDue = overdue.reduce<Date | null>((a, s) => (s.dueDate && (!a || s.dueDate < a) ? s.dueDate : a), null);
  return {
    readyService: ready,
    readyOldest: oldestReady
      ? { number: oldestReady.number, days: ageDays(oldestReady.completedAt ?? oldestReady.createdAt, now) }
      : null,
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0),
    overdueDays: oldestDue ? ageDays(oldestDue, now) : 0,
    stockOut,
    stockOutFirst: firstOut?.name ?? null,
    consignUnpaidCount: consign?._count ?? 0,
    consignUnpaidAmount: consign?._sum.ownerShare ?? 0,
    dueReminders: reminders,
  };
}

// ── C · KPI bulan berjalan ───────────────────────────────────────────────────

export const getMonthKpis = unstable_cache(
  async (tenantId: string) => {
    const now = Date.now();
    const rg = monthToDateRanges(now);
    // Berurutan: tiap computeReport menembakkan beberapa query (hemat pool koneksi).
    const cur = await computeReport(tenantId, rg.cur.from, rg.cur.to, rg.label);
    const prev = await computeReport(tenantId, rg.prev.from, rg.prev.to, rg.prevLabel);
    const range = { gte: rg.cur.from, lt: rg.cur.to };
    const [memberSales, items, newMembers] = await Promise.all([
      db.sale.count({ where: { tenantId, status: "COMPLETED", createdAt: range, customerId: { not: null } } }),
      db.saleItem.aggregate({ where: { sale: { tenantId, status: "COMPLETED", createdAt: range } }, _sum: { qty: true } }),
      db.customer.count({ where: { tenantId, isActive: true, createdAt: range } }),
    ]);
    const revenue = totalRevenue(cur);
    const prevRevenue = totalRevenue(prev);
    return {
      monthLabel: rg.monthLabel,
      label: rg.label,
      prevLabel: rg.prevLabel,
      revenue,
      prevRevenue,
      split: revenueSplit(cur),
      net: cur.estimatedNet,
      prevNet: prev.estimatedNet,
      gross: grossProfit(cur),
      expense: cur.expenseTotal,
      netMargin: revenue > 0 ? Math.round((cur.estimatedNet / revenue) * 1000) / 10 : 0,
      salesCount: cur.salesCount,
      avgTicket: cur.salesCount > 0 ? Math.round(cur.salesRevenue / cur.salesCount) : 0,
      prevAvgTicket: prev.salesCount > 0 ? Math.round(prev.salesRevenue / prev.salesCount) : 0,
      itemsPerSale: cur.salesCount > 0 ? Math.round(((items._sum.qty ?? 0) / cur.salesCount) * 10) / 10 : 0,
      memberShare: cur.salesCount > 0 ? Math.round((memberSales / cur.salesCount) * 100) : 0,
      newMembers,
    };
  },
  ["dash-month-kpis"],
  { revalidate: TTL },
);

// ── D · Performa 30 hari ─────────────────────────────────────────────────────

export const getPerformance = unstable_cache(
  async (tenantId: string) => {
    const days = 30;
    const { y, m, d } = localParts();
    const start = startOfDay(y, m, d - (days - 1));
    const [sales, returns, payments, builds] = await Promise.all([
      db.sale.findMany({
        where: { tenantId, status: "COMPLETED", createdAt: { gte: start } },
        select: { total: true, createdAt: true },
      }),
      db.saleReturn.findMany({
        where: { tenantId, createdAt: { gte: start }, sale: { status: "COMPLETED" } },
        select: { refundAmount: true, createdAt: true },
      }),
      db.servicePayment.findMany({ where: { tenantId, createdAt: { gte: start } }, select: { amount: true, createdAt: true } }),
      // Rakit PC diakui saat selesai/diserahkan (sama dengan laporan keuangan).
      db.pcBuild.findMany({
        where: {
          tenantId,
          status: { in: ["DONE", "DELIVERED"] },
          OR: [{ completedAt: { gte: start } }, { completedAt: null, createdAt: { gte: start } }],
        },
        select: { total: true, completedAt: true, createdAt: true },
      }),
    ]);
    const rows = new Map<string, { key: string; s: number; v: number; r: number }>();
    for (let i = 0; i < days; i++) {
      const k = dayKey(startOfDay(y, m, d - (days - 1) + i));
      rows.set(k, { key: k, s: 0, v: 0, r: 0 });
    }
    const add = (at: Date, f: "s" | "v" | "r", n: number) => {
      const row = rows.get(dayKey(at));
      if (row) row[f] += n;
    };
    for (const x of sales) add(x.createdAt, "s", x.total);
    for (const x of returns) add(x.createdAt, "s", -x.refundAmount);
    for (const x of payments) add(x.createdAt, "v", x.amount);
    for (const x of builds) add(x.completedAt ?? x.createdAt, "r", x.total);
    return [...rows.values()].map((r) => ({ ...r, s: Math.max(0, r.s) }));
  },
  ["dash-performance"],
  { revalidate: TTL },
);

// ── E · Operasional ──────────────────────────────────────────────────────────

const cachedTopSold = unstable_cache(
  async (tenantId: string) => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const rows = await db.saleItem.groupBy({
      by: ["productName"],
      where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: since } } },
      _sum: { qty: true, returnedQty: true },
    });
    return rows
      .map((r) => ({ name: r.productName, qty: (r._sum.qty ?? 0) - (r._sum.returnedQty ?? 0) }))
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  },
  ["dash-top-sold"],
  { revalidate: TTL },
);

export async function getServicePipeline(tenantId: string, now: number) {
  const [byStatus, oldest] = await Promise.all([
    db.serviceTicket.groupBy({
      by: ["status"],
      where: { tenantId, status: { in: [...ACTIVE_SERVICE, "DONE"] } },
      _count: true,
    }),
    db.serviceTicket.findMany({
      where: { tenantId, status: { in: [...ACTIVE_SERVICE] } },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: {
        id: true,
        number: true,
        status: true,
        deviceType: true,
        deviceBrand: true,
        deviceInfo: true,
        customerName: true,
        complaint: true,
        statusNote: true,
        createdAt: true,
      },
    }),
  ]);
  const count = (s: string) => byStatus.find((r) => r.status === s)?._count ?? 0;
  return {
    received: count("RECEIVED"),
    progress: count("IN_PROGRESS"),
    waiting: count("WAITING_PARTS"),
    ready: count("DONE"),
    oldest: oldest.map((t) => ({
      id: t.id,
      number: t.number,
      status: t.status,
      device: [t.deviceType, t.deviceBrand, t.deviceInfo].filter(Boolean).join(" "),
      customer: t.customerName ?? "Pelanggan",
      note: t.statusNote || t.complaint,
      days: ageDays(t.createdAt, now),
    })),
  };
}

export function getTopSold(tenantId: string) {
  return cachedTopSold(tenantId).catch(() => []);
}

export type ActivityKind = "sale" | "service" | "payment" | "portal" | "rma";
export interface ActivityItem {
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  href: string;
}

/** Aktivitas terbaru lintas modul (penjualan, servis selesai, pelunasan, portal dibuka, RMA kembali). */
export async function getRecentActivity(
  tenantId: string,
  can: { service: boolean; inventory: boolean },
): Promise<ActivityItem[]> {
  const [sales, done, pays, portal, rma] = await Promise.all([
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, number: true, total: true, customerName: true, pointsEarned: true, createdAt: true },
    }),
    can.service
      ? db.serviceTicket.findMany({
          where: { tenantId, completedAt: { not: null } },
          orderBy: { completedAt: "desc" },
          take: 3,
          select: { id: true, number: true, deviceType: true, deviceBrand: true, status: true, completedAt: true },
        })
      : [],
    db.salePayment.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { amount: true, createdAt: true, sale: { select: { id: true, number: true, paymentStatus: true } } },
    }),
    db.customer
      .findMany({
        where: { tenantId, portalLastSeenAt: { not: null } },
        orderBy: { portalLastSeenAt: "desc" },
        take: 2,
        select: { id: true, name: true, portalLastSeenAt: true },
      })
      .catch(() => []),
    can.inventory
      ? db.rmaClaim.findMany({
          where: { tenantId, receivedAt: { not: null } },
          orderBy: { receivedAt: "desc" },
          take: 2,
          select: { id: true, number: true, productName: true, resolution: true, receivedAt: true },
        })
      : [],
  ]);
  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const RES: Record<string, string> = { REPLACED: "diganti baru", REPAIRED: "sudah diperbaiki", REFUNDED: "dana kembali" };
  const items: ActivityItem[] = [
    ...sales.map((s) => ({
      kind: "sale" as const,
      title: `${s.number} · ${rp(s.total)}`,
      detail: `${s.customerName || "Pelanggan umum"}${s.pointsEarned > 0 ? ` · +${s.pointsEarned.toLocaleString("id-ID")} poin` : ""}`,
      at: s.createdAt.toISOString(),
      href: `/sales/${s.id}`,
    })),
    ...done.map((t) => ({
      kind: "service" as const,
      title: `${t.number} ${t.status === "DELIVERED" ? "diserahkan" : "selesai"}`,
      detail: `${[t.deviceType, t.deviceBrand].filter(Boolean).join(" ")}${t.status === "DONE" ? " · siap diambil" : ""}`,
      at: t.completedAt!.toISOString(),
      href: `/service/${t.id}`,
    })),
    ...pays.map((p) => ({
      kind: "payment" as const,
      title: `Pembayaran ${p.sale.number}`,
      detail: `${rp(p.amount)}${p.sale.paymentStatus === "PAID" ? " · lunas" : ""}`,
      at: p.createdAt.toISOString(),
      href: `/sales/${p.sale.id}`,
    })),
    ...portal.map((c) => ({
      kind: "portal" as const,
      title: "Portal member dibuka",
      detail: c.name,
      at: c.portalLastSeenAt!.toISOString(),
      href: `/customers/${c.id}/edit`,
    })),
    ...rma.map((r) => ({
      kind: "rma" as const,
      title: `${r.number} kembali`,
      detail: `${r.productName}${r.resolution ? ` · ${RES[r.resolution] ?? ""}` : ""}`,
      at: r.receivedAt!.toISOString(),
      href: `/rma/${r.id}`,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
}

// ── F · Pelanggan & program (dimuat saat dibuka) ─────────────────────────────

export const getProgramsData = unstable_cache(
  async (tenantId: string) => {
    const now = Date.now();
    const loyalty = await getLoyaltyConfig(tenantId);
    const active = loyalty.pointValue > 0 && loyalty.started !== false;
    const [pointsAgg, ready, redeemed, portal, reminders, links, gallery] = await Promise.all([
      db.customer.aggregate({ where: { tenantId, isActive: true }, _sum: { points: true } }),
      active && loyalty.minRedeem >= 0
        ? db.customer.count({ where: { tenantId, isActive: true, points: { gte: Math.max(1, loyalty.minRedeem) } } })
        : 0,
      db.pointEntry.aggregate({
        where: { tenantId, type: "REDEEM", points: { lt: 0 }, createdAt: { gte: new Date(now - 30 * 86_400_000) } },
        _sum: { points: true },
      }),
      getPortalStats(tenantId, 30, now),
      listServiceReminders(tenantId, now).catch(() => null),
      getLinkVisitSummary(tenantId, 30),
      db.galleryItem.aggregate({ where: { tenantId }, _sum: { clicks: true, views: true } }).catch(() => null),
    ]);
    const points = pointsAgg._sum.points ?? 0;
    const since90 = now - 90 * 86_400_000;
    const reminded = reminders?.rows.filter((r) => r.state === "reminded").length ?? 0;
    const returned = reminders?.returned.filter((r) => r.returnedAt.getTime() >= since90).length ?? 0;
    return {
      loyalty: {
        active,
        points,
        worth: points * loyalty.pointValue,
        ready,
        redeemed30: Math.abs(redeemed._sum.points ?? 0),
        cashback: loyalty.pointValue / 10,
      },
      portal: portal
        ? { linked: portal.linked, opened: portal.opened, openRate: portal.openRate, visits: portal.visits, byChannel: portal.byChannel }
        : null,
      reminders: reminders
        ? {
            hasCatalog: reminders.hasCatalog,
            due: reminders.rows.filter((r) => r.state === "pending" && r.bucket === "overdue").length,
            reminded,
            returned,
            conversion: reminded + returned > 0 ? Math.round((returned / (reminded + returned)) * 100) : null,
          }
        : null,
      links: links
        ? {
            lacak: links.lacakOpen,
            fromReceipt: links.galleryFromReceipt,
            fromLacak: links.galleryFromLacak,
            fromConsignment: links.galleryFromConsignment,
            galleryClicks: gallery?._sum.clicks ?? 0,
            galleryViews: gallery?._sum.views ?? 0,
          }
        : null,
    };
  },
  ["dash-programs"],
  { revalidate: TTL },
);

// ── G · Aset & inventaris (dimuat saat dibuka) ───────────────────────────────

export const getAssetsData = unstable_cache(
  async (tenantId: string) => {
    const now = Date.now();
    const { y, m } = localParts();
    const monthStart = startOfDay(y, m, 1);
    const [productCount, inStock, minRows, used, consignAvail, consignSold, consignUnpaid, warranties, rmaOpen, rmaDone] =
      await Promise.all([
        db.product.count({ where: { tenantId, isActive: true } }),
        db.product.count({ where: { tenantId, isActive: true, stock: { gt: 0 } } }),
        db.product.findMany({
          where: { tenantId, isActive: true, minStock: { gt: 0 } },
          select: { id: true, name: true, stock: true, minStock: true },
          take: 2000,
        }),
        db.usedItem
          .findMany({ where: { tenantId, status: "AVAILABLE" }, select: { costPrice: true, sellPrice: true, acquiredAt: true } })
          .catch(() => []),
        db.consignmentItem.count({ where: { consignment: { tenantId }, status: "AVAILABLE" } }).catch(() => 0),
        db.consignmentItem
          .aggregate({
            where: { consignment: { tenantId }, status: "SOLD", statusAt: { gte: monthStart } },
            _sum: { storeCommission: true },
            _count: true,
          })
          .catch(() => null),
        db.consignmentItem
          .aggregate({ where: { consignment: { tenantId }, status: "SOLD", ownerPaidAt: null }, _sum: { ownerShare: true } })
          .catch(() => null),
        db.warrantyUnit.findMany({
          where: { tenantId, status: "ACTIVE", OR: [{ warrantyUntil: null }, { warrantyUntil: { gt: new Date(now) } }] },
          select: { warrantyUntil: true },
          take: 5000,
        }),
        db.rmaClaim.count({ where: { tenantId, status: "SENT" } }),
        db.rmaClaim.findMany({
          where: { tenantId, status: "RETURNED", receivedAt: { gte: new Date(now - 180 * 86_400_000) } },
          select: { sentAt: true, receivedAt: true },
        }),
      ]);
    const critical = minRows
      .filter((p) => p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name))
      .slice(0, 5);
    const rmaDays = rmaDone.length
      ? Math.round(rmaDone.reduce((s, r) => s + (r.receivedAt!.getTime() - r.sentAt.getTime()) / 86_400_000, 0) / rmaDone.length)
      : null;
    return {
      productCount,
      coverage: productCount > 0 ? Math.round((inStock / productCount) * 100) : 0,
      outCount: minRows.filter((p) => p.stock <= 0).length,
      critical,
      used: {
        count: used.length,
        capital: used.reduce((s, u) => s + u.costPrice, 0),
        potential: used.reduce((s, u) => s + (u.sellPrice - u.costPrice), 0),
        stale: used.filter((u) => ageDays(u.acquiredAt, now) > 60).length,
      },
      consign: {
        available: consignAvail,
        soldThisMonth: consignSold?._count ?? 0,
        commission: consignSold?._sum.storeCommission ?? 0,
        unpaid: consignUnpaid?._sum.ownerShare ?? 0,
      },
      warranty: {
        active: warranties.length,
        expiring: warranties.filter((w) => w.warrantyUntil && w.warrantyUntil.getTime() - now <= 30 * 86_400_000).length,
        rmaOpen,
        rmaDays,
      },
    };
  },
  ["dash-assets"],
  { revalidate: TTL },
);

export type ProgramsData = Awaited<ReturnType<typeof getProgramsData>>;
export type AssetsData = Awaited<ReturnType<typeof getAssetsData>>;
export type MonthKpis = Awaited<ReturnType<typeof getMonthKpis>>;
export type PerformanceRow = Awaited<ReturnType<typeof getPerformance>>[number];
