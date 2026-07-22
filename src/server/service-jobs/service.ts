import "server-only";
import { moveStock } from "@/server/shared/stock";
import { nextDocNumber } from "@/server/shared/numbering";
import { db } from "@/lib/db";
import { assertPositiveInt, assertNonNegativeInt } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { ServiceStatus, PaymentMethod } from "@/generated/prisma/enums";
import type { ServiceTicketInput } from "@/lib/validations/service";

/** Service Jasa Servis — ter-scope tenantId, mutasi stok transaksional. */

export function listProductsForService(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, sku: true, sellPrice: true, stock: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export function listTickets(tenantId: string) {
  return db.serviceTicket.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getTicket(tenantId: string, id: string) {
  return db.serviceTicket.findFirst({
    where: { id, tenantId },
    include: {
      items: { orderBy: { id: "asc" } },
      photos: { orderBy: { createdAt: "asc" }, select: { id: true, dataUrl: true, caption: true, createdAt: true } },
    },
  });
}

const MAX_PHOTO_CHARS = 1_200_000; // ~900 KB

export async function addServicePhoto(
  tenantId: string,
  userId: string,
  ticketId: string,
  dataUrl: string,
  caption?: string,
) {
  await ensureTicket(tenantId, ticketId);
  // Hanya raster base64 (tolak SVG / data: non-base64 yang bisa memuat skrip).
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(dataUrl)) {
    throw new Error("Format foto tidak valid (harus PNG/JPG/WEBP).");
  }
  if (dataUrl.length > MAX_PHOTO_CHARS) throw new Error("Foto terlalu besar. Coba foto lebih kecil.");
  return db.servicePhoto.create({
    data: { ticketId, dataUrl, caption: caption || null, createdById: userId },
  });
}

export async function removeServicePhoto(tenantId: string, ticketId: string, photoId: string) {
  await ensureTicket(tenantId, ticketId);
  return db.servicePhoto.deleteMany({ where: { id: photoId, ticketId } });
}

export async function createTicket(
  tenantId: string,
  user: { id: string; name: string },
  input: ServiceTicketInput,
) {
  let customerName = input.customerName;
  if (input.customerId) {
    const c = await db.customer.findFirst({
      where: { id: input.customerId, tenantId },
      select: { name: true },
    });
    if (c) customerName = c.name;
  }
  let technicianName: string | null = null;
  if (input.technicianId) {
    const t = await db.user.findFirst({
      where: { id: input.technicianId, tenantId },
      select: { name: true },
    });
    technicianName = t?.name ?? null;
  }

  // Transaksi dibutuhkan agar advisory lock penomoran berlaku (lihat nextDocNumber).
  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "SV", () =>
      tx.serviceTicket.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );
    return tx.serviceTicket.create({
      data: {
        tenantId,
        number,
        customerId: input.customerId ?? null,
        customerName,
        customerPhone: input.customerPhone || null,
        deviceType: input.deviceType,
        deviceBrand: input.deviceBrand || null,
        deviceInfo: input.deviceInfo || null,
        complaint: input.complaint,
        technicianId: input.technicianId ?? null,
        technicianName,
        laborCost: input.laborCost,
        total: input.laborCost,
        note: input.note || null,
        createdById: user.id,
      },
    });
  });
}

/** Hitung ulang partsCost/total/paymentStatus dari item & laborCost. */
async function recompute(tx: Prisma.TransactionClient, ticketId: string) {
  const t = await tx.serviceTicket.findUnique({
    where: { id: ticketId },
    include: { items: true },
  });
  if (!t) return;
  const partsCost = t.items.reduce((s, i) => s + i.subtotal, 0);
  const total = t.laborCost + partsCost;
  const paymentStatus = t.paid >= total && total > 0 ? "PAID" : t.paid > 0 ? "PARTIAL" : "UNPAID";
  await tx.serviceTicket.update({
    where: { id: ticketId },
    data: { partsCost, total, paymentStatus },
  });
}

async function ensureTicket(tenantId: string, ticketId: string) {
  const t = await db.serviceTicket.findFirst({
    where: { id: ticketId, tenantId },
    select: { id: true, completedAt: true },
  });
  if (!t) throw new Error("Tiket tidak ditemukan.");
  return t;
}

/** Tambah sparepart dari inventory (kurangi stok + movement). */
export async function addPart(
  tenantId: string,
  userId: string,
  ticketId: string,
  productId: string,
  qty: number,
) {
  assertPositiveInt(qty, "Jumlah");
  await ensureTicket(tenantId, ticketId);
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, sellPrice: true, costPrice: true, stock: true },
    });
    if (!product) throw new Error("Produk tidak ditemukan.");
    await moveStock(tx, {
      tenantId,
      productId: product.id,
      productName: product.name,
      delta: -qty,
      type: "SERVICE_OUT",
      note: `Servis (tiket)`,
      userId,
    });
    await tx.serviceItem.create({
      data: {
        ticketId,
        productId: product.id,
        name: product.name,
        qty,
        price: product.sellPrice,
        // Snapshot modal saat sparepart dipakai — laba tiket lama tidak ikut
        // berubah kalau harga modal produk diperbarui nanti.
        costPrice: product.costPrice,
        subtotal: product.sellPrice * qty,
        isPart: true,
      },
    });
    await recompute(tx, ticketId);
  });
}

/** Tambah baris jasa/non-stok. */
export async function addLine(
  tenantId: string,
  ticketId: string,
  name: string,
  price: number,
  qty: number,
) {
  if (!name?.trim()) throw new Error("Nama item wajib diisi.");
  assertPositiveInt(qty, "Jumlah");
  assertNonNegativeInt(price, "Harga");
  await ensureTicket(tenantId, ticketId);
  return db.$transaction(async (tx) => {
    await tx.serviceItem.create({
      data: { ticketId, name: name.trim(), qty, price, subtotal: price * qty, isPart: false },
    });
    await recompute(tx, ticketId);
  });
}

/** Hapus item; bila sparepart, kembalikan stok. */
export async function removeItem(tenantId: string, userId: string, ticketId: string, itemId: string) {
  await ensureTicket(tenantId, ticketId);
  return db.$transaction(async (tx) => {
    const item = await tx.serviceItem.findFirst({ where: { id: itemId, ticketId } });
    if (!item) throw new Error("Item tidak ditemukan.");
    if (item.isPart && item.productId) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, tenantId },
        select: { id: true },
      });
      if (product) {
        await moveStock(tx, {
          tenantId,
          productId: product.id,
          delta: item.qty,
          type: "RETURN_IN",
          note: `Batal sparepart servis`,
          userId,
        });
      }
    }
    await tx.serviceItem.delete({ where: { id: item.id } });
    await recompute(tx, ticketId);
  });
}

export async function updateLabor(tenantId: string, ticketId: string, laborCost: number) {
  assertNonNegativeInt(laborCost, "Biaya jasa");
  await ensureTicket(tenantId, ticketId);
  return db.$transaction(async (tx) => {
    await tx.serviceTicket.update({ where: { id: ticketId }, data: { laborCost } });
    await recompute(tx, ticketId);
  });
}

export async function updateStatus(tenantId: string, ticketId: string, status: ServiceStatus, diagnosis?: string) {
  const t = await ensureTicket(tenantId, ticketId);
  const done = status === "DONE" || status === "DELIVERED";
  return db.serviceTicket.update({
    where: { id: ticketId },
    data: {
      status,
      ...(diagnosis !== undefined ? { diagnosis: diagnosis || null } : {}),
      // `completedAt` = tanggal pengakuan pendapatan. Diisi sekali saat pertama
      // selesai (DONE → DELIVERED tidak menggesernya) dan dikosongkan lagi bila
      // tiket dibuka kembali agar laporan tetap konsisten.
      ...(done ? (t.completedAt ? {} : { completedAt: new Date() }) : { completedAt: null }),
    },
  });
}

export async function recordPayment(
  tenantId: string,
  ticketId: string,
  amount: number,
  method: PaymentMethod,
) {
  assertPositiveInt(amount, "Jumlah pembayaran");
  return db.$transaction(async (tx) => {
    const t = await tx.serviceTicket.findFirst({
      where: { id: ticketId, tenantId },
      select: { id: true, total: true, paid: true },
    });
    if (!t) throw new Error("Tiket tidak ditemukan.");
    const outstanding = t.total - t.paid;
    if (outstanding <= 0) throw new Error("Sudah lunas.");
    if (amount > outstanding) throw new Error(`Maksimal ${outstanding}.`);
    const newPaid = t.paid + amount;
    await tx.serviceTicket.update({
      where: { id: t.id },
      data: { paid: newPaid, paymentStatus: newPaid >= t.total ? "PAID" : "PARTIAL", paymentMethod: method },
    });
    return { paid: newPaid, outstanding: t.total - newPaid };
  });
}
