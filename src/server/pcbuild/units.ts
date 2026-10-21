import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { splitConsignment } from "@/lib/consignment-calc";
import { consignmentSaleName, parseComponents, setContentsText } from "@/lib/consignment-set";
import { gradeMeta, usedSaleName } from "@/lib/used-item";
import type { UnitKind, UnitOption } from "@/lib/build-units";

/**
 * Komponen rakitan dari BARANG BEKAS (milik toko) & TITIP JUAL (milik pelanggan).
 * Unit tunggal: diklaim ATOMIK saat dipakai di rakitan (status AVAILABLE → SOLD,
 * `pcBuildId` diisi) dan dilepas kembali saat komponennya dihapus — pola sama dgn
 * kasir. Baris PcBuildItem: productId = id unit (HPP ikut terhitung di Keuangan,
 * lookup produk tak ketemu → stok produk tak disentuh), stockApplied = false.
 */

export type { UnitKind, UnitOption } from "@/lib/build-units";

export interface ClaimedUnit {
  productId: string;
  usedItemId: string | null;
  consignmentItemId: string | null;
  productName: string;
  price: number;
  costPrice: number;
}

const NOT_AVAILABLE = (name: string) => `"${name}" sudah tidak tersedia (laku/dipakai/ditarik).`;

/**
 * Klaim satu unit untuk rakitan. `price` = harga jual di rakitan (default harga
 * daftar unit). Kembalikan null bila unit sudah tidak tersedia / tidak ditemukan
 * (dipakai impor simulasi agar jadi baris non-stok), atau lempar error bila `strict`.
 */
export async function claimUnitForBuild(
  tx: Prisma.TransactionClient,
  tenantId: string,
  p: { kind: UnitKind; id: string; buildId: string; price?: number; strict?: boolean },
): Promise<ClaimedUnit | null> {
  const now = new Date();
  if (p.kind === "used") {
    const u = await tx.usedItem.findFirst({
      where: { id: p.id, tenantId },
      select: { id: true, category: true, name: true, grade: true, warrantyDays: true, sellPrice: true, costPrice: true },
    });
    if (!u) {
      if (p.strict) throw new Error("Barang bekas tidak ditemukan.");
      return null;
    }
    const price = p.price ?? u.sellPrice;
    const r = await tx.usedItem.updateMany({
      where: { id: u.id, tenantId, status: "AVAILABLE" },
      data: { status: "SOLD", soldPrice: price, statusAt: now, pcBuildId: p.buildId },
    });
    if (r.count === 0) {
      if (p.strict) throw new Error(NOT_AVAILABLE(`${u.category} ${u.name}`));
      return null;
    }
    return {
      productId: u.id,
      usedItemId: u.id,
      consignmentItemId: null,
      productName: usedSaleName(u),
      price,
      costPrice: u.costPrice, // HPP = harga beli → laba = jual − beli
    };
  }

  const ci = await tx.consignmentItem.findFirst({
    where: { id: p.id, consignment: { tenantId } },
    select: {
      id: true,
      category: true,
      name: true,
      components: true,
      askingPrice: true,
      commissionType: true,
      commissionValue: true,
    },
  });
  if (!ci) {
    if (p.strict) throw new Error("Barang titipan tidak ditemukan.");
    return null;
  }
  const price = p.price ?? ci.askingPrice;
  // Komisi dari harga di rakitan; diskon tingkat rakitan ditanggung toko (pola kasir).
  const { commission, ownerShare } = splitConsignment(price, ci.commissionType, ci.commissionValue);
  const r = await tx.consignmentItem.updateMany({
    where: { id: ci.id, status: "AVAILABLE", consignment: { tenantId } },
    data: {
      status: "SOLD",
      soldPrice: price,
      storeCommission: commission,
      ownerShare,
      statusAt: now,
      pcBuildId: p.buildId,
    },
  });
  if (r.count === 0) {
    if (p.strict) throw new Error(NOT_AVAILABLE(`${ci.category} ${ci.name}`));
    return null;
  }
  return {
    productId: ci.id,
    usedItemId: null,
    consignmentItemId: ci.id,
    productName: consignmentSaleName(ci.category, ci.name, parseComponents(ci.components)),
    price,
    costPrice: ownerShare, // HPP = hak pemilik → laba toko = komisi
  };
}

/** Lepas unit dari rakitan (komponen dihapus) → kembali tersedia. */
export async function releaseUnitFromBuild(
  tx: Prisma.TransactionClient,
  tenantId: string,
  item: { usedItemId: string | null; consignmentItemId: string | null; buildId: string },
) {
  if (item.usedItemId) {
    await tx.usedItem.updateMany({
      where: { id: item.usedItemId, tenantId, status: "SOLD", pcBuildId: item.buildId },
      data: { status: "AVAILABLE", soldPrice: null, statusAt: null, pcBuildId: null },
    });
  }
  if (item.consignmentItemId) {
    const ci = await tx.consignmentItem.findFirst({
      where: { id: item.consignmentItemId, consignment: { tenantId } },
      select: { ownerPaidAt: true },
    });
    if (ci?.ownerPaidAt) {
      throw new Error("Hak pemilik barang titipan ini sudah dibayar. Batalkan pembayarannya dulu di menu Titip Jual.");
    }
    await tx.consignmentItem.updateMany({
      where: { id: item.consignmentItemId, status: "SOLD", pcBuildId: item.buildId, consignment: { tenantId } },
      data: {
        status: "AVAILABLE",
        soldPrice: null,
        storeCommission: null,
        ownerShare: null,
        statusAt: null,
        pcBuildId: null,
      },
    });
  }
}

export async function listUnitsForBuild(tenantId: string): Promise<UnitOption[]> {
  const [used, consigned] = await Promise.all([
    db.usedItem.findMany({
      where: { tenantId, status: "AVAILABLE" },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        number: true,
        category: true,
        name: true,
        serialNumber: true,
        grade: true,
        warrantyDays: true,
        sellPrice: true,
        costPrice: true,
      },
    }),
    db.consignmentItem.findMany({
      where: { status: "AVAILABLE", consignment: { tenantId } },
      orderBy: [{ consignment: { createdAt: "desc" } }, { sortOrder: "asc" }],
      take: 300,
      select: {
        id: true,
        category: true,
        name: true,
        serialNumber: true,
        components: true,
        askingPrice: true,
        commissionType: true,
        commissionValue: true,
        consignment: { select: { number: true, customerName: true } },
      },
    }),
  ]);
  return [
    ...used.map((u) => ({
      kind: "used" as const,
      id: u.id,
      ref: u.number,
      name: `${u.category} ${u.name}`,
      detail: `Bekas · Grade ${gradeMeta(u.grade).code}${u.warrantyDays > 0 ? ` · garansi ${u.warrantyDays} hari` : ""}`,
      serials: u.serialNumber ? [u.serialNumber] : [],
      sellPrice: u.sellPrice,
      costPrice: u.costPrice,
    })),
    ...consigned.map((c) => {
      const parts = parseComponents(c.components);
      return {
        kind: "consignment" as const,
        id: c.id,
        ref: c.consignment.number,
        name: `${c.category} ${c.name}`,
        detail: [`Titipan · ${c.consignment.customerName}`, parts.length ? setContentsText(parts) : ""]
          .filter(Boolean)
          .join(" · "),
        serials: [c.serialNumber ?? "", ...parts.map((x) => x.serialNumber ?? "")].filter(Boolean),
        sellPrice: c.askingPrice,
        costPrice: splitConsignment(c.askingPrice, c.commissionType, c.commissionValue).ownerShare,
      };
    }),
  ];
}

/** No. dokumen (BK-/TJ-) untuk baris komponen unit → Map(unitId → nomor). Ter-scope tenant. */
export async function unitRefsFor(
  tenantId: string,
  items: { usedItemId: string | null; consignmentItemId: string | null }[],
) {
  const usedIds = items.map((i) => i.usedItemId).filter((v): v is string => !!v);
  const csIds = items.map((i) => i.consignmentItemId).filter((v): v is string => !!v);
  const [used, cs] = await Promise.all([
    usedIds.length
      ? db.usedItem.findMany({ where: { id: { in: usedIds }, tenantId }, select: { id: true, number: true } })
      : [],
    csIds.length
      ? db.consignmentItem.findMany({
          where: { id: { in: csIds }, consignment: { tenantId } },
          select: { id: true, consignment: { select: { number: true } } },
        })
      : [],
  ]);
  return new Map<string, string>([
    ...used.map((u) => [u.id, u.number] as [string, string]),
    ...cs.map((c) => [c.id, c.consignment.number] as [string, string]),
  ]);
}

/** Nomor rakitan untuk tampilan "dipakai di rakitan RKT-xxx" (ter-scope tenant). */
export async function buildNumberFor(tenantId: string, buildId: string | null) {
  if (!buildId) return null;
  return db.pcBuild.findFirst({ where: { id: buildId, tenantId }, select: { id: true, number: true } });
}
