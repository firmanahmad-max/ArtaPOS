import "server-only";
import { db } from "@/lib/db";
import { nextDocNumber } from "@/server/shared/numbering";
import { splitConsignment } from "@/lib/consignment-calc";
import { componentsError, parseComponents, setGallerySpec, type SetComponent } from "@/lib/consignment-set";
import type { ConsignmentCommissionType, ConsignmentItemStatus } from "@/generated/prisma/enums";
import type { ConsignmentInput } from "@/lib/validations/consignment";

/**
 * Service Titip Jual — barang milik pelanggan yang ditawarkan toko.
 * Semua query ter-scope tenantId (item diakses lewat induknya).
 * Tak menyentuh stok/StockMovement. Penjualan lewat kasir dicatat di Sale
 * (lihat createSale di pos service): HPP baris = hak pemilik → laba kotor = komisi.
 * Pembayaran hak pemilik BUKAN biaya (sudah dihitung sebagai HPP) — hanya ditandai.
 */

const ITEM_ORDER = { orderBy: { sortOrder: "asc" as const } };

/** Rincian isi paket → nilai kolom JSON (null eksplisit utk field kosong). */
function toJson(list: { name: string; serialNumber?: string | null; note?: string | null }[]) {
  return parseComponents(list).map((c) => ({ name: c.name, serialNumber: c.serialNumber ?? null, note: c.note ?? null }));
}

export function listConsignments(tenantId: string) {
  return db.consignment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      items: {
        ...ITEM_ORDER,
        select: {
          category: true,
          name: true,
          components: true,
          askingPrice: true,
          status: true,
          soldPrice: true,
          commissionType: true,
          commissionValue: true,
          storeCommission: true,
          ownerShare: true,
          ownerPaidAt: true,
        },
      },
    },
  });
}

export function getConsignment(tenantId: string, id: string) {
  return db.consignment.findFirst({
    where: { id, tenantId },
    include: { items: { ...ITEM_ORDER, include: { galleryItem: { select: { id: true, isActive: true } } } } },
  });
}

/** Barang titipan yang masih ditawarkan — untuk dijual di kasir (izin pos.use). */
export function listConsignmentItemsForSale(tenantId: string) {
  return db.consignmentItem.findMany({
    where: { status: "AVAILABLE", consignment: { tenantId } },
    orderBy: [{ consignment: { createdAt: "desc" } }, { sortOrder: "asc" }],
    take: 300,
    select: {
      id: true,
      category: true,
      name: true,
      serialNumber: true,
      askingPrice: true,
      condition: true,
      components: true,
      consignment: { select: { number: true, customerName: true } },
      galleryItem: { select: { id: true } },
    },
  });
}

/** Nomor invoice untuk penjualan kasir yang menjual barang titipan (tampilan). */
export async function saleNumbersFor(tenantId: string, saleIds: string[]) {
  const ids = [...new Set(saleIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string>();
  const rows = await db.sale.findMany({ where: { id: { in: ids }, tenantId }, select: { id: true, number: true } });
  return new Map(rows.map((r) => [r.id, r.number]));
}

export async function createConsignment(tenantId: string, userId: string, input: ConsignmentInput) {
  return db.$transaction(async (tx) => {
    // Pelanggan tertaut WAJIB milik tenant ini (cegah tautan lintas-tenant).
    if (input.customerId) {
      const c = await tx.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
      if (!c) throw new Error("Pelanggan tidak ditemukan.");
    }
    const number = await nextDocNumber(tx, tenantId, "TJ", () =>
      tx.consignment.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } }),
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
            components: toJson(it.components ?? []),
            askingPrice: it.askingPrice,
            commissionType: it.commissionType,
            commissionValue: it.commissionValue,
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
    select: {
      id: true,
      consignmentId: true,
      askingPrice: true,
      condition: true,
      status: true,
      saleId: true,
      ownerPaidAt: true,
      commissionType: true,
      commissionValue: true,
    },
  });
  if (!item) throw new Error("Barang titipan tidak ditemukan.");
  return item;
}

const SOLD_VIA_POS =
  "Barang ini terjual lewat kasir. Untuk membatalkannya, lakukan void atau retur pada penjualannya.";
const OWNER_ALREADY_PAID = "Hak pemilik sudah dibayarkan. Batalkan pembayaran hak pemilik dulu.";

/**
 * Ubah status barang secara manual (di luar kasir). Terjual manual tetap mencatat
 * komisi & hak pemilik, tapi TIDAK masuk laporan keuangan (tak ada transaksi kasir).
 * Barang yang terjual lewat kasir hanya bisa dibatalkan via void/retur penjualan.
 */
export async function setItemStatus(
  tenantId: string,
  itemId: string,
  status: ConsignmentItemStatus,
  soldPrice?: number,
) {
  const item = await ensureItem(tenantId, itemId);
  if (item.saleId) throw new Error(SOLD_VIA_POS);
  if (item.ownerPaidAt) throw new Error(OWNER_ALREADY_PAID);
  if (soldPrice !== undefined && (!Number.isInteger(soldPrice) || soldPrice < 0)) {
    throw new Error("Harga terjual tidak valid.");
  }
  if (status === "SOLD") {
    const price = soldPrice ?? item.askingPrice;
    const { commission, ownerShare } = splitConsignment(price, item.commissionType, item.commissionValue);
    await db.consignmentItem.update({
      where: { id: item.id },
      data: { status, soldPrice: price, storeCommission: commission, ownerShare, statusAt: new Date() },
    });
  } else {
    await db.consignmentItem.update({
      where: { id: item.id },
      data: {
        status,
        soldPrice: null,
        storeCommission: null,
        ownerShare: null,
        statusAt: status === "AVAILABLE" ? null : new Date(),
      },
    });
  }
  return item.consignmentId;
}

/** Ubah harga diinginkan & syarat komisi — hanya selama barang masih dititipkan. */
export async function updateItemTerms(
  tenantId: string,
  itemId: string,
  terms: { askingPrice: number; commissionType: ConsignmentCommissionType; commissionValue: number },
) {
  const { askingPrice, commissionType, commissionValue } = terms;
  if (!Number.isInteger(askingPrice) || askingPrice < 0) throw new Error("Harga tidak valid.");
  if (!Number.isInteger(commissionValue) || commissionValue < 0) throw new Error("Komisi tidak valid.");
  if (commissionType === "PERCENT" && commissionValue > 100) throw new Error("Komisi persen maksimal 100%.");
  const item = await ensureItem(tenantId, itemId);
  if (item.status !== "AVAILABLE") throw new Error("Harga & komisi hanya bisa diubah selama barang masih dititipkan.");
  await db.$transaction([
    db.consignmentItem.update({
      where: { id: item.id },
      data: { askingPrice, commissionType, commissionValue },
    }),
    // Harga di Galeri Publik selalu mengikuti harga titipan.
    db.galleryItem.updateMany({ where: { consignmentItemId: item.id }, data: { price: askingPrice } }),
  ]);
  return item.consignmentId;
}

/**
 * Ubah rincian isi paket (mis. pemilik mengambil kembali monitornya) — hanya selama
 * barang masih dititipkan. Kosongkan = jadi barang tunggal. Deskripsi pajangan
 * Galeri ikut diperbarui agar pembeli tak melihat isi yang sudah tidak ada.
 */
export async function updateItemComponents(tenantId: string, itemId: string, components: SetComponent[]) {
  const list = toJson(components);
  const err = componentsError(list);
  if (err) throw new Error(err);
  const item = await ensureItem(tenantId, itemId);
  if (item.status !== "AVAILABLE") throw new Error("Isi paket hanya bisa diubah selama barang masih dititipkan.");
  await db.$transaction([
    db.consignmentItem.update({ where: { id: item.id }, data: { components: list } }),
    db.galleryItem.updateMany({
      where: { consignmentItemId: item.id },
      data: { spec: setGallerySpec(list, item.condition) },
    }),
  ]);
  return item.consignmentId;
}

/** Tandai hak pemilik satu barang terjual sudah/belum dibayarkan. */
export async function setOwnerPaid(tenantId: string, itemId: string, paid: boolean) {
  const item = await ensureItem(tenantId, itemId);
  if (item.status !== "SOLD") throw new Error("Hanya barang terjual yang punya hak pemilik.");
  await db.consignmentItem.update({ where: { id: item.id }, data: { ownerPaidAt: paid ? new Date() : null } });
  return item.consignmentId;
}

/** Bayar semua hak pemilik yang belum dibayar pada satu titipan. */
export async function payAllOwner(tenantId: string, consignmentId: string) {
  const owned = await db.consignment.findFirst({ where: { id: consignmentId, tenantId }, select: { id: true } });
  if (!owned) throw new Error("Titip jual tidak ditemukan.");
  const r = await db.consignmentItem.updateMany({
    where: { consignmentId, status: "SOLD", ownerPaidAt: null },
    data: { ownerPaidAt: new Date() },
  });
  if (r.count === 0) throw new Error("Tidak ada hak pemilik yang belum dibayar.");
  return r.count;
}

export async function deleteConsignment(tenantId: string, id: string) {
  const c = await db.consignment.findFirst({
    where: { id, tenantId },
    select: { id: true, items: { where: { saleId: { not: null } }, select: { id: true }, take: 1 } },
  });
  if (!c) throw new Error("Titip jual tidak ditemukan.");
  // Jejak audit: barang yang laku lewat kasir terhubung ke penjualan & hak pemilik.
  if (c.items.length > 0) throw new Error("Ada barang yang terjual lewat kasir — titipan ini tidak bisa dihapus.");
  await db.consignment.delete({ where: { id: c.id } });
}
