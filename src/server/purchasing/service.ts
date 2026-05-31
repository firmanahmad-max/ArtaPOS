import "server-only";
import { db } from "@/lib/db";
import type { PurchaseInput } from "@/lib/validations/purchasing";
import type { PaymentStatus } from "@/generated/prisma/enums";

/** Service Pembelian & Utang — ter-scope tenantId, transaksional. */

function statusFor(total: number, paid: number): PaymentStatus {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

export function listProductsForPurchase(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, sku: true, costPrice: true, stock: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export function listPurchases(tenantId: string, limit = 100) {
  return db.purchase.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
    take: limit,
  });
}

export function getPurchase(tenantId: string, id: string) {
  return db.purchase.findFirst({
    where: { id, tenantId },
    include: { items: true, payments: { orderBy: { createdAt: "asc" } } },
  });
}

export async function listPayables(tenantId: string) {
  const rows = await db.purchase.findMany({
    where: { tenantId, paymentStatus: { not: "PAID" } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
  const now = Date.now();
  return rows.map((p) => ({
    id: p.id,
    number: p.number,
    supplierName: p.supplierName,
    dueDate: p.dueDate,
    total: p.total,
    paidAmount: p.paidAmount,
    outstanding: p.total - p.paidAmount,
    overdue: p.dueDate ? p.dueDate.getTime() < now : false,
  }));
}

export async function createPurchase(
  tenantId: string,
  user: { id: string; name: string },
  input: PurchaseInput,
) {
  return db.$transaction(async (tx) => {
    const ids = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: ids }, tenantId, isActive: true },
      select: { id: true, name: true, stock: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const itemsData = input.items.map((it) => {
      const p = map.get(it.productId);
      if (!p) throw new Error("Produk tidak ditemukan.");
      const sub = it.costPrice * it.qty;
      subtotal += sub;
      return { productId: p.id, productName: p.name, qty: it.qty, costPrice: it.costPrice, subtotal: sub };
    });

    const total = subtotal;
    const paid = Math.min(Math.max(0, input.paidAmount ?? 0), total);

    let supplierName: string | null = null;
    if (input.supplierId) {
      const s = await tx.supplier.findFirst({
        where: { id: input.supplierId, tenantId },
        select: { name: true },
      });
      supplierName = s?.name ?? null;
    }

    const seq = (await tx.purchase.count({ where: { tenantId } })) + 1;
    const number = `PB-${String(seq).padStart(5, "0")}`;

    const purchase = await tx.purchase.create({
      data: {
        tenantId,
        number,
        supplierId: input.supplierId ?? null,
        supplierName,
        subtotal,
        total,
        paidAmount: paid,
        paymentStatus: statusFor(total, paid),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        note: input.note || null,
        createdById: user.id,
        createdByName: user.name,
        items: { create: itemsData },
        ...(paid > 0
          ? { payments: { create: { tenantId, amount: paid, note: "Pembayaran awal", createdById: user.id } } }
          : {}),
      },
    });

    // Tambah stok + movement PURCHASE + update harga modal.
    for (const it of itemsData) {
      const p = map.get(it.productId)!;
      const stockAfter = p.stock + it.qty;
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: stockAfter, costPrice: it.costPrice },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: it.productId,
          type: "PURCHASE",
          qty: it.qty,
          stockAfter,
          note: `Pembelian ${number}`,
          createdById: user.id,
        },
      });
    }

    return { id: purchase.id, number };
  });
}

export interface ReorderSuggestion {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  sold30: number;
  suggestedQty: number;
  costPrice: number;
}

/** Saran pembelian: produk yang stoknya <= minimum + jumlah saran beli. */
export async function reorderSuggestions(tenantId: string): Promise<ReorderSuggestion[]> {
  const products = await db.product.findMany({
    where: { tenantId, isActive: true, minStock: { gt: 0 } },
    select: { id: true, name: true, sku: true, stock: true, minStock: true, costPrice: true },
  });
  const low = products.filter((p) => p.stock <= p.minStock);
  if (low.length === 0) return [];

  const since = new Date(Date.now() - 30 * 86400000);
  const sold = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { tenantId, status: "COMPLETED", createdAt: { gte: since } },
      productId: { in: low.map((p) => p.id) },
    },
    _sum: { qty: true },
  });
  const soldMap = new Map(sold.map((s) => [s.productId, s._sum.qty ?? 0]));

  return low
    .map((p) => {
      const sold30 = soldMap.get(p.id) ?? 0;
      // Target: stok minimum 2x + estimasi penjualan 1 bln; minimal beli 1.
      const target = p.minStock * 2 + sold30;
      const suggestedQty = Math.max(target - p.stock, 1);
      return { id: p.id, name: p.name, sku: p.sku, stock: p.stock, minStock: p.minStock, sold30, suggestedQty, costPrice: p.costPrice };
    })
    .sort((a, b) => a.stock - b.stock);
}

export async function recordPurchasePayment(
  tenantId: string,
  userId: string,
  purchaseId: string,
  amount: number,
  note?: string,
) {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      select: { id: true, total: true, paidAmount: true },
    });
    if (!purchase) throw new Error("Pembelian tidak ditemukan.");
    const outstanding = purchase.total - purchase.paidAmount;
    if (outstanding <= 0) throw new Error("Utang sudah lunas.");
    if (amount > outstanding) throw new Error(`Maksimal pembayaran ${outstanding}.`);

    await tx.purchasePayment.create({
      data: { tenantId, purchaseId, amount, note: note || null, createdById: userId },
    });
    const newPaid = purchase.paidAmount + amount;
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { paidAmount: newPaid, paymentStatus: statusFor(purchase.total, newPaid) },
    });
    return { paidAmount: newPaid, outstanding: purchase.total - newPaid };
  });
}
