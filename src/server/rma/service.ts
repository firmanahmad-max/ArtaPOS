import "server-only";
import { nextDocNumber } from "@/server/shared/numbering";
import { db } from "@/lib/db";
import type { RmaClaimInput, RmaReceiveInput } from "@/lib/validations/rma";

/** Service RMA — klaim garansi ke distributor. Semua query ter-scope tenantId. */

export function listRmaClaims(tenantId: string, search?: string) {
  const s = search?.trim();
  return db.rmaClaim.findMany({
    where: {
      tenantId,
      ...(s
        ? {
            OR: [
              { number: { contains: s, mode: "insensitive" } },
              { productName: { contains: s, mode: "insensitive" } },
              { serialNumber: { contains: s, mode: "insensitive" } },
              { supplierName: { contains: s, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getRmaClaim(tenantId: string, id: string) {
  return db.rmaClaim.findFirst({
    where: { id, tenantId },
    include: {
      photos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, dataUrl: true, caption: true, createdAt: true },
      },
      warrantyUnit: {
        select: { id: true, serialNumber: true, customerName: true, warrantyUntil: true },
      },
    },
  });
}

export async function createRmaClaim(
  tenantId: string,
  userId: string,
  input: RmaClaimInput,
) {
  // Snapshot nama produk/supplier bila dipilih dari master data.
  let productName = input.productName;
  let serialNumber = input.serialNumber || null;
  let productId = input.productId ?? null;
  let customerName = input.customerName || null;
  let warrantyUnitId: string | null = null;
  if (input.warrantyUnitId) {
    // Tautan ke garansi pelanggan: verifikasi milik tenant + snapshot data unit.
    const wu = await db.warrantyUnit.findFirst({
      where: { id: input.warrantyUnitId, tenantId },
      select: { id: true, productName: true, serialNumber: true, productId: true, customerName: true },
    });
    if (!wu) throw new Error("Unit garansi tidak ditemukan.");
    warrantyUnitId = wu.id;
    productName = wu.productName;
    serialNumber = wu.serialNumber;
    if (wu.productId) productId = wu.productId;
    // Isi nama pelanggan dari unit garansi bila belum diketik manual.
    if (!customerName && wu.customerName) customerName = wu.customerName;
  }
  if (productId && !input.warrantyUnitId) {
    const p = await db.product.findFirst({
      where: { id: productId, tenantId },
      select: { name: true },
    });
    if (p) productName = p.name;
  }
  let supplierName = input.supplierName;
  if (input.supplierId) {
    const sup = await db.supplier.findFirst({
      where: { id: input.supplierId, tenantId },
      select: { name: true },
    });
    if (sup) supplierName = sup.name;
  }

  // Transaksi dibutuhkan agar advisory lock penomoran berlaku (lihat nextDocNumber).
  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "RMA", () =>
      tx.rmaClaim.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );
    return tx.rmaClaim.create({
      data: {
        tenantId,
        number,
        productId,
        warrantyUnitId,
        productName,
        serialNumber,
        complaint: input.complaint,
        customerName,
        customerPhone: input.customerPhone || null,
        supplierId: input.supplierId ?? null,
        supplierName,
        trackingNumber: input.trackingNumber || null,
        sentAt: input.sentAt ? new Date(input.sentAt) : new Date(),
        note: input.note || null,
        createdById: userId,
      },
    });
  });
}

/** Tandai klaim kembali/diterima dari distributor beserta hasilnya. */
export async function receiveRmaClaim(
  tenantId: string,
  id: string,
  input: RmaReceiveInput,
) {
  const claim = await db.rmaClaim.findFirst({ where: { id, tenantId }, select: { id: true, status: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  return db.rmaClaim.update({
    where: { id: claim.id },
    data: {
      status: "RETURNED",
      resolution: input.resolution,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      replacementSn: input.replacementSn || null,
      ...(input.note ? { note: input.note } : {}),
    },
  });
}

/** Tandai klaim DITOLAK distributor (barang kembali tanpa perbaikan/ganti). */
export async function rejectRmaClaim(tenantId: string, id: string, note?: string) {
  const claim = await db.rmaClaim.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  return db.rmaClaim.update({
    where: { id: claim.id },
    data: {
      status: "REJECTED",
      receivedAt: new Date(),
      ...(note ? { note } : {}),
    },
  });
}

/** Kembalikan klaim ke status DIKIRIM (koreksi salah klik). */
export async function reopenRmaClaim(tenantId: string, id: string) {
  const claim = await db.rmaClaim.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  return db.rmaClaim.update({
    where: { id: claim.id },
    data: { status: "SENT", resolution: null, receivedAt: null, replacementSn: null },
  });
}

export async function updateRmaNote(tenantId: string, id: string, note: string) {
  const claim = await db.rmaClaim.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  return db.rmaClaim.update({ where: { id: claim.id }, data: { note: note || null } });
}

// ── Foto (pola sama dengan ServicePhoto) ─────────────────────────────────—
const MAX_PHOTO_CHARS = 1_200_000; // ~900 KB
const MAX_PHOTOS = 8;

export async function addRmaPhoto(
  tenantId: string,
  userId: string,
  rmaId: string,
  dataUrl: string,
  caption?: string,
) {
  const claim = await db.rmaClaim.findFirst({ where: { id: rmaId, tenantId }, select: { id: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  if (!dataUrl.startsWith("data:image/")) throw new Error("Format gambar tidak valid.");
  if (dataUrl.length > MAX_PHOTO_CHARS) throw new Error("Ukuran foto terlalu besar (maks ~900 KB).");
  const count = await db.rmaPhoto.count({ where: { rmaId: claim.id } });
  if (count >= MAX_PHOTOS) throw new Error(`Maksimal ${MAX_PHOTOS} foto per klaim.`);
  return db.rmaPhoto.create({
    data: { rmaId: claim.id, dataUrl, caption: caption || null, createdById: userId },
  });
}

export async function removeRmaPhoto(tenantId: string, rmaId: string, photoId: string) {
  const claim = await db.rmaClaim.findFirst({ where: { id: rmaId, tenantId }, select: { id: true } });
  if (!claim) throw new Error("Klaim RMA tidak ditemukan.");
  return db.rmaPhoto.deleteMany({ where: { id: photoId, rmaId: claim.id } });
}
