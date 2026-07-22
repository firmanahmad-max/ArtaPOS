import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { StockMovementType } from "@/generated/prisma/enums";

/**
 * Ubah stok produk secara ATOMIK sekaligus menulis StockMovement.
 *
 * Pola lama `stock: hasilHitung` (nilai absolut dari hasil baca sebelumnya)
 * rawan **lost update**: dua checkout bersamaan sama-sama membaca stok 39, lalu
 * masing-masing menulis 38 — satu pengurangan hilang dan cache jadi lebih besar
 * dari stok fisik (berisiko oversell). Ledger tetap benar, sehingga selisihnya
 * baru ketahuan lewat `npm run stock:reconcile`.
 *
 * Di sini pengurangan/penambahan diserahkan ke database (`decrement`/
 * `increment` = `SET stock = stock - n` dalam satu pernyataan SQL), dan untuk
 * stok keluar dipakai `updateMany` bersyarat `stock >= n` sehingga pengecekan
 * "stok cukup" terjadi ATOMIK bersama pengurangannya — bukan berdasarkan
 * pembacaan lama yang bisa sudah basi.
 *
 * @param delta negatif = keluar, positif = masuk.
 * @returns stok terbaru setelah mutasi.
 */
export async function moveStock(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    productId: string;
    productName?: string;
    delta: number;
    type: StockMovementType;
    note?: string;
    userId?: string | null;
  },
): Promise<number> {
  const { tenantId, productId, delta, type, note, userId } = args;

  if (delta < 0) {
    const need = -delta;
    const res = await tx.product.updateMany({
      where: { id: productId, tenantId, stock: { gte: need } },
      data: { stock: { decrement: need } },
    });
    if (res.count === 0) {
      const p = await tx.product.findFirst({
        where: { id: productId, tenantId },
        select: { name: true, stock: true },
      });
      const nama = args.productName ?? p?.name ?? "Produk";
      throw new Error(`Stok "${nama}" tidak cukup (sisa ${p?.stock ?? 0}).`);
    }
  } else if (delta > 0) {
    const res = await tx.product.updateMany({
      where: { id: productId, tenantId },
      data: { stock: { increment: delta } },
    });
    if (res.count === 0) throw new Error("Produk tidak ditemukan.");
  }

  const after = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stock: true },
  });
  await tx.stockMovement.create({
    data: {
      tenantId,
      productId,
      type,
      qty: delta,
      stockAfter: after.stock,
      note: note ?? null,
      createdById: userId ?? null,
    },
  });
  return after.stock;
}
