import "server-only";
import { moveStock } from "@/server/shared/stock";
import { nextDocNumber } from "@/server/shared/numbering";
import { db } from "@/lib/db";
import { assertPositiveInt, assertNonNegativeInt } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import type { BuildStatus } from "@/generated/prisma/enums";
import type { PcBuildInput } from "@/lib/validations/pcbuild";

/** Service Rakit PC — ter-scope tenantId, mutasi stok transaksional. */

export function listProductsForBuild(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, sellPrice: true, stock: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export function listBuilds(tenantId: string) {
  return db.pcBuild.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 200 });
}

export function getBuild(tenantId: string, id: string) {
  return db.pcBuild.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { id: "asc" } } },
  });
}

/** Rakitan + no. HP pelanggan (untuk nota WhatsApp). Ter-scope tenant. */
export async function getBuildForNota(tenantId: string, id: string) {
  const build = await db.pcBuild.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!build) return null;
  let customerPhone: string | null = null;
  if (build.customerId) {
    const c = await db.customer.findFirst({
      where: { id: build.customerId, tenantId },
      select: { phone: true },
    });
    customerPhone = c?.phone ?? null;
  }
  return { build, customerPhone };
}

export async function createBuild(
  tenantId: string,
  user: { id: string; name: string },
  input: PcBuildInput,
) {
  let customerName = input.customerName || null;
  if (input.customerId) {
    const c = await db.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { name: true } });
    if (c) customerName = c.name;
  }
  // Transaksi dibutuhkan agar advisory lock penomoran berlaku (lihat nextDocNumber).
  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "RKT", () =>
      tx.pcBuild.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );
    return tx.pcBuild.create({
      data: {
        tenantId,
        number,
        name: input.name,
        customerId: input.customerId ?? null,
        customerName,
        buildFee: input.buildFee,
        total: input.buildFee,
        note: input.note || null,
        createdById: user.id,
      },
    });
  });
}

async function recompute(tx: Prisma.TransactionClient, buildId: string) {
  const b = await tx.pcBuild.findUnique({ where: { id: buildId }, include: { items: true } });
  if (!b) return;
  const componentsCost = b.items.reduce((s, i) => s + i.subtotal, 0);
  // Total di-floor ke 0 (jangan negatif) TANPA menulis ulang discount. Discount
  // dibatasi saat DIISI (updateDiscount); menyimpan nilai ter-clamp di sini akan
  // menghilangkan diskon yang diniatkan bila komponen sempat dikurangi lalu
  // ditambah lagi.
  const total = Math.max(0, b.buildFee + componentsCost - b.discount);
  const paymentStatus = b.paid >= total && total > 0 ? "PAID" : b.paid > 0 ? "PARTIAL" : "UNPAID";
  await tx.pcBuild.update({ where: { id: buildId }, data: { componentsCost, total, paymentStatus } });
}

async function ensureBuild(tenantId: string, buildId: string) {
  const b = await db.pcBuild.findFirst({
    where: { id: buildId, tenantId },
    select: { id: true, completedAt: true },
  });
  if (!b) throw new Error("Rakitan tidak ditemukan.");
  return b;
}

export async function addComponent(
  tenantId: string,
  userId: string,
  buildId: string,
  productId: string,
  qty: number,
) {
  assertPositiveInt(qty, "Jumlah");
  await ensureBuild(tenantId, buildId);
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
      type: "BUILD_OUT",
      note: "Rakit PC",
      userId,
    });
    await tx.pcBuildItem.create({
      // costPrice = snapshot modal saat komponen dipakai (lihat ServiceItem).
      data: {
        buildId,
        productId: product.id,
        productName: product.name,
        qty,
        price: product.sellPrice,
        costPrice: product.costPrice,
        subtotal: product.sellPrice * qty,
      },
    });
    await recompute(tx, buildId);
  });
}

export async function removeComponent(tenantId: string, userId: string, buildId: string, itemId: string) {
  await ensureBuild(tenantId, buildId);
  return db.$transaction(async (tx) => {
    const item = await tx.pcBuildItem.findFirst({ where: { id: itemId, buildId } });
    if (!item) throw new Error("Komponen tidak ditemukan.");
    // Hanya kembalikan stok bila komponen ini memang memotong stok (stockApplied).
    // Komponen bebas / hasil impor yang stoknya kurang tak pernah dipotong.
    const product =
      item.stockApplied && item.productId
        ? await tx.product.findFirst({ where: { id: item.productId, tenantId }, select: { id: true } })
        : null;
    if (product) {
      await moveStock(tx, {
        tenantId,
        productId: product.id,
        delta: item.qty,
        type: "RETURN_IN",
        note: "Batal komponen rakit",
        userId,
      });
    }
    await tx.pcBuildItem.delete({ where: { id: item.id } });
    await recompute(tx, buildId);
  });
}

export async function updateBuildFee(tenantId: string, buildId: string, buildFee: number) {
  assertNonNegativeInt(buildFee, "Biaya rakit");
  await ensureBuild(tenantId, buildId);
  return db.$transaction(async (tx) => {
    await tx.pcBuild.update({ where: { id: buildId }, data: { buildFee } });
    await recompute(tx, buildId);
  });
}

/** Set potongan harga (rupiah). Dibatasi ≤ (komponen+jasa rakit) saat diisi. */
export async function updateDiscount(tenantId: string, buildId: string, discount: number) {
  assertNonNegativeInt(discount, "Diskon");
  await ensureBuild(tenantId, buildId);
  return db.$transaction(async (tx) => {
    const b = await tx.pcBuild.findUnique({
      where: { id: buildId },
      select: { buildFee: true, items: { select: { subtotal: true } } },
    });
    if (!b) throw new Error("Rakitan tidak ditemukan.");
    const gross = b.buildFee + b.items.reduce((s, i) => s + i.subtotal, 0);
    await tx.pcBuild.update({ where: { id: buildId }, data: { discount: Math.min(discount, gross) } });
    await recompute(tx, buildId);
  });
}

export async function updateStatus(tenantId: string, buildId: string, status: BuildStatus) {
  const b = await ensureBuild(tenantId, buildId);
  const done = status === "DONE" || status === "DELIVERED";
  return db.pcBuild.update({
    where: { id: buildId },
    // `completedAt` = tanggal pengakuan pendapatan: diisi sekali saat pertama
    // selesai, dikosongkan bila rakitan dibuka kembali.
    data: { status, ...(done ? (b.completedAt ? {} : { completedAt: new Date() }) : { completedAt: null }) },
  });
}

export async function recordPayment(tenantId: string, buildId: string, amount: number) {
  assertPositiveInt(amount, "Jumlah pembayaran");
  return db.$transaction(async (tx) => {
    const b = await tx.pcBuild.findFirst({ where: { id: buildId, tenantId }, select: { id: true, total: true, paid: true } });
    if (!b) throw new Error("Rakitan tidak ditemukan.");
    const outstanding = b.total - b.paid;
    if (outstanding <= 0) throw new Error("Sudah lunas.");
    if (amount > outstanding) throw new Error(`Maksimal ${outstanding}.`);
    const newPaid = b.paid + amount;
    await tx.pcBuild.update({ where: { id: b.id }, data: { paid: newPaid, paymentStatus: newPaid >= b.total ? "PAID" : "PARTIAL" } });
    return { paid: newPaid, outstanding: b.total - newPaid };
  });
}
