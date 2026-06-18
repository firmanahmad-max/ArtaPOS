import "server-only";
import { db } from "@/lib/db";
import type { SaleInput } from "@/lib/validations/pos";

/** Service POS — checkout transaksional, ter-scope tenantId. */

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

      const product = await tx.product.findFirst({ where: { id: item.productId, tenantId }, select: { id: true, stock: true } });
      if (product) {
        const stockAfter = product.stock + line.qty;
        await tx.product.update({ where: { id: product.id }, data: { stock: stockAfter } });
        await tx.stockMovement.create({
          data: { tenantId, productId: product.id, type: "RETURN_IN", qty: line.qty, stockAfter, note: `Retur ${sale.number}`, createdById: userId },
        });
      }
      await tx.saleItem.update({ where: { id: item.id }, data: { returnedQty: { increment: line.qty } } });
      const subtotal = item.price * line.qty;
      refund += subtotal;
      retItems.push({ productId: item.productId, productName: item.productName, qty: line.qty, price: item.price, subtotal });
    }

    if (retItems.length === 0) throw new Error("Tidak ada item yang diretur.");

    const seq = (await tx.saleReturn.count({ where: { tenantId } })) + 1;
    const number = `RTN-${String(seq).padStart(5, "0")}`;
    await tx.saleReturn.create({
      data: { tenantId, saleId, number, refundAmount: refund, createdById: userId, items: { create: retItems } },
    });
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
      select: { id: true, total: true, paid: true },
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
      const product = await tx.product.findFirst({
        where: { id: item.productId, tenantId },
        select: { id: true, stock: true },
      });
      if (!product) continue; // produk sudah dihapus
      const stockAfter = product.stock + item.qty;
      await tx.product.update({ where: { id: product.id }, data: { stock: stockAfter } });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          type: "RETURN_IN",
          qty: item.qty,
          stockAfter,
          note: `Void ${sale.number}`,
          createdById: userId,
        },
      });
    }

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
) {
  return db.$transaction(async (tx) => {
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

    const discount = Math.min(input.discount ?? 0, subtotal);
    const total = subtotal - discount;
    const isCredit = input.paymentMethod === "CREDIT";

    // Pelanggan (wajib untuk kredit; opsional lainnya). Scoped tenant.
    let customerName: string | null = null;
    if (input.customerId) {
      const c = await tx.customer.findFirst({
        where: { id: input.customerId, tenantId },
        select: { name: true },
      });
      customerName = c?.name ?? null;
    }
    if (isCredit && !customerName) {
      throw new Error("Penjualan kredit wajib memilih pelanggan terdaftar.");
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

    // Nomor invoice berurutan per tenant.
    const seq = (await tx.sale.count({ where: { tenantId } })) + 1;
    const number = `INV-${String(seq).padStart(5, "0")}`;

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
        items: { create: itemsData },
        ...(isCredit && paid > 0
          ? { payments: { create: { tenantId, amount: paid, note: "Uang muka", createdById: cashier.id } } }
          : {}),
      },
    });

    // Potong stok + movement SALE.
    for (const it of itemsData) {
      const p = map.get(it.productId)!;
      const stockAfter = p.stock - it.qty;
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: stockAfter },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: it.productId,
          type: "SALE",
          qty: -it.qty,
          stockAfter,
          note: `Penjualan ${number}`,
          createdById: cashier.id,
        },
      });
    }

    // Hitung pemakaian transaksi untuk enforcement lisensi/demo.
    await tx.license.updateMany({
      where: { tenantId },
      data: { transactionsUsed: { increment: 1 } },
    });

    // Poin loyalitas: 1 poin per Rp 1.000 belanja (jika ada pelanggan terdaftar).
    if (input.customerId) {
      const earned = Math.floor(total / 1000);
      if (earned > 0) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { points: { increment: earned } },
        });
        await tx.pointEntry.create({
          data: { tenantId, customerId: input.customerId, points: earned, type: "EARN", note: `Belanja ${number}`, saleId: sale.id },
        });
      }
    }

    return { id: sale.id, number: sale.number, total, change };
  });
}
