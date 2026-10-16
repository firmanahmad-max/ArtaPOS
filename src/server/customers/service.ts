import "server-only";
import { db } from "@/lib/db";
import type { ContactInput } from "@/lib/validations/contacts";
import { loyaltyNoteLines, type LoyaltyConfig } from "@/lib/loyalty";

/** Service Customer — semua query ter-scope tenantId. */

export function listCustomers(tenantId: string, search?: string) {
  const s = search?.trim();
  return db.customer.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(s
        ? {
            OR: [
              { name: { contains: s, mode: "insensitive" } },
              { phone: { contains: s, mode: "insensitive" } },
              { email: { contains: s, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export function getCustomer(tenantId: string, id: string) {
  return db.customer.findFirst({ where: { id, tenantId } });
}

/** Cegah nama pelanggan duplikat (case-insensitive) dalam satu tenant. */
async function assertUniqueCustomerName(tenantId: string, name: string, excludeId?: string) {
  const dup = await db.customer.findFirst({
    where: {
      tenantId,
      isActive: true,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (dup) throw new Error(`Pelanggan dengan nama "${name}" sudah ada.`);
}

export async function createCustomer(tenantId: string, input: ContactInput) {
  await assertUniqueCustomerName(tenantId, input.name);
  return db.customer.create({
    data: {
      tenantId,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
}

export async function updateCustomer(tenantId: string, id: string, input: ContactInput) {
  const e = await db.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Pelanggan tidak ditemukan.");
  await assertUniqueCustomerName(tenantId, input.name, id);
  return db.customer.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
}

export async function deactivateCustomer(tenantId: string, id: string) {
  const e = await db.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Pelanggan tidak ditemukan.");
  return db.customer.update({ where: { id }, data: { isActive: false } });
}

// ── Poin loyalitas ─────────────────────────────────────────────────────────
/** Aturan tukar poin toko. Defensif: kolom belum ada (migrasi) → penukaran nonaktif. */
export async function getLoyaltyConfig(tenantId: string): Promise<LoyaltyConfig> {
  try {
    const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { pointValue: true, pointMinRedeem: true } });
    return { pointValue: t?.pointValue ?? 0, minRedeem: t?.pointMinRedeem ?? 0 };
  } catch {
    return { pointValue: 0, minRedeem: 0 };
  }
}

/**
 * Baris info poin untuk nota servis/rakit PC: saldo pelanggan terdaftar SAAT INI
 * + ajakan menukar. Kosong bila tanpa pelanggan / program nonaktif.
 */
export async function customerLoyaltyLines(tenantId: string, customerId: string | null | undefined): Promise<string[]> {
  if (!customerId) return [];
  try {
    const [cfg, c] = await Promise.all([
      getLoyaltyConfig(tenantId),
      db.customer.findFirst({ where: { id: customerId, tenantId }, select: { points: true } }),
    ]);
    if (!c || cfg.pointValue <= 0) return [];
    return loyaltyNoteLines({ earned: 0, redeemed: 0, balance: c.points }, cfg);
  } catch {
    return [];
  }
}

/** Total saldo poin semua pelanggan aktif (kewajiban potongan). */
export async function totalCustomerPoints(tenantId: string): Promise<number> {
  const agg = await db.customer.aggregate({ where: { tenantId, isActive: true }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/** Ubah aturan tukar poin (Pengaturan). */
export async function updateLoyaltyConfig(tenantId: string, cfg: LoyaltyConfig) {
  await db.tenant.update({
    where: { id: tenantId },
    data: { pointValue: cfg.pointValue, pointMinRedeem: cfg.minRedeem },
  });
}

export function listPointEntries(tenantId: string, customerId: string, limit = 50) {
  return db.pointEntry.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Sesuaikan poin (REDEEM=negatif, ADJUST=manual). Cegah saldo negatif. */
export async function adjustPoints(
  tenantId: string,
  customerId: string,
  points: number,
  type: "REDEEM" | "ADJUST",
  note?: string,
) {
  return db.$transaction(async (tx) => {
    const c = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, points: true } });
    if (!c) throw new Error("Pelanggan tidak ditemukan.");
    const delta = type === "REDEEM" ? -Math.abs(points) : points;
    const newBalance = c.points + delta;
    if (newBalance < 0) throw new Error(`Poin tidak cukup (saldo ${c.points}).`);
    await tx.customer.update({ where: { id: c.id }, data: { points: newBalance } });
    await tx.pointEntry.create({ data: { tenantId, customerId, points: delta, type, note: note || null } });
    return { balance: newBalance };
  });
}
