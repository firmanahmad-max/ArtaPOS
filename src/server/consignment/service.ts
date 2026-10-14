import "server-only";
import { db } from "@/lib/db";
import { nextDocNumber } from "@/server/shared/numbering";
import type { ConsignmentItemStatus } from "@/generated/prisma/enums";
import type { ConsignmentInput } from "@/lib/validations/consignment";

/**
 * Service Titip Jual — barang milik pelanggan yang ditawarkan toko.
 * Semua query ter-scope tenantId (item diakses lewat induknya).
 * Sengaja TIDAK menyentuh stok/StockMovement & keuangan: barang bukan milik toko.
 */

const ITEM_ORDER = { orderBy: { sortOrder: "asc" as const } };

export function listConsignments(tenantId: string) {
  return db.consignment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      items: {
        ...ITEM_ORDER,
        select: { category: true, name: true, askingPrice: true, status: true, soldPrice: true },
      },
    },
  });
}

export function getConsignment(tenantId: string, id: string) {
  return db.consignment.findFirst({
    where: { id, tenantId },
    include: { items: ITEM_ORDER },
  });
}

export async function createConsignment(
  tenantId: string,
  userId: string,
  input: ConsignmentInput,
) {
  return db.$transaction(async (tx) => {
    // Pelanggan tertaut WAJIB milik tenant ini (cegah tautan lintas-tenant).
    if (input.customerId) {
      const c = await tx.customer.findFirst({
        where: { id: input.customerId, tenantId },
        select: { id: true },
      });
      if (!c) throw new Error("Pelanggan tidak ditemukan.");
    }
    const number = await nextDocNumber(tx, tenantId, "TJ", () =>
      tx.consignment.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );
    return tx.consignment.create({
      data: {
        tenantId,
        number,
        customerId: input.customerId || null,
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        note: input.note ?? null,
        createdById: userId,
        items: {
          create: input.items.map((it, i) => ({
            category: it.category,
            name: it.name,
            serialNumber: it.serialNumber ?? null,
            condition: it.condition ?? null,
            askingPrice: it.askingPrice,
            sortOrder: i,
          })),
        },
      },
      select: { id: true, number: true },
    });
  });
}

/** Ambil item + pastikan induknya milik tenant ini. */
async function ensureItem(tenantId: string, itemId: string) {
  const item = await db.consignmentItem.findFirst({
    where: { id: itemId, consignment: { tenantId } },
    select: { id: true, consignmentId: true, askingPrice: true },
  });
  if (!item) throw new Error("Barang titipan tidak ditemukan.");
  return item;
}

/**
 * Ubah status barang. Terjual boleh membawa harga jual aktual (default = harga
 * diinginkan). Kembali ke "Dititipkan" mengosongkan harga terjual & waktunya.
 */
export async function setItemStatus(
  tenantId: string,
  itemId: string,
  status: ConsignmentItemStatus,
  soldPrice?: number,
) {
  const item = await ensureItem(tenantId, itemId);
  if (soldPrice !== undefined && (!Number.isInteger(soldPrice) || soldPrice < 0)) {
    throw new Error("Harga terjual tidak valid.");
  }
  await db.consignmentItem.update({
    where: { id: item.id },
    data:
      status === "AVAILABLE"
        ? { status, soldPrice: null, statusAt: null }
        : status === "SOLD"
          ? { status, soldPrice: soldPrice ?? item.askingPrice, statusAt: new Date() }
          : { status, soldPrice: null, statusAt: new Date() },
  });
  return item.consignmentId;
}

/** Ubah harga jual yang diinginkan (mis. pemilik setuju turun harga). */
export async function updateItemPrice(tenantId: string, itemId: string, askingPrice: number) {
  if (!Number.isInteger(askingPrice) || askingPrice < 0) throw new Error("Harga tidak valid.");
  const item = await ensureItem(tenantId, itemId);
  await db.consignmentItem.update({ where: { id: item.id }, data: { askingPrice } });
  return item.consignmentId;
}

export async function deleteConsignment(tenantId: string, id: string) {
  const r = await db.consignment.deleteMany({ where: { id, tenantId } });
  if (r.count === 0) throw new Error("Titip jual tidak ditemukan.");
}
