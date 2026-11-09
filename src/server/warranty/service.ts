import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { isWarrantyToken } from "@/lib/warranty-card";
import { formatLocalDate } from "@/lib/timezone";
import type { WarrantyRegisterInput } from "@/lib/validations/warranty";

/** Service Garansi & Nomor Seri — ter-scope tenantId (admin) atau token (kartu publik). */

const newToken = () => randomBytes(18).toString("base64url"); // 144-bit, ringkas utk QR

export function listProductsForWarranty(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, warrantyMonths: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function registerWarranty(
  tenantId: string,
  userId: string,
  input: WarrantyRegisterInput,
) {
  const soldAt = input.soldAt ? new Date(input.soldAt) : new Date();
  const warrantyUntil = input.warrantyMonths > 0 ? addMonths(soldAt, input.warrantyMonths) : null;

  let customerName = input.customerName || null;
  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { name: true } });
    if (c) customerName = c.name;
  }

  return db.warrantyUnit.create({
    data: {
      tenantId,
      productId: input.productId ?? null,
      productName: input.productName,
      serialNumber: input.serialNumber,
      saleNumber: input.saleNumber || null,
      customerId: input.customerId ?? null,
      customerName,
      soldAt,
      warrantyMonths: input.warrantyMonths,
      warrantyUntil,
      note: input.note || null,
      createdById: userId,
      publicToken: newToken(), // kartu garansi digital langsung siap
    },
  });
}

/** Data satu unit untuk form ubah (ter-scope tenant). */
export function getWarranty(tenantId: string, id: string) {
  return db.warrantyUnit.findFirst({
    where: { id, tenantId },
    include: { rmaClaims: { select: { number: true }, take: 5 } },
  });
}

/**
 * Ubah data unit (salah ketik SN/produk/masa garansi, dll.). Tanggal berakhir
 * dihitung ulang dari tanggal jual + masa garansi. Status (Diklaim/Batal) tetap.
 */
export async function updateWarranty(tenantId: string, id: string, input: WarrantyRegisterInput) {
  const cur = await db.warrantyUnit.findFirst({ where: { id, tenantId }, select: { id: true, soldAt: true } });
  if (!cur) throw new Error("Data garansi tidak ditemukan.");
  const soldAt = input.soldAt ? new Date(input.soldAt) : cur.soldAt;
  let customerName = input.customerName || null;
  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { name: true } });
    if (c) customerName = c.name;
  }
  return db.warrantyUnit.update({
    where: { id: cur.id },
    data: {
      productId: input.productId ?? null,
      productName: input.productName,
      serialNumber: input.serialNumber,
      saleNumber: input.saleNumber || null,
      customerId: input.customerId ?? null,
      customerName,
      soldAt,
      warrantyMonths: input.warrantyMonths,
      warrantyUntil: input.warrantyMonths > 0 ? addMonths(soldAt, input.warrantyMonths) : null,
      note: input.note || null,
    },
  });
}

/**
 * Hapus unit (mis. salah scan). Ditolak bila sudah punya klaim RMA (jejak audit
 * ke distributor) — tandai Klaim/biarkan saja. Kartu digital/QR-nya ikut tak berlaku.
 */
export async function deleteWarranty(tenantId: string, id: string) {
  const w = await db.warrantyUnit.findFirst({
    where: { id, tenantId },
    select: { id: true, _count: { select: { rmaClaims: true } } },
  });
  if (!w) throw new Error("Data garansi tidak ditemukan.");
  if (w._count.rmaClaims > 0) {
    throw new Error("Unit ini sudah punya klaim RMA ke distributor, jadi tidak bisa dihapus (riwayat klaim harus tetap ada).");
  }
  await db.warrantyUnit.delete({ where: { id: w.id } });
}

export interface WarrantyRow {
  id: string;
  cardViews: number;
  productName: string;
  serialNumber: string;
  customerName: string | null;
  saleNumber: string | null;
  soldAt: Date;
  warrantyUntil: Date | null;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";
  daysLeft: number | null;
}

export function warrantyDisplayStatus(
  status: string,
  warrantyUntil: Date | null,
  now: number,
): { status: WarrantyRow["status"]; daysLeft: number | null } {
  if (status === "CLAIMED") return { status: "CLAIMED", daysLeft: null };
  if (status === "VOID") return { status: "VOID", daysLeft: null };
  if (warrantyUntil && warrantyUntil.getTime() < now) return { status: "EXPIRED", daysLeft: 0 };
  const daysLeft = warrantyUntil ? Math.ceil((warrantyUntil.getTime() - now) / 86400000) : null;
  return { status: "ACTIVE", daysLeft };
}

export async function listWarranties(tenantId: string, search?: string): Promise<WarrantyRow[]> {
  const s = search?.trim();
  const rows = await db.warrantyUnit.findMany({
    where: {
      tenantId,
      ...(s
        ? {
            OR: [
              { serialNumber: { contains: s, mode: "insensitive" } },
              { productName: { contains: s, mode: "insensitive" } },
              { customerName: { contains: s, mode: "insensitive" } },
              { saleNumber: { contains: s, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const now = Date.now();
  return rows.map((r) => {
    const d = warrantyDisplayStatus(r.status, r.warrantyUntil, now);
    return {
      id: r.id,
      cardViews: r.cardViews,
      productName: r.productName,
      serialNumber: r.serialNumber,
      customerName: r.customerName,
      saleNumber: r.saleNumber,
      soldAt: r.soldAt,
      warrantyUntil: r.warrantyUntil,
      status: d.status,
      daysLeft: d.daysLeft,
    };
  });
}

export async function claimWarranty(tenantId: string, id: string, note?: string) {
  const w = await db.warrantyUnit.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, warrantyUntil: true, note: true },
  });
  if (!w) throw new Error("Data garansi tidak ditemukan.");
  // Hanya garansi ACTIVE & belum kedaluwarsa yang boleh diklaim.
  if (w.status === "CLAIMED") throw new Error("Garansi ini sudah pernah diklaim.");
  if (w.status === "VOID") throw new Error("Garansi ini sudah dibatalkan (void).");
  if (w.warrantyUntil && w.warrantyUntil.getTime() < Date.now()) {
    throw new Error("Masa garansi sudah berakhir.");
  }
  const stamp = formatLocalDate(new Date());
  const merged = [w.note, note ? `[Klaim ${stamp}] ${note}` : `[Klaim ${stamp}]`].filter(Boolean).join(" • ");
  return db.warrantyUnit.update({ where: { id }, data: { status: "CLAIMED", note: merged } });
}

// ── Garansi Digital + QR ────────────────────────────────────────────────────

/** Pastikan unit-unit punya token kartu publik (dibuat malas; aman balapan). */
export async function ensureWarrantyTokens(tenantId: string, ids: string[]): Promise<Map<string, string>> {
  const rows = await db.warrantyUnit.findMany({
    where: { tenantId, id: { in: [...new Set(ids)] } },
    select: { id: true, publicToken: true },
  });
  const out = new Map<string, string>();
  for (const r of rows) {
    if (r.publicToken) {
      out.set(r.id, r.publicToken);
      continue;
    }
    const token = newToken();
    const u = await db.warrantyUnit.updateMany({ where: { id: r.id, publicToken: null }, data: { publicToken: token } });
    if (u.count) out.set(r.id, token);
    else {
      const again = await db.warrantyUnit.findUnique({ where: { id: r.id }, select: { publicToken: true } });
      if (again?.publicToken) out.set(r.id, again.publicToken);
    }
  }
  return out;
}

export interface WarrantyCardUnit {
  id: string;
  token: string;
  productName: string;
  serialNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  saleNumber: string | null;
  soldAt: Date;
  warrantyMonths: number;
  warrantyUntil: Date | null;
  status: WarrantyRow["status"];
  cardViews: number;
}

/**
 * Unit untuk kartu/stiker cetak: berdasar daftar id ATAU no. invoice (semua unit
 * satu penjualan). Maks 60 unit. Token dibuat bila belum ada.
 */
export async function listWarrantyCards(
  tenantId: string,
  by: { ids?: string[]; saleNumber?: string },
): Promise<WarrantyCardUnit[]> {
  const where =
    by.saleNumber
      ? { tenantId, saleNumber: by.saleNumber }
      : { tenantId, id: { in: (by.ids ?? []).slice(0, 60) } };
  const rows = await db.warrantyUnit.findMany({ where, orderBy: { createdAt: "asc" }, take: 60 });
  if (!rows.length) return [];
  const tokens = await ensureWarrantyTokens(tenantId, rows.map((r) => r.id));
  const custIds = [...new Set(rows.map((r) => r.customerId).filter((v): v is string => !!v))];
  const phones = custIds.length
    ? new Map(
        (await db.customer.findMany({ where: { tenantId, id: { in: custIds } }, select: { id: true, phone: true } })).map(
          (c) => [c.id, c.phone],
        ),
      )
    : new Map<string, string | null>();
  const now = Date.now();
  return rows
    .filter((r) => tokens.has(r.id))
    .map((r) => ({
      id: r.id,
      token: tokens.get(r.id)!,
      productName: r.productName,
      serialNumber: r.serialNumber,
      customerName: r.customerName,
      customerPhone: r.customerId ? (phones.get(r.customerId) ?? null) : null,
      saleNumber: r.saleNumber,
      soldAt: r.soldAt,
      warrantyMonths: r.warrantyMonths,
      warrantyUntil: r.warrantyUntil,
      status: warrantyDisplayStatus(r.status, r.warrantyUntil, now).status,
      cardViews: r.cardViews,
    }));
}

/** Data kartu garansi PUBLIK (/garansi/<token>) — tanpa No. HP / data internal. */
export const getPublicWarranty = cache(async (token: string) => {
  if (!isWarrantyToken(token)) return null;
  const w = await db.warrantyUnit
    .findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        tenantId: true,
        productName: true,
        serialNumber: true,
        customerName: true,
        saleNumber: true,
        soldAt: true,
        warrantyMonths: true,
        warrantyUntil: true,
        status: true,
        tenant: { select: { name: true, slug: true, logo: true, phone: true, address: true, isActive: true, updatedAt: true } },
        rmaClaims: {
          orderBy: { sentAt: "desc" },
          take: 5,
          select: { number: true, status: true, resolution: true, sentAt: true, receivedAt: true, replacementSn: true },
        },
      },
    })
    .catch(() => null);
  if (!w || !w.tenant.isActive) return null;
  return { ...w, display: warrantyDisplayStatus(w.status, w.warrantyUntil, Date.now()) };
});

/** +1 kunjungan kartu (beacon; sekali per sesi browser). */
export async function recordWarrantyCardView(token: string) {
  if (!isWarrantyToken(token)) return;
  await db.warrantyUnit.updateMany({
    where: { publicToken: token },
    data: { cardViews: { increment: 1 }, cardLastViewedAt: new Date() },
  });
}
