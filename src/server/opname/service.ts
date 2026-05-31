import "server-only";
import { db } from "@/lib/db";

/** Service Stok Opname — ter-scope tenantId, penerapan ke stok transaksional. */

/** Buat sesi opname baru: snapshot semua produk aktif. */
export async function createOpname(tenantId: string, userId: string, note?: string) {
  const products = await db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, stock: true },
    orderBy: { name: "asc" },
  });
  if (products.length === 0) {
    throw new Error("Belum ada produk untuk diopname.");
  }
  const opname = await db.stockOpname.create({
    data: {
      tenantId,
      note: note || null,
      createdById: userId,
      items: {
        create: products.map((p) => ({
          productId: p.id,
          productName: p.name,
          systemQty: p.stock,
          countedQty: p.stock,
        })),
      },
    },
  });
  return opname;
}

export function listOpnames(tenantId: string) {
  return db.stockOpname.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
    take: 100,
  });
}

export function getOpname(tenantId: string, id: string) {
  return db.stockOpname.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { productName: "asc" } } },
  });
}

/** Simpan hasil hitung (hanya saat DRAFT). */
export async function saveOpnameCounts(
  tenantId: string,
  opnameId: string,
  counts: { itemId: string; countedQty: number }[],
) {
  const opname = await db.stockOpname.findFirst({
    where: { id: opnameId, tenantId },
    select: { id: true, status: true },
  });
  if (!opname) throw new Error("Sesi opname tidak ditemukan.");
  if (opname.status !== "DRAFT") throw new Error("Opname sudah final, tidak bisa diubah.");

  await db.$transaction(
    counts.map((c) =>
      db.stockOpnameItem.updateMany({
        where: { id: c.itemId, opnameId },
        data: { countedQty: c.countedQty },
      }),
    ),
  );
}

/** Selesaikan opname: terapkan selisih ke stok + catat movement OPNAME. */
export async function completeOpname(tenantId: string, userId: string, opnameId: string) {
  return db.$transaction(async (tx) => {
    const opname = await tx.stockOpname.findFirst({
      where: { id: opnameId, tenantId },
      include: { items: true },
    });
    if (!opname) throw new Error("Sesi opname tidak ditemukan.");
    if (opname.status !== "DRAFT") throw new Error("Opname sudah final.");

    let adjusted = 0;
    for (const item of opname.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, tenantId },
        select: { id: true, stock: true },
      });
      if (!product) continue; // produk dihapus sejak opname dibuat
      const delta = item.countedQty - product.stock;
      if (delta === 0) continue;
      await tx.product.update({
        where: { id: product.id },
        data: { stock: item.countedQty },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          type: "OPNAME",
          qty: delta,
          stockAfter: item.countedQty,
          note: `Stok opname`,
          createdById: userId,
        },
      });
      adjusted++;
    }

    await tx.stockOpname.update({
      where: { id: opname.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return { adjusted };
  });
}
