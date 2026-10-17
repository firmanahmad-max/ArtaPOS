import "server-only";
import { db } from "@/lib/db";
import type { ContactInput } from "@/lib/validations/contacts";
import type { Prisma } from "@/generated/prisma/client";
import { disambiguatedName, phoneKey } from "@/lib/phone";
import { loyaltyNoteLines, programStarted, type LoyaltyConfig } from "@/lib/loyalty";

/** Service Customer — semua query ter-scope tenantId. */

export function listCustomers(tenantId: string, search?: string) {
  const s = search?.trim();
  return db.customer.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(s
        ? {
            OR: [
              { name: { contains: s, mode: "insensitive" } },
              { phone: { contains: s, mode: "insensitive" } },
              { email: { contains: s, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export function getCustomer(tenantId: string, id: string) {
  return db.customer.findFirst({ where: { id, tenantId } });
}

/** Cegah nama pelanggan duplikat (case-insensitive) dalam satu tenant. */
async function assertUniqueCustomerName(tenantId: string, name: string, excludeId?: string) {
  const dup = await db.customer.findFirst({
    where: {
      tenantId,
      isActive: true,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (dup) throw new Error(`Pelanggan dengan nama "${name}" sudah ada.`);
}

export async function createCustomer(tenantId: string, input: ContactInput) {
  await assertUniqueCustomerName(tenantId, input.name);
  return db.customer.create({
    data: {
      tenantId,
      name: input.name,
      phone: input.phone || null,
      phoneKey: phoneKey(input.phone),
      email: input.email || null,
      address: input.address || null,
      ...(input.waConsent !== undefined ? { waConsent: input.waConsent } : {}),
    },
  });
}

export async function updateCustomer(tenantId: string, id: string, input: ContactInput) {
  const e = await db.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Pelanggan tidak ditemukan.");
  await assertUniqueCustomerName(tenantId, input.name, id);
  return db.customer.update({
    where: { id },
    data: {
      name: input.name,
      phone: input.phone || null,
      phoneKey: phoneKey(input.phone),
      email: input.email || null,
      address: input.address || null,
      ...(input.waConsent !== undefined ? { waConsent: input.waConsent } : {}),
    },
  });
}

type Db = Prisma.TransactionClient | typeof db;

/** Pelanggan aktif dengan No. HP yang sama (ternormalisasi). Ambigu (>1) → null. */
export async function findCustomerByPhone(client: Db, tenantId: string, phone: string | null | undefined) {
  const key = phoneKey(phone);
  if (!key) return null;
  const rows = await client.customer.findMany({
    where: { tenantId, isActive: true, phoneKey: key },
    select: { id: true, name: true },
    take: 2,
  });
  return rows.length === 1 ? rows[0] : null;
}

/**
 * Cocokkan kontak (nama + No. HP) ke pelanggan terdaftar; bila belum ada & `create`,
 * daftarkan sebagai member baru (nama kembar → diberi akhiran 4 digit HP).
 * Mengembalikan id pelanggan, atau null bila tak bisa/tak boleh dibuat.
 */
export async function matchOrCreateCustomer(
  client: Db,
  tenantId: string,
  contact: { name: string; phone: string | null | undefined },
  create: boolean,
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findCustomerByPhone(client, tenantId, contact.phone);
  if (found) return { ...found, created: false };
  const key = phoneKey(contact.phone);
  const name = contact.name.trim();
  if (!create || !key || !name) return null;
  const dup = await client.customer.findFirst({
    where: { tenantId, isActive: true, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  const finalName = dup ? disambiguatedName(name, contact.phone) : name;
  const c = await client.customer.create({
    data: { tenantId, name: finalName, phone: contact.phone?.trim() || null, phoneKey: key },
    select: { id: true, name: true },
  });
  return { ...c, created: true };
}

/**
 * Tautkan riwayat lama: tiket servis TANPA pelanggan yang No. HP-nya cocok persis
 * (ternormalisasi) dengan SATU pelanggan terdaftar. Tidak membuat pelanggan baru.
 */
export async function linkHistoryByPhone(tenantId: string): Promise<{ tickets: number }> {
  const [customers, tickets] = await Promise.all([
    db.customer.findMany({ where: { tenantId, isActive: true, phoneKey: { not: null } }, select: { id: true, phoneKey: true } }),
    db.serviceTicket.findMany({
      where: { tenantId, customerId: null, customerPhone: { not: null } },
      select: { id: true, customerPhone: true },
      take: 5000,
    }),
  ]);
  const byKey = new Map<string, string | null>();
  for (const c of customers) byKey.set(c.phoneKey!, byKey.has(c.phoneKey!) ? null : c.id); // ambigu → null
  const groups = new Map<string, string[]>();
  for (const t of tickets) {
    const cid = byKey.get(phoneKey(t.customerPhone) ?? "");
    if (cid) groups.set(cid, [...(groups.get(cid) ?? []), t.id]);
  }
  let n = 0;
  for (const [customerId, ids] of groups) {
    const r = await db.serviceTicket.updateMany({ where: { tenantId, id: { in: ids }, customerId: null }, data: { customerId } });
    n += r.count;
  }
  return { tickets: n };
}

/** Tautkan satu tiket servis ke pelanggan (cocok No. HP, atau daftarkan member baru). */
export async function linkTicketCustomer(tenantId: string, ticketId: string) {
  return db.$transaction(async (tx) => {
    const t = await tx.serviceTicket.findFirst({
      where: { id: ticketId, tenantId },
      select: { id: true, customerId: true, customerName: true, customerPhone: true },
    });
    if (!t) throw new Error("Tiket tidak ditemukan.");
    if (t.customerId) throw new Error("Tiket sudah tertaut ke pelanggan.");
    if (!phoneKey(t.customerPhone)) throw new Error("Isi No. HP pelanggan di tiket dulu untuk menautkan.");
    const c = await matchOrCreateCustomer(tx, tenantId, { name: t.customerName ?? "Pelanggan", phone: t.customerPhone }, true);
    if (!c) throw new Error("Gagal menautkan pelanggan.");
    await tx.serviceTicket.update({ where: { id: t.id }, data: { customerId: c.id } });
    return c;
  });
}

export async function deactivateCustomer(tenantId: string, id: string) {
  const e = await db.customer.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Pelanggan tidak ditemukan.");
  return db.customer.update({ where: { id }, data: { isActive: false } });
}

// ── Poin loyalitas ─────────────────────────────────────────────────────────
/** Aturan tukar poin toko. Defensif: kolom belum ada (migrasi) → penukaran nonaktif. */
export async function getLoyaltyConfig(tenantId: string): Promise<LoyaltyConfig> {
  try {
    const t = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { pointValue: true, pointMinRedeem: true, pointsStartAt: true, pointServiceMultiplier: true },
    });
    return {
      pointValue: t?.pointValue ?? 0,
      minRedeem: t?.pointMinRedeem ?? 0,
      serviceMultiplier: t?.pointServiceMultiplier ?? 2,
      startsAt: t?.pointsStartAt?.toISOString() ?? null,
      // Dinilai di server (sumber waktu tunggal) → dikirim ke klien sebagai boolean.
      started: programStarted(t?.pointsStartAt),
    };
  } catch {
    return { pointValue: 0, minRedeem: 0 };
  }
}

/**
 * Jadwalkan mulai program poin & (opsional) nolkan saldo SEMUA pelanggan.
 * - `startAt` = batas mulai (≥ saat disimpan; lihat setLoyaltyScheduleAction).
 * - Reset dicatat per pelanggan sebagai PointEntry ADJUST (jejak audit), atomik.
 * Sebelum `startAt`: belanja tak menghasilkan poin & poin tak bisa ditukar.
 */
export async function setLoyaltySchedule(tenantId: string, startAt: Date | null, resetBalances: boolean) {
  return db.$transaction(async (tx) => {
    let resetCount = 0;
    if (resetBalances) {
      const holders = await tx.customer.findMany({
        where: { tenantId, points: { not: 0 } },
        select: { id: true, points: true },
      });
      if (holders.length > 0) {
        const label = startAt
          ? `Reset program poin (mulai ${startAt.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" })})`
          : "Reset program poin";
        await tx.pointEntry.createMany({
          data: holders.map((h) => ({ tenantId, customerId: h.id, points: -h.points, type: "ADJUST" as const, note: label })),
        });
        await tx.customer.updateMany({ where: { tenantId, points: { not: 0 } }, data: { points: 0 } });
      }
      resetCount = holders.length;
    }
    await tx.tenant.update({ where: { id: tenantId }, data: { pointsStartAt: startAt } });
    return { resetCount };
  });
}

/**
 * Baris info poin untuk nota servis/rakit PC: saldo pelanggan terdaftar SAAT INI
 * + ajakan menukar. Kosong bila tanpa pelanggan / program nonaktif.
 */
export async function customerLoyaltyLines(
  tenantId: string,
  customerId: string | null | undefined,
  /** Dokumen sumber (tiket/rakitan) → baris "Poin didapat/ditukar" dari dokumen itu. */
  ref?: { serviceTicketId: string } | { pcBuildId: string },
): Promise<string[]> {
  if (!customerId) return [];
  try {
    const [cfg, c, earned, redeemed] = await Promise.all([
      getLoyaltyConfig(tenantId),
      db.customer.findFirst({ where: { id: customerId, tenantId }, select: { points: true } }),
      ref ? sumPoints(tenantId, ref, "EARN") : 0,
      ref ? sumPoints(tenantId, ref, "REDEEM") : 0,
    ]);
    if (!c || cfg.pointValue <= 0) return [];
    return loyaltyNoteLines({ earned, redeemed: Math.max(0, -redeemed), balance: c.points }, cfg);
  } catch {
    return [];
  }
}

async function sumPoints(
  tenantId: string,
  ref: { serviceTicketId: string } | { pcBuildId: string },
  type: "EARN" | "REDEEM",
) {
  const agg = await db.pointEntry.aggregate({ where: { tenantId, type, ...ref }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/** Info poin untuk panel di detail tiket servis / rakit PC. */
export async function jobLoyaltyInfo(
  tenantId: string,
  customerId: string | null | undefined,
  ref: { serviceTicketId: string } | { pcBuildId: string },
  doc: { pointsRedeemed: number; pointsDiscount: number },
) {
  const [cfg, customer, earned] = await Promise.all([
    getLoyaltyConfig(tenantId),
    customerId
      ? db.customer.findFirst({ where: { id: customerId, tenantId }, select: { name: true, points: true } })
      : null,
    sumPoints(tenantId, ref, "EARN").catch(() => 0),
  ]);
  return { customer: customer ?? null, cfg, earned, pointsRedeemed: doc.pointsRedeemed, pointsDiscount: doc.pointsDiscount };
}

/** Jumlah pelanggan yang saldo poinnya ≠ 0 (untuk konfirmasi reset). */
export function countPointHolders(tenantId: string) {
  return db.customer.count({ where: { tenantId, points: { not: 0 } } });
}

/** Total saldo poin semua pelanggan aktif (kewajiban potongan). */
export async function totalCustomerPoints(tenantId: string): Promise<number> {
  const agg = await db.customer.aggregate({ where: { tenantId, isActive: true }, _sum: { points: true } });
  return agg._sum.points ?? 0;
}

/** Ubah aturan tukar poin (Pengaturan). */
export async function updateLoyaltyConfig(tenantId: string, cfg: LoyaltyConfig) {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      pointValue: cfg.pointValue,
      pointMinRedeem: cfg.minRedeem,
      ...(cfg.serviceMultiplier ? { pointServiceMultiplier: cfg.serviceMultiplier } : {}),
    },
  });
}

export function listPointEntries(tenantId: string, customerId: string, limit = 50) {
  return db.pointEntry.findMany({
    where: { tenantId, customerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Sesuaikan poin (REDEEM=negatif, ADJUST=manual). Cegah saldo negatif. */
export async function adjustPoints(
  tenantId: string,
  customerId: string,
  points: number,
  type: "REDEEM" | "ADJUST",
  note?: string,
) {
  return db.$transaction(async (tx) => {
    const c = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, points: true } });
    if (!c) throw new Error("Pelanggan tidak ditemukan.");
    const delta = type === "REDEEM" ? -Math.abs(points) : points;
    const newBalance = c.points + delta;
    if (newBalance < 0) throw new Error(`Poin tidak cukup (saldo ${c.points}).`);
    await tx.customer.update({ where: { id: c.id }, data: { points: newBalance } });
    await tx.pointEntry.create({ data: { tenantId, customerId, points: delta, type, note: note || null } });
    return { balance: newBalance };
  });
}
