import "server-only";
import { moveStock } from "@/server/shared/stock";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { nextDocNumber } from "@/server/shared/numbering";
import type { SaleInput } from "@/lib/validations/pos";
import { splitConsignment } from "@/lib/consignment-calc";
import { consignmentSaleName, parseComponents } from "@/lib/consignment-set";
import { usedSaleName } from "@/lib/used-item";
import { earnedPointsTarget, programStarted, resolveRedemption, saleEligibleRupiah } from "@/lib/loyalty";
import { awardPointsUpTo, loadLoyalty } from "@/server/loyalty/service";

/** Service POS — checkout transaksional, ter-scope tenantId. */

/**
 * Kembalikan barang titipan yang dijual `saleId` ke status "Dititipkan" (void/retur).
 * Ditolak bila hak pemilik sudah dibayarkan — uangnya sudah keluar ke pemilik,
 * jadi pembayaran itu harus dibatalkan dulu agar catatan tetap konsisten.
 */
async function revertConsignmentSale(
  tx: Prisma.TransactionClient,
  tenantId: string,
  consignmentItemId: string,
  saleId: string,
) {
  const ci = await tx.consignmentItem.findFirst({
    where: { id: consignmentItemId, consignment: { tenantId } },
    select: { id: true, name: true, status: true, saleId: true, ownerPaidAt: true },
  });
  if (!ci || ci.status !== "SOLD" || ci.saleId !== saleId) return; // sudah tak terkait penjualan ini
  if (ci.ownerPaidAt) {
    throw new Error(
      `Hak pemilik untuk "${ci.name}" sudah dibayarkan. Batalkan pembayaran hak pemilik dulu di menu Titip Jual.`,
    );
  }
  await tx.consignmentItem.update({
    where: { id: ci.id },
    data: { status: "AVAILABLE", soldPrice: null, storeCommission: null, ownerShare: null, saleId: null, statusAt: null },
  });
}

/** Kembalikan barang bekas yang dijual `saleId` ke status "Tersedia" (void/retur). */
async function revertUsedSale(tx: Prisma.TransactionClient, tenantId: string, usedItemId: string, saleId: string) {
  await tx.usedItem.updateMany({
    where: { id: usedItemId, tenantId, status: "SOLD", saleId },
    data: { status: "AVAILABLE", soldPrice: null, saleId: null, statusAt: null },
  });
}

export function listProductsForSale(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      sellPrice: true,
      costPrice: true,
      stock: true,
      minStock: true,
      unit: { select: { symbol: true } },
    },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export function getSale(tenantId: string, id: string) {
  return db.sale.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "asc" } },
      returns: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * Tarik kembali poin loyalitas dari sebuah penjualan (void/retur).
 * `max` membatasi jumlah yang ditarik (untuk retur sebagian); bila null, tarik
 * seluruh poin EARN penjualan itu. Saldo tak pernah dibuat negatif — pelanggan
 * mungkin sudah menukarkan poinnya.
 */
async function reversePoints(
  tx: Prisma.TransactionClient,
  tenantId: string,
  saleId: string,
  customerId: string | null,
  note: string,
  max: number | null = null,
) {
  if (!customerId) return;
  const agg = await tx.pointEntry.aggregate({
    // Hanya poin yang DIDAPAT (EARN) & penarikannya (ADJUST). Poin yang DITUKAR (REDEEM)
    // dikembalikan terpisah lewat refundRedeemedPoints.
    where: { tenantId, saleId, type: { in: ["EARN", "ADJUST"] } },
    _sum: { points: true },
  });
  const outstanding = agg._sum.points ?? 0; // EARN positif, penarikan negatif
  if (outstanding <= 0) return;
  const customer = await tx.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, points: true },
  });
  if (!customer) return;
  const take = Math.min(outstanding, max ?? outstanding, customer.points);
  if (take <= 0) return;
  await tx.customer.update({ where: { id: customer.id }, data: { points: { decrement: take } } });
  await tx.pointEntry.create({
    data: { tenantId, customerId: customer.id, points: -take, type: "ADJUST", note, saleId },
  });
}

/**
 * Kembalikan poin yang DITUKAR pada penjualan (void): saldo REDEEM bersih untuk sale
 * ini (negatif = belum dikembalikan) dibalik penuh. Idempoten — void kedua tak berefek.
 */
async function refundRedeemedPoints(
  tx: Prisma.TransactionClient,
  tenantId: string,
  saleId: string,
  customerId: string | null,
  note: string,
) {
  if (!customerId) return;
  const agg = await tx.pointEntry.aggregate({ where: { tenantId, saleId, type: "REDEEM" }, _sum: { points: true } });
  const owed = -(agg._sum.points ?? 0);
  if (owed <= 0) return;
  const r = await tx.customer.updateMany({ where: { id: customerId, tenantId }, data: { points: { increment: owed } } });
  if (r.count === 0) return; // pelanggan sudah dihapus
  await tx.pointEntry.create({ data: { tenantId, customerId, points: owed, type: "REDEEM", note, saleId } });
}

/**
 * Poin penjualan ini masih "berlaku"? Penjualan SEBELUM tanggal mulai program
 * (`pointsStartAt`) poinnya sudah direset — jangan tarik/kembalikan apa pun saat
 * void/retur, agar poin baru pelanggan tak ikut terpotong.
 */
async function saleCountsForPoints(tx: Prisma.TransactionClient, tenantId: string, saleCreatedAt: Date) {
  const t = await tx.tenant.findUnique({ where: { id: tenantId }, select: { pointsStartAt: true } });
  return !t?.pointsStartAt || saleCreatedAt >= t.pointsStartAt;
}

/** Retur penjualan sebagian/seluruh. Mengembalikan stok + catat dokumen retur. */
export async function createReturn(
  tenantId: string,
  userId: string,
  saleId: string,
  lines: { saleItemId: string; qty: number }[],
) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId, status: "COMPLETED" },
      include: { items: true },
    });
    if (!sale) throw new Error("Transaksi tidak ditemukan atau sudah void.");

    let refund = 0;
    const retItems: { productId: string; productName: string; qty: number; price: number; subtotal: number }[] = [];

    for (const line of lines) {
      if (!line.qty || line.qty <= 0) continue;
      const item = sale.items.find((i) => i.id === line.saleItemId);
      if (!item) throw new Error("Item tidak ditemukan.");
      const remaining = item.qty - item.returnedQty;
      if (line.qty > remaining) throw new Error(`Qty retur "${item.productName}" melebihi sisa (${remaining}).`);

      // Barang titipan: kembali ke "Dititipkan" (bukan stok toko).
      if (item.consignmentItemId) {
        await revertConsignmentSale(tx, tenantId, item.consignmentItemId, sale.id);
      }
      // Barang bekas: kembali "Tersedia" (bukan stok produk).
      if (item.usedItemId) await revertUsedSale(tx, tenantId, item.usedItemId, sale.id);
      const product = item.consignmentItemId || item.usedItemId
        ? null
        : await tx.product.findFirst({ where: { id: item.productId, tenantId }, select: { id: true } });
      if (product) {
        await moveStock(tx, {
          tenantId,
          productId: product.id,
          delta: line.qty,
          type: "RETURN_IN",
          note: `Retur ${sale.number}`,
          userId,
        });
      }
      await tx.saleItem.update({ where: { id: item.id }, data: { returnedQty: { increment: line.qty } } });
      // Refund PROPORSIONAL: diskon per-baris dialokasikan ke unit yang diretur,
      // jadi yang dikembalikan = yang dibayar (bukan harga kotor). item.subtotal
      // sudah net diskon. Selisih kumulatif memastikan total refund lintas
      // beberapa retur PERSIS = subtotal bersih (tanpa drift pembulatan) dan
      // retur penuh mengembalikan tepat subtotal.
      const refundedBefore = Math.round((item.subtotal * item.returnedQty) / item.qty);
      const refundedAfter = Math.round((item.subtotal * (item.returnedQty + line.qty)) / item.qty);
      const lineRefund = refundedAfter - refundedBefore;
      refund += lineRefund;
      retItems.push({ productId: item.productId, productName: item.productName, qty: line.qty, price: item.price, subtotal: lineRefund });
    }

    if (retItems.length === 0) throw new Error("Tidak ada item yang diretur.");

    const number = await nextDocNumber(tx, tenantId, "RTN", () =>
      tx.saleReturn.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );
    await tx.saleReturn.create({
      data: { tenantId, saleId, number, refundAmount: refund, createdById: userId, items: { create: retItems } },
    });

    // Poin ikut ditarik sebanding nilai barang yang diretur (tarif earn sama).
    if (await saleCountsForPoints(tx, tenantId, sale.createdAt)) {
      await reversePoints(tx, tenantId, saleId, sale.customerId, `Retur ${number}`, Math.floor(refund / 1000));
    }

    return { number, refund };
  });
}

/** Daftar piutang (penjualan kredit belum lunas). */
export async function listReceivables(tenantId: string) {
  const rows = await db.sale.findMany({
    where: { tenantId, status: "COMPLETED", paymentStatus: { not: "PAID" } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
  const now = Date.now();
  return rows.map((s) => ({
    id: s.id,
    number: s.number,
    customerName: s.customerName,
    dueDate: s.dueDate,
    total: s.total,
    paid: s.paid,
    outstanding: s.total - s.paid,
    overdue: s.dueDate ? s.dueDate.getTime() < now : false,
  }));
}

/** Catat pembayaran piutang (cicilan/pelunasan). */
export async function recordSalePayment(
  tenantId: string,
  userId: string,
  saleId: string,
  amount: number,
  note?: string,
) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId, status: "COMPLETED" },
      select: {
        id: true,
        number: true,
        total: true,
        paid: true,
        customerId: true,
        createdAt: true,
        items: { where: { consignmentItemId: { not: null } }, select: { subtotal: true } },
      },
    });
    if (!sale) throw new Error("Penjualan tidak ditemukan.");
    const outstanding = sale.total - sale.paid;
    if (outstanding <= 0) throw new Error("Piutang sudah lunas.");
    if (amount > outstanding) throw new Error(`Maksimal pembayaran ${outstanding}.`);

    await tx.salePayment.create({
      data: { tenantId, saleId, amount, note: note || null, createdById: userId },
    });
    const newPaid = sale.paid + amount;
    await tx.sale.update({
      where: { id: sale.id },
      data: { paid: newPaid, paymentStatus: newPaid >= sale.total ? "PAID" : "PARTIAL" },
    });
    // Poin penjualan KREDIT mengikuti uang yang masuk: pelunasan memberi sisa poinnya.
    // Penjualan sebelum tanggal mulai program tidak mendapat poin.
    if (sale.customerId) {
      const cfg = await loadLoyalty(tx, tenantId);
      if (cfg.started && (!cfg.startAt || sale.createdAt >= cfg.startAt)) {
        const consignmentNet = sale.items.reduce((s, i) => s + i.subtotal, 0);
        const added = await awardPointsUpTo(tx, {
          tenantId,
          customerId: sale.customerId,
          target: earnedPointsTarget(saleEligibleRupiah(sale.total, consignmentNet), sale.total, newPaid),
          ref: { saleId: sale.id },
          note: `Pembayaran ${sale.number}`,
        });
        if (added > 0) await tx.sale.update({ where: { id: sale.id }, data: { pointsEarned: { increment: added } } });
      }
    }
    return { paid: newPaid, outstanding: sale.total - newPaid };
  });
}

export function listSales(tenantId: string, limit = 50) {
  return db.sale.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
    take: limit,
  });
}

/** Daftar penjualan dengan paginasi. */
export async function listSalesPaged(tenantId: string, page = 1, perPage = 25) {
  const safePage = Math.max(1, page);
  const [items, total] = await Promise.all([
    db.sale.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * perPage,
      take: perPage,
    }),
    db.sale.count({ where: { tenantId } }),
  ]);
  return { items, total, page: safePage, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Ringkasan penjualan untuk kartu KPI: omzet & jumlah transaksi selesai, jumlah void. */
export async function salesSummary(tenantId: string) {
  const [agg, voidCount] = await Promise.all([
    db.sale.aggregate({
      where: { tenantId, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
    db.sale.count({ where: { tenantId, status: "VOID" } }),
  ]);
  return { revenue: agg._sum.total ?? 0, completedCount: agg._count, voidCount };
}

/** Batalkan transaksi (VOID): kembalikan stok + catat movement RETURN_IN. */
export async function voidSale(tenantId: string, userId: string, saleId: string) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });
    if (!sale) throw new Error("Transaksi tidak ditemukan.");
    if (sale.status === "VOID") throw new Error("Transaksi sudah dibatalkan.");

    for (const item of sale.items) {
      // HANYA sisa yang belum diretur. Qty yang sudah diretur sebelumnya sudah
      // dikembalikan ke stok oleh createReturn — mengembalikan qty penuh di
      // sini akan menggandakan stok.
      const remaining = item.qty - item.returnedQty;
      if (remaining <= 0) continue;
      // Barang titipan: kembali ke "Dititipkan" (bukan stok toko).
      if (item.consignmentItemId) {
        await revertConsignmentSale(tx, tenantId, item.consignmentItemId, sale.id);
        continue;
      }
      // Barang bekas: kembali "Tersedia" (bukan stok produk).
      if (item.usedItemId) {
        await revertUsedSale(tx, tenantId, item.usedItemId, sale.id);
        continue;
      }
      const product = await tx.product.findFirst({
        where: { id: item.productId, tenantId },
        select: { id: true },
      });
      if (!product) continue; // produk sudah dihapus
      await moveStock(tx, {
        tenantId,
        productId: product.id,
        delta: remaining,
        type: "RETURN_IN",
        note: `Void ${sale.number}`,
        userId,
      });
    }

    // Kembalikan poin yang ditukar, lalu tarik kembali poin yang didapat dari penjualan ini.
    if (await saleCountsForPoints(tx, tenantId, sale.createdAt)) {
      await refundRedeemedPoints(tx, tenantId, sale.id, sale.customerId, `Pengembalian poin tukar (void ${sale.number})`);
      await reversePoints(tx, tenantId, sale.id, sale.customerId, `Void ${sale.number}`);
    }

    // Kembalikan kuota transaksi lisensi — transaksi yang dibatalkan tidak
    // seharusnya menghabiskan jatah paket demo. `gt: 0` mencegah nilai negatif.
    await tx.license.updateMany({
      where: { tenantId, transactionsUsed: { gt: 0 } },
      data: { transactionsUsed: { decrement: 1 } },
    });

    await tx.sale.update({ where: { id: sale.id }, data: { status: "VOID" } });
    return { number: sale.number };
  });
}

export interface Cashier {
  id: string;
  name: string;
}

/**
 * Buat transaksi penjualan.
 * - Harga diambil dari DB (BUKAN dari klien) → cegah manipulasi.
 * - Stok dipotong transaksional + tulis StockMovement SALE. Cegah oversell.
 * - Nomor invoice berurutan per tenant.
 */
export async function createSale(
  tenantId: string,
  cashier: Cashier,
  input: SaleInput,
): Promise<{ id: string; number: string; total: number; change: number; duplicate: boolean }> {
  // Idempotensi sinkron offline: bila operasi ini sudah pernah tersimpan
  // (perangkat mengirim ulang), kembalikan penjualan yang ada tanpa dobel.
  if (input.clientOpId) {
    const existing = await db.sale.findFirst({
      where: { tenantId, clientOpId: input.clientOpId },
      select: { id: true, number: true, total: true, change: true },
    });
    if (existing) return { ...existing, duplicate: true };
  }
  try {
    return await db.$transaction(async (tx) => {
    // Ambil produk terkait (scoped tenant).
    const ids = input.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: ids }, tenantId, isActive: true },
      select: { id: true, name: true, sku: true, sellPrice: true, costPrice: true, stock: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const itemsData = input.items.map((it) => {
      const p = map.get(it.productId);
      if (!p) throw new Error(`Produk tidak ditemukan.`);
      if (p.stock < it.qty) {
        throw new Error(`Stok "${p.name}" tidak cukup (sisa ${p.stock}).`);
      }
      const gross = p.sellPrice * it.qty;
      const disc = Math.min(Math.max(0, it.discount ?? 0), gross);
      const lineSubtotal = gross - disc;
      subtotal += lineSubtotal;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        qty: it.qty,
        price: p.sellPrice,
        costPrice: p.costPrice,
        discount: disc,
        subtotal: lineSubtotal,
      };
    });

    // ── Barang TITIPAN (titip jual): unik 1 unit; harga & syarat komisi dari DB ──
    // Komisi dihitung dari harga bersih baris (setelah diskon baris). Diskon tingkat
    // transaksi ditanggung toko — hak pemilik tidak ikut terpotong.
    const csInput = input.consignmentItems ?? [];
    const csIds = csInput.map((c) => c.consignmentItemId);
    if (new Set(csIds).size !== csIds.length) throw new Error("Barang titipan tercantum dua kali di keranjang.");
    const csRows = csIds.length
      ? await tx.consignmentItem.findMany({
          where: { id: { in: csIds }, consignment: { tenantId } },
          select: {
            id: true,
            category: true,
            name: true,
            serialNumber: true,
            components: true,
            askingPrice: true,
            status: true,
            commissionType: true,
            commissionValue: true,
          },
        })
      : [];
    const csMap = new Map(csRows.map((r) => [r.id, r]));
    const csSplits: { id: string; soldPrice: number; commission: number; ownerShare: number }[] = [];
    const consignmentItemsData = csInput.map((c) => {
      const r = csMap.get(c.consignmentItemId);
      if (!r) throw new Error("Barang titipan tidak ditemukan.");
      if (r.status !== "AVAILABLE") throw new Error(`Barang titipan "${r.name}" sudah tidak tersedia.`);
      const disc = Math.min(Math.max(0, c.discount ?? 0), r.askingPrice);
      const net = r.askingPrice - disc;
      const { commission, ownerShare } = splitConsignment(net, r.commissionType, r.commissionValue);
      subtotal += net;
      csSplits.push({ id: r.id, soldPrice: net, commission, ownerShare });
      return {
        // productId = id barang titipan (BUKAN produk) — lihat komentar model SaleItem.
        productId: r.id,
        consignmentItemId: r.id,
        // Paket/set → nama + daftar isi tercetak di struk (satu baris, satu harga).
        productName: consignmentSaleName(r.category, r.name, parseComponents(r.components)),
        sku: r.serialNumber ?? null,
        qty: 1,
        price: r.askingPrice,
        costPrice: ownerShare, // HPP = hak pemilik → laba kotor toko = komisi
        discount: disc,
        subtotal: net,
      };
    });

    // ── Barang BEKAS milik toko: unik 1 unit; harga dari DB, HPP = harga beli ──
    const usedInput = input.usedItems ?? [];
    const usedIds = usedInput.map((u) => u.usedItemId);
    if (new Set(usedIds).size !== usedIds.length) throw new Error("Barang bekas tercantum dua kali di keranjang.");
    const usedRows = usedIds.length
      ? await tx.usedItem.findMany({
          where: { id: { in: usedIds }, tenantId },
          select: {
            id: true,
            number: true,
            category: true,
            name: true,
            serialNumber: true,
            grade: true,
            warrantyDays: true,
            costPrice: true,
            sellPrice: true,
            status: true,
          },
        })
      : [];
    const usedMap = new Map(usedRows.map((r) => [r.id, r]));
    const usedClaims: { id: string; soldPrice: number }[] = [];
    const usedItemsData = usedInput.map((u) => {
      const r = usedMap.get(u.usedItemId);
      if (!r) throw new Error("Barang bekas tidak ditemukan.");
      if (r.status !== "AVAILABLE") throw new Error(`Barang bekas "${r.name}" sudah tidak tersedia.`);
      const disc = Math.min(Math.max(0, u.discount ?? 0), r.sellPrice);
      const net = r.sellPrice - disc;
      subtotal += net;
      usedClaims.push({ id: r.id, soldPrice: net });
      return {
        // productId = id barang bekas (BUKAN produk) — lihat komentar model SaleItem.
        productId: r.id,
        usedItemId: r.id,
        productName: usedSaleName(r),
        sku: r.serialNumber || r.number,
        qty: 1,
        price: r.sellPrice,
        costPrice: r.costPrice, // HPP = harga beli → laba kotor = jual − beli
        discount: disc,
        subtotal: net,
      };
    });

    const discount = Math.min(input.discount ?? 0, subtotal);
    // Biaya lain/jasa (mis. setup/instal) — menambah total, tanpa HPP.
    const serviceFee = Math.max(0, input.serviceFee ?? 0);
    const serviceFeeLabel = serviceFee > 0 ? input.serviceFeeLabel?.trim() || null : null;
    // Total sebelum tukar poin (potongan poin dihitung setelah pelanggan diverifikasi).
    let total = subtotal - discount + serviceFee;
    const isCredit = input.paymentMethod === "CREDIT";

    // Pelanggan (wajib untuk kredit; opsional lainnya). Scoped tenant.
    let customerName: string | null = null;
    if (input.customerId) {
      const c = await tx.customer.findFirst({
        where: { id: input.customerId, tenantId },
        select: { name: true },
      });
      // WAJIB tolak bila tak ditemukan. Kalau diteruskan, penjualan menyimpan
      // customerId milik tenant lain dan penambahan poin di bawah akan menulis
      // ke pelanggan tenant lain.
      if (!c) throw new Error("Pelanggan tidak ditemukan.");
      customerName = c.name;
    }
    if (isCredit && !customerName) {
      throw new Error("Penjualan kredit wajib memilih pelanggan terdaftar.");
    }

    // Aturan poin toko (nilai, minimal, jadwal mulai). "Sudah mulai" dinilai pada waktu
    // TRANSAKSI terjadi (penjualan offline memakai waktu di perangkat).
    const lt = input.customerId
      ? await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { pointValue: true, pointMinRedeem: true, pointsStartAt: true },
        })
      : null;
    const saleAt = input.clientCreatedAt ? Date.parse(input.clientCreatedAt) : Date.now();
    const loyalty = {
      pointValue: lt?.pointValue ?? 0,
      minRedeem: lt?.pointMinRedeem ?? 0,
      startsAt: lt?.pointsStartAt?.toISOString() ?? null,
      started: programStarted(lt?.pointsStartAt, saleAt),
    };

    // Tukar poin loyalitas → potongan. Nilai & minimal dari pengaturan toko (DB),
    // saldo dari DB; dipotong atomik setelah penjualan dibuat.
    let pointsRedeemed = 0;
    let pointsDiscount = 0;
    if ((input.redeemPoints ?? 0) > 0) {
      if (!input.customerId) throw new Error("Tukar poin wajib memilih pelanggan terdaftar.");
      const c = await tx.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { points: true } });
      const r = resolveRedemption(input.redeemPoints ?? 0, c?.points ?? 0, total, loyalty);
      if (r.error) throw new Error(r.error);
      pointsRedeemed = r.points;
      pointsDiscount = r.discount;
      total -= pointsDiscount;
    }

    // Logika pembayaran.
    let paid: number;
    if (isCredit) {
      paid = Math.min(Math.max(0, input.paid ?? 0), total); // uang muka (DP)
    } else if (input.paymentMethod === "CASH") {
      paid = input.paid ?? 0;
      if (paid < total) throw new Error("Jumlah bayar kurang dari total.");
    } else {
      paid = total; // transfer/QRIS dianggap pas
    }
    const change = isCredit ? 0 : Math.max(0, paid - total);
    const paymentStatus = paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
    const dueDate = isCredit && input.dueDate ? new Date(input.dueDate) : null;

    // Nomor invoice berurutan per tenant (aman dari balapan antar-kasir).
    const number = await nextDocNumber(tx, tenantId, "INV", () =>
      tx.sale.findFirst({
        where: { tenantId },
        orderBy: { number: "desc" },
        select: { number: true },
      }),
    );

    // Tautkan ke shift kasir yang sedang terbuka (bila ada).
    const openShift = await tx.cashierShift.findFirst({
      where: { tenantId, userId: cashier.id, status: "OPEN" },
      select: { id: true },
    });

    const sale = await tx.sale.create({
      data: {
        tenantId,
        number,
        customerId: input.customerId ?? null,
        customerName,
        subtotal,
        discount,
        serviceFee,
        serviceFeeLabel,
        pointsRedeemed,
        pointsDiscount,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        paid,
        change,
        dueDate,
        cashierId: cashier.id,
        cashierName: cashier.name,
        shiftId: openShift?.id ?? null,
        note: input.note || null,
        clientOpId: input.clientOpId ?? null,
        // Penjualan offline bertanggal saat TERJADI di perangkat, bukan saat sinkron.
        ...(input.clientCreatedAt ? { createdAt: new Date(input.clientCreatedAt) } : {}),
        items: { create: [...itemsData, ...consignmentItemsData, ...usedItemsData] },
        ...(isCredit && paid > 0
          ? { payments: { create: { tenantId, amount: paid, note: "Uang muka", createdById: cashier.id } } }
          : {}),
      },
    });

    // Potong stok + movement SALE. Atomik: cek "stok cukup" terjadi bersama
    // pengurangannya, jadi dua kasir yang checkout bersamaan tak bisa oversell.
    for (const it of itemsData) {
      await moveStock(tx, {
        tenantId,
        productId: it.productId,
        productName: it.productName,
        delta: -it.qty,
        type: "SALE",
        note: `Penjualan ${number}`,
        userId: cashier.id,
      });
    }

    // Klaim barang titipan secara ATOMIK (hanya bila masih AVAILABLE) → dua kasir
    // yang checkout bersamaan tak bisa menjual unit yang sama. Gagal → rollback.
    for (const s of csSplits) {
      const claimed = await tx.consignmentItem.updateMany({
        where: { id: s.id, status: "AVAILABLE", consignment: { tenantId } },
        data: {
          status: "SOLD",
          soldPrice: s.soldPrice,
          storeCommission: s.commission,
          ownerShare: s.ownerShare,
          saleId: sale.id,
          statusAt: new Date(),
          ownerPaidAt: null,
        },
      });
      if (claimed.count !== 1) throw new Error("Barang titipan baru saja terjual di transaksi lain.");
    }

    // Klaim barang bekas secara ATOMIK (hanya bila masih AVAILABLE) — cegah jual ganda.
    for (const u of usedClaims) {
      const claimed = await tx.usedItem.updateMany({
        where: { id: u.id, tenantId, status: "AVAILABLE" },
        data: { status: "SOLD", soldPrice: u.soldPrice, saleId: sale.id, statusAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("Barang bekas baru saja terjual di transaksi lain.");
    }

    // Hitung pemakaian transaksi untuk enforcement lisensi/demo.
    await tx.license.updateMany({
      where: { tenantId },
      data: { transactionsUsed: { increment: 1 } },
    });

    // Tukar poin: potong saldo ATOMIK (hanya bila saldo masih cukup) — dua kasir yang
    // memakai poin pelanggan yang sama bersamaan tak bisa membuat saldo negatif.
    if (input.customerId && pointsRedeemed > 0) {
      const used = await tx.customer.updateMany({
        where: { id: input.customerId, tenantId, points: { gte: pointsRedeemed } },
        data: { points: { decrement: pointsRedeemed } },
      });
      if (used.count !== 1) throw new Error("Saldo poin pelanggan berubah — muat ulang lalu coba lagi.");
      await tx.pointEntry.create({
        data: { tenantId, customerId: input.customerId, points: -pointsRedeemed, type: "REDEEM", note: `Tukar di ${number}`, saleId: sale.id },
      });
    }

    // Poin loyalitas: 1 poin per Rp 1.000 belanja (pelanggan terdaftar & program sudah mulai).
    // - Barang TITIPAN tidak menghasilkan poin (toko hanya untung komisi).
    // - Penjualan KREDIT: poin sebesar porsi yang sudah dibayar (DP); sisanya saat pelunasan.
    if (input.customerId && loyalty.started) {
      const consignmentNet = consignmentItemsData.reduce((s, l) => s + l.subtotal, 0);
      const earned = await awardPointsUpTo(tx, {
        tenantId,
        customerId: input.customerId,
        target: earnedPointsTarget(saleEligibleRupiah(total, consignmentNet), total, Math.min(paid, total)),
        ref: { saleId: sale.id },
        note: `Belanja ${number}`,
      });
      // Snapshot poin untuk struk: didapat & saldo SETELAH transaksi.
      const after = await tx.customer.findFirst({ where: { id: input.customerId, tenantId }, select: { points: true } });
      await tx.sale.update({
        where: { id: sale.id },
        data: { pointsEarned: earned, pointsBalance: after?.points ?? null },
      });
    }

      return { id: sale.id, number: sale.number, total, change, duplicate: false };
    });
  } catch (e) {
    // Balapan: dua sinkron paralel dengan clientOpId sama → salah satu kena
    // unique constraint. Ambil penjualan yang sudah tersimpan, jangan gagal.
    if (input.clientOpId && (e as { code?: string })?.code === "P2002") {
      const existing = await db.sale.findFirst({
        where: { tenantId, clientOpId: input.clientOpId },
        select: { id: true, number: true, total: true, change: true },
      });
      if (existing) return { ...existing, duplicate: true };
    }
    throw e;
  }
}
