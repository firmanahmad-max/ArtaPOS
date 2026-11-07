import "server-only";
import { db } from "@/lib/db";
import type { ContactInput } from "@/lib/validations/contacts";

/** Service Supplier — semua query ter-scope tenantId. */

function supplierSearchWhere(search?: string) {
  const q = search?.trim();
  if (!q) return {};
  return {
    AND: q.split(/\s+/).map((w) => ({
      OR: [
        { name: { contains: w, mode: "insensitive" as const } },
        { phone: { contains: w, mode: "insensitive" as const } },
        { email: { contains: w, mode: "insensitive" as const } },
        { address: { contains: w, mode: "insensitive" as const } },
      ],
    })),
  };
}

export function listSuppliers(tenantId: string, search?: string) {
  return db.supplier.findMany({
    where: { tenantId, isActive: true, ...supplierSearchWhere(search) },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export function countSuppliersWithPhone(tenantId: string) {
  return db.supplier.count({ where: { tenantId, isActive: true, phone: { not: null } } });
}

export function countSuppliers(tenantId: string, search?: string) {
  return db.supplier.count({ where: { tenantId, isActive: true, ...supplierSearchWhere(search) } });
}

export function getSupplier(tenantId: string, id: string) {
  return db.supplier.findFirst({ where: { id, tenantId } });
}

/** Cegah nama supplier duplikat (case-insensitive) dalam satu tenant. */
async function assertUniqueSupplierName(tenantId: string, name: string, excludeId?: string) {
  const dup = await db.supplier.findFirst({
    where: {
      tenantId,
      isActive: true,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (dup) throw new Error(`Supplier dengan nama "${name}" sudah ada.`);
}

export async function createSupplier(tenantId: string, input: ContactInput) {
  await assertUniqueSupplierName(tenantId, input.name);
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
  await assertUniqueSupplierName(tenantId, input.name, id);
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
