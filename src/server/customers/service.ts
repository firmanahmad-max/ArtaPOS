import "server-only";
import { db } from "@/lib/db";
import type { ContactInput } from "@/lib/validations/contacts";

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

export function createCustomer(tenantId: string, input: ContactInput) {
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
