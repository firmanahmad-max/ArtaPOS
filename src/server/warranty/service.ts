import "server-only";
import { db } from "@/lib/db";
import { formatLocalDate } from "@/lib/timezone";
import type { WarrantyRegisterInput } from "@/lib/validations/warranty";

/** Service Garansi & Nomor Seri — ter-scope tenantId. */

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
    },
  });
}

export interface WarrantyRow {
  id: string;
  productName: string;
  serialNumber: string;
  customerName: string | null;
  saleNumber: string | null;
  soldAt: Date;
  warrantyUntil: Date | null;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";
  daysLeft: number | null;
}

function displayStatus(
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
    const d = displayStatus(r.status, r.warrantyUntil, now);
    return {
      id: r.id,
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
