import "server-only";
import { db } from "@/lib/db";

/** Service Shift Kasir — ter-scope tenantId. */

export function getOpenShift(tenantId: string, userId: string) {
  return db.cashierShift.findFirst({
    where: { tenantId, userId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
}

export function getShift(tenantId: string, id: string) {
  return db.cashierShift.findFirst({ where: { id, tenantId } });
}

export function listShifts(tenantId: string, limit = 50) {
  return db.cashierShift.findMany({
    where: { tenantId },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

export async function openShift(
  tenantId: string,
  user: { id: string; name: string },
  openingCash: number,
) {
  const existing = await getOpenShift(tenantId, user.id);
  if (existing) throw new Error("Masih ada shift yang terbuka. Tutup dulu sebelum membuka baru.");
  return db.cashierShift.create({
    data: {
      tenantId,
      userId: user.id,
      userName: user.name,
      openingCash: Math.max(0, openingCash),
    },
  });
}

/** Rekap penjualan COMPLETED dalam satu shift. */
export async function getShiftSummary(tenantId: string, shiftId: string) {
  const [all, cash, byMethod] = await Promise.all([
    db.sale.aggregate({
      where: { tenantId, shiftId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.aggregate({
      where: { tenantId, shiftId, status: "COMPLETED", paymentMethod: "CASH" },
      _sum: { total: true },
    }),
    db.sale.groupBy({
      by: ["paymentMethod"],
      where: { tenantId, shiftId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  return {
    totalSales: all._sum.total ?? 0,
    salesCount: all._count,
    cashSales: cash._sum.total ?? 0,
    byMethod: byMethod.map((m) => ({
      method: m.paymentMethod,
      total: m._sum.total ?? 0,
      count: m._count,
    })),
  };
}

export async function closeShift(
  tenantId: string,
  userId: string,
  shiftId: string,
  closingCash: number,
) {
  const shift = await db.cashierShift.findFirst({
    where: { id: shiftId, tenantId, status: "OPEN" },
  });
  if (!shift) throw new Error("Shift terbuka tidak ditemukan.");

  const summary = await getShiftSummary(tenantId, shiftId);
  const expectedCash = shift.openingCash + summary.cashSales;
  const closing = Math.max(0, closingCash);
  const difference = closing - expectedCash;

  return db.cashierShift.update({
    where: { id: shift.id },
    data: {
      status: "CLOSED",
      closingCash: closing,
      expectedCash,
      difference,
      closedAt: new Date(),
    },
  });
}
