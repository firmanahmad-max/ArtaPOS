import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { phoneKey } from "@/lib/phone";
import { isPortalToken, portalRefKind, summarizePortalStats, PORTAL_VISIT_KINDS } from "@/lib/portal";
import { incrementVisitStat, periodStartDate } from "@/server/link-stats/service";
import { getLoyaltyConfig } from "@/server/customers/service";
import { getTrackExtras } from "@/server/public/track-info";
import { warrantyDisplayStatus } from "@/server/warranty/service";

/**
 * Portal Pelanggan — link pribadi tanpa password (/member/<token>).
 * Token = 192-bit acak (base64url). Pemilik token dapat melihat data MILIKNYA saja:
 * poin, riwayat servis per perangkat, garansi, klaim RMA, belanja, rakit PC, titip jual.
 * TIDAK menampilkan harga modal/HPP atau data internal.
 */

const newToken = () => randomBytes(24).toString("base64url");

/** Pastikan pelanggan punya token (buat bila belum). Mengembalikan token. */
export async function ensurePortalToken(tenantId: string, customerId: string): Promise<string | null> {
  const c = await db.customer.findFirst({
    where: { id: customerId, tenantId, isActive: true },
    select: { id: true, portalToken: true },
  });
  if (!c) return null;
  if (c.portalToken) return c.portalToken;
  const token = newToken();
  // updateMany bersyarat → aman bila dua permintaan bersamaan (yang kalah tak menimpa).
  await db.customer.updateMany({ where: { id: c.id, portalToken: null }, data: { portalToken: token, portalTokenAt: new Date() } });
  const after = await db.customer.findUnique({ where: { id: c.id }, select: { portalToken: true } });
  return after?.portalToken ?? null;
}

/** Token untuk banyak pelanggan sekaligus (mis. daftar pengingat). */
export async function ensurePortalTokens(tenantId: string, customerIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(customerIds)];
  if (ids.length === 0) return out;
  const rows = await db.customer.findMany({
    where: { tenantId, id: { in: ids }, isActive: true },
    select: { id: true, portalToken: true },
  });
  for (const r of rows) {
    const t = r.portalToken ?? (await ensurePortalToken(tenantId, r.id).catch(() => null));
    if (t) out.set(r.id, t);
  }
  return out;
}

/**
 * Catat satu kunjungan portal (endpoint publik, dipicu beacon JS sekali per sesi browser).
 * Token tak valid / nonaktif → diam. Menambah penghitung per member + penghitung harian per asal.
 */
export async function recordPortalVisit(token: string, ref?: unknown): Promise<void> {
  if (!isPortalToken(token)) return;
  const c = await db.customer.findFirst({
    where: { portalToken: token, isActive: true, tenant: { isActive: true } },
    select: { id: true, tenantId: true },
  });
  if (!c) return;
  await db.customer.update({
    where: { id: c.id },
    data: { portalViews: { increment: 1 }, portalLastSeenAt: new Date() },
  });
  await incrementVisitStat(c.tenantId, portalRefKind(ref));
}

/** Statistik Portal Member `days` hari terakhir. null bila kolom/tabel belum dimigrasi. */
export async function getPortalStats(tenantId: string, days = 30, now: number = Date.now()) {
  try {
    const [members, rows] = await Promise.all([
      db.customer.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, portalToken: true, portalViews: true, portalLastSeenAt: true },
      }),
      db.linkVisitStat.findMany({
        where: { tenantId, day: { gte: periodStartDate(days) }, kind: { in: [...PORTAL_VISIT_KINDS] } },
        select: { kind: true, count: true },
      }),
    ]);
    const since = new Date(now - days * 86_400_000);
    const recent = members
      .filter((m) => m.portalLastSeenAt)
      .sort((a, b) => b.portalLastSeenAt!.getTime() - a.portalLastSeenAt!.getTime())
      .slice(0, 5)
      .map((m) => ({ id: m.id, name: m.name, views: m.portalViews, lastSeenAt: m.portalLastSeenAt! }));
    return { days, ...summarizePortalStats(members, rows, since), recent };
  } catch {
    return null;
  }
}

/** Buat ulang link (link lama langsung tidak berlaku). */
export async function regeneratePortalToken(tenantId: string, customerId: string) {
  const token = newToken();
  const r = await db.customer.updateMany({
    where: { id: customerId, tenantId, isActive: true },
    data: { portalToken: token, portalTokenAt: new Date() },
  });
  if (r.count === 0) throw new Error("Pelanggan tidak ditemukan.");
  return token;
}

/** Nonaktifkan link portal pelanggan. */
export async function revokePortalToken(tenantId: string, customerId: string) {
  const r = await db.customer.updateMany({ where: { id: customerId, tenantId }, data: { portalToken: null, portalTokenAt: null } });
  if (r.count === 0) throw new Error("Pelanggan tidak ditemukan.");
}

/**
 * Semua data portal untuk pemilik token (publik). null = token tak valid / nonaktif.
 * Di-`cache` React: dipakai generateMetadata + halaman dalam satu request.
 */
export const getPortalData = cache(async function getPortalData(token: string) {
  const now = Date.now();
  if (!isPortalToken(token)) return null;
  const customer = await db.customer.findFirst({
    where: { portalToken: token, isActive: true, tenant: { isActive: true } },
    select: {
      id: true,
      tenantId: true,
      name: true,
      phone: true,
      points: true,
      tenant: { select: { name: true, slug: true, logo: true, phone: true, address: true, updatedAt: true } },
    },
  });
  if (!customer) return null;
  const { id: customerId, tenantId } = customer;

  const [loyalty, extras, pointEntries, sales, tickets, builds, warranties, consignments, rmaClaims] = await Promise.all([
    getLoyaltyConfig(tenantId),
    getTrackExtras(tenantId),
    db.pointEntry.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, points: true, type: true, note: true, createdAt: true },
    }),
    db.sale.findMany({
      where: { tenantId, customerId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        number: true,
        createdAt: true,
        total: true,
        paid: true,
        paymentStatus: true,
        pointsEarned: true,
        items: { select: { productName: true, qty: true, subtotal: true } },
      },
    }),
    db.serviceTicket.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        number: true,
        status: true,
        statusNote: true,
        deviceType: true,
        deviceBrand: true,
        deviceInfo: true,
        complaint: true,
        diagnosis: true,
        total: true,
        paid: true,
        createdAt: true,
        completedAt: true,
        items: { select: { name: true, qty: true, isPart: true, catalogItemId: true } },
      },
    }),
    db.pcBuild.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        name: true,
        status: true,
        total: true,
        paid: true,
        createdAt: true,
        items: { select: { productName: true, qty: true } },
      },
    }),
    db.warrantyUnit.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, productName: true, serialNumber: true, warrantyUntil: true, status: true, createdAt: true },
    }),
    db.consignment.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        createdAt: true,
        items: { select: { category: true, name: true, askingPrice: true, status: true, ownerShare: true, ownerPaidAt: true } },
      },
    }),
    // Klaim RMA tidak bertaut pelanggan → cocokkan lewat No. HP.
    customer.phone
      ? db.rmaClaim.findMany({
          where: { tenantId, customerPhone: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 300,
          select: { id: true, number: true, productName: true, serialNumber: true, status: true, resolution: true, customerPhone: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  // Nama & interval jasa katalog yang muncul di tiket (untuk jadwal perawatan berikutnya).
  const catIds = [...new Set(tickets.flatMap((t) => t.items.map((i) => i.catalogItemId).filter((x): x is string => !!x)))];
  const catalog = catIds.length
    ? await db.serviceCatalogItem.findMany({
        where: { tenantId, id: { in: catIds } },
        select: { id: true, name: true, intervalMonths: true, isActive: true },
      })
    : [];

  const myKey = phoneKey(customer.phone);
  return {
    customer: { id: customerId, tenantId, name: customer.name, points: customer.points },
    store: customer.tenant,
    hasGallery: extras.hasGallery,
    loyalty,
    pointEntries,
    sales,
    tickets,
    catalog,
    builds,
    warranties: warranties.map((w) => ({ ...w, ...warrantyDisplayStatus(w.status, w.warrantyUntil, now) })),
    consignments,
    rmaClaims: myKey ? rmaClaims.filter((r) => phoneKey(r.customerPhone) === myKey) : [],
  };
});

export type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalData>>>;
