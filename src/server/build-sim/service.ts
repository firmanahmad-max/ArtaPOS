import "server-only";
import { db } from "@/lib/db";
import { moveStock } from "@/server/shared/stock";
import { nextDocNumber } from "@/server/shared/numbering";
import type { Prisma } from "@/generated/prisma/client";
import type { SimStatus } from "@/generated/prisma/enums";
import type { BuildSimInput } from "@/lib/validations/build-sim";

/**
 * Service Simulasi Rakitan — ter-scope tenantId.
 * Simulasi TIDAK memotong stok (murni penawaran); stok baru dialokasikan saat
 * diimpor menjadi Rakit PC (lihat importToBuild).
 */

/** Produk untuk picker komponen (bawa modal & stok untuk margin/alokasi). */
export function listProductsForSim(tenantId: string) {
  return db.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, sku: true, sellPrice: true, costPrice: true, stock: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
}

export function listCustomersForSim(tenantId: string) {
  return db.customer.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: 1000,
  });
}

export function listSimulations(tenantId: string) {
  return db.buildSimulation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: { select: { qty: true, costPrice: true, sellPrice: true, subtotal: true } } },
  });
}

export function getSimulation(tenantId: string, id: string) {
  return db.buildSimulation.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
}

// Kolom uang = Postgres Int (INT4, maks 2_147_483_647). Batasi nilai TERHITUNG
// (subtotal & total) agar tak overflow kolom — validasi per-field saja tak cukup
// karega qty × harga bisa meledak (mis. 3jt × 999).
const SAFE_MAX = 2_000_000_000;

/** Petakan input item → data baris (subtotal dihitung server, jangan percaya klien). */
function itemsData(input: BuildSimInput) {
  return input.items.map((it, i) => {
    const qty = it.qty;
    const sellPrice = it.sellPrice ?? 0;
    const costPrice = it.costPrice ?? 0;
    if (sellPrice * qty > SAFE_MAX || costPrice * qty > SAFE_MAX) {
      throw new Error(`Nilai komponen "${it.name || `#${i + 1}`}" terlalu besar.`);
    }
    return {
      productId: it.productId ?? null,
      name: it.name,
      qty,
      costPrice,
      sellPrice,
      subtotal: sellPrice * qty,
      sortOrder: i,
    };
  });
}

/** Cegah total (jasa + komponen) melebihi kapasitas kolom Int. */
function assertTotalFits(input: BuildSimInput) {
  const components = input.items.reduce((s, it) => s + (it.sellPrice ?? 0) * it.qty, 0);
  if (input.buildFee + components > SAFE_MAX) {
    throw new Error("Total penawaran terlalu besar.");
  }
}

function parseCreatedAt(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function resolveCustomer(tenantId: string, input: BuildSimInput) {
  let customerId = input.customerId ?? null;
  let customerName = input.customerName || null;
  let customerPhone = input.customerPhone || null;
  if (customerId) {
    const c = await db.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { name: true, phone: true },
    });
    if (c) {
      customerName = c.name;
      if (!customerPhone) customerPhone = c.phone;
    } else {
      // customerId tak valid untuk tenant ini → jangan simpan ref menggantung /
      // lintas-tenant (ikut pola ketat createSale). Nama tetap dari input.
      customerId = null;
    }
  }
  return { customerId, customerName, customerPhone };
}

export async function createSimulation(
  tenantId: string,
  user: { id: string; name: string },
  input: BuildSimInput,
) {
  assertTotalFits(input);
  const { customerId, customerName, customerPhone } = await resolveCustomer(tenantId, input);
  const created = parseCreatedAt(input.createdAt);
  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "SIM", () =>
      tx.buildSimulation.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } }),
    );
    return tx.buildSimulation.create({
      data: {
        tenantId,
        number,
        name: input.name,
        customerId,
        customerName,
        customerPhone,
        budget: input.budget,
        buildFee: input.buildFee,
        note: input.note || null,
        createdById: user.id,
        ...(created ? { createdAt: created } : {}),
        items: { create: itemsData(input) },
      },
      select: { id: true },
    });
  });
}

/** Simpan ulang header + komponen (replace-all). Ditolak bila sudah diimpor. */
export async function updateSimulation(tenantId: string, id: string, input: BuildSimInput) {
  const existing = await db.buildSimulation.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Simulasi tidak ditemukan.");
  if (existing.status === "IMPORTED") throw new Error("Simulasi sudah diimpor, tidak bisa diubah.");
  assertTotalFits(input);
  const { customerId, customerName, customerPhone } = await resolveCustomer(tenantId, input);
  const created = parseCreatedAt(input.createdAt);
  return db.$transaction(async (tx) => {
    await tx.buildSimulationItem.deleteMany({ where: { simulationId: id } });
    await tx.buildSimulation.update({
      where: { id },
      data: {
        name: input.name,
        customerId,
        customerName,
        customerPhone,
        budget: input.budget,
        buildFee: input.buildFee,
        note: input.note || null,
        ...(created ? { createdAt: created } : {}),
        items: { create: itemsData(input) },
      },
    });
    return { id };
  });
}

export async function deleteSimulation(tenantId: string, id: string) {
  const r = await db.buildSimulation.deleteMany({ where: { id, tenantId } });
  if (r.count === 0) throw new Error("Simulasi tidak ditemukan.");
}

export async function setSimStatus(tenantId: string, id: string, status: SimStatus) {
  // IMPORTED hanya boleh diset lewat importToBuild.
  if (status === "IMPORTED") throw new Error("Status impor ditetapkan otomatis saat impor.");
  const r = await db.buildSimulation.updateMany({
    where: { id, tenantId, status: { not: "IMPORTED" } },
    data: { status },
  });
  if (r.count === 0) throw new Error("Simulasi tidak ditemukan atau sudah diimpor.");
}

export interface ImportResult {
  buildId: string;
  number: string;
  allocated: number; // komponen inventory yang stoknya dipotong
  pending: number; // komponen bebas / stok kurang (baris non-stok)
}

/**
 * Impor simulasi disetujui → PcBuild siap dikerjakan.
 * - Komponen inventory dgn stok cukup → stok dipotong (BUILD_OUT), stockApplied=true.
 * - Komponen bebas / stok kurang → baris non-stok (stockApplied=false), tak potong.
 * Harga jual mengikuti yang ditawarkan (sellPrice simulasi). Modal komponen
 * inventory di-snapshot dari produk saat ini; komponen bebas pakai modal simulasi.
 * Idempoten ringan: bila sudah pernah diimpor, kembalikan build yang sama.
 */
export async function importToBuild(
  tenantId: string,
  user: { id: string; name: string },
  id: string,
): Promise<ImportResult> {
  const sim = await db.buildSimulation.findFirst({
    where: { id, tenantId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!sim) throw new Error("Simulasi tidak ditemukan.");
  if (sim.importedBuildId) {
    const b = await db.pcBuild.findFirst({ where: { id: sim.importedBuildId, tenantId }, select: { id: true, number: true } });
    if (b) throw new Error(`Sudah diimpor ke rakitan ${b.number}.`);
  }
  if (sim.items.length === 0) throw new Error("Simulasi belum punya komponen.");

  return db.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, tenantId, "RKT", () =>
      tx.pcBuild.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } }),
    );
    const build = await tx.pcBuild.create({
      data: {
        tenantId,
        number,
        name: sim.name,
        customerId: sim.customerId,
        customerName: sim.customerName,
        buildFee: sim.buildFee,
        note: sim.note,
        createdById: user.id,
      },
      select: { id: true },
    });

    // Stok produk terkini untuk memutuskan alokasi (scoped tenant).
    const invIds = sim.items.map((i) => i.productId).filter((v): v is string => !!v);
    const products = invIds.length
      ? await tx.product.findMany({
          where: { id: { in: invIds }, tenantId, isActive: true },
          select: { id: true, name: true, costPrice: true, stock: true },
        })
      : [];
    const pmap = new Map(products.map((p) => [p.id, p]));

    let allocated = 0;
    let pending = 0;
    for (const it of sim.items) {
      const prod = it.productId ? pmap.get(it.productId) : undefined;
      const canAllocate = !!prod && prod.stock >= it.qty;
      if (prod && canAllocate) {
        await moveStock(tx, {
          tenantId,
          productId: prod.id,
          productName: prod.name,
          delta: -it.qty,
          type: "BUILD_OUT",
          note: `Rakit PC ${number} (impor ${sim.number})`,
          userId: user.id,
        });
      }
      await tx.pcBuildItem.create({
        data: {
          buildId: build.id,
          productId: canAllocate ? prod!.id : it.productId ?? null,
          productName: it.name,
          qty: it.qty,
          price: it.sellPrice,
          // modal: produk terkini bila inventory, else modal simulasi.
          costPrice: prod ? prod.costPrice : it.costPrice,
          subtotal: it.sellPrice * it.qty,
          stockApplied: canAllocate,
        },
      });
      if (canAllocate) allocated++;
      else pending++;
    }

    const componentsCost = sim.items.reduce((s, i) => s + i.subtotal, 0);
    const total = sim.buildFee + componentsCost;
    await tx.pcBuild.update({ where: { id: build.id }, data: { componentsCost, total } });

    // Tandai IMPORTED HANYA bila belum diimpor (importedBuildId masih null).
    // Guard di dalam transaksi → dua impor paralel/klik-ganda: yang kalah dapat
    // count 0 lalu throw, seluruh transaksi (build + potong stok) di-rollback.
    const marked = await tx.buildSimulation.updateMany({
      where: { id: sim.id, importedBuildId: null },
      data: { status: "IMPORTED", importedBuildId: build.id },
    });
    if (marked.count === 0) throw new Error("Simulasi sudah diimpor.");

    return { buildId: build.id, number, allocated, pending };
  });
}
