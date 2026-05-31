import "server-only";
import { db } from "@/lib/db";
import type { ContactInput } from "@/lib/validations/contacts";

/** Service Supplier — semua query ter-scope tenantId. */

export function listSuppliers(tenantId: string, search?: string) {
  const s = search?.trim();
  return db.supplier.findMany({
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

export function getSupplier(tenantId: string, id: string) {
  return db.supplier.findFirst({ where: { id, tenantId } });
}

export function createSupplier(tenantId: string, input: ContactInput) {
  return db.supplier.create({
    data: {
      tenantId,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
}

export async function updateSupplier(tenantId: string, id: string, input: ContactInput) {
  const e = await db.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Supplier tidak ditemukan.");
  return db.supplier.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    },
  });
}

export async function deactivateSupplier(tenantId: string, id: string) {
  const e = await db.supplier.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Supplier tidak ditemukan.");
  return db.supplier.update({ where: { id }, data: { isActive: false } });
}
