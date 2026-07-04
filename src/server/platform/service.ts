import "server-only";
import { db } from "@/lib/db";
import type { TenantLicenseInput, PromoCodeInput } from "@/lib/validations/platform";

/**
 * Service Platform Admin (operator SaaS) — LINTAS-TENANT. Hanya boleh dipanggil
 * di balik guard requireSuperAdmin(). Tidak ter-scope tenantId (memang global).
 */

// ── Statistik ────────────────────────────────────────────────────────────
export async function platformStats() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const [tenants, activeTenants, users, superAdmins, planGroups, expiringSoon, promoActive] =
    await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { isActive: true } }),
      db.user.count(),
      db.user.count({ where: { isSuperAdmin: true } }),
      db.license.groupBy({ by: ["plan"], _count: true }),
      db.license.count({ where: { status: "ACTIVE", validUntil: { gte: now, lte: in7 } } }),
      db.promoCode.count({ where: { isActive: true } }),
    ]);
  const plans: Record<string, number> = {};
  for (const g of planGroups) plans[g.plan] = g._count;
  return { tenants, activeTenants, users, superAdmins, plans, expiringSoon, promoActive };
}

// ── Toko / Lisensi ─────────────────────────────────────────────────────────
export function listTenants() {
  return db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      createdAt: true,
      license: {
        select: {
          plan: true,
          status: true,
          maxTransactions: true,
          transactionsUsed: true,
          validUntil: true,
        },
      },
      _count: { select: { users: true } },
    },
  });
}

export async function updateTenantLicense(tenantId: string, input: TenantLicenseInput) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!t) throw new Error("Toko tidak ditemukan.");
  const data = {
    plan: input.plan,
    status: input.status,
    maxTransactions: input.maxTransactions ?? null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
  };
  return db.license.upsert({ where: { tenantId }, update: data, create: { tenantId, ...data } });
}

export async function setTenantActive(tenantId: string, isActive: boolean) {
  return db.tenant.update({ where: { id: tenantId }, data: { isActive } });
}

export async function resetLicenseUsage(tenantId: string) {
  return db.license.update({ where: { tenantId }, data: { transactionsUsed: 0 } });
}

// ── Akses (super-admin) ────────────────────────────────────────────────────
export function listUsersForAccess(search?: string) {
  const s = search?.trim();
  return db.user.findMany({
    where: s
      ? {
          OR: [
            { name: { contains: s, mode: "insensitive" } },
            { email: { contains: s, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "desc" }],
    take: 60,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isSuperAdmin: true,
      tenant: { select: { name: true } },
    },
  });
}

export async function setSuperAdmin(userId: string, value: boolean) {
  return db.user.update({ where: { id: userId }, data: { isSuperAdmin: value } });
}

// ── Kode Promo ─────────────────────────────────────────────────────────────
export function listPromoCodes() {
  return db.promoCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { redemptions: true } } },
  });
}

export async function createPromoCode(userId: string, input: PromoCodeInput) {
  const code = input.code.trim().toUpperCase();
  const existing = await db.promoCode.findUnique({ where: { code }, select: { id: true } });
  if (existing) throw new Error("Kode sudah ada. Pakai kode lain.");
  return db.promoCode.create({
    data: {
      code,
      plan: input.plan,
      durationDays: input.durationDays ?? null,
      maxTransactions: input.maxTransactions ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      note: input.note || null,
      createdById: userId,
    },
  });
}

export async function setPromoActive(id: string, isActive: boolean) {
  return db.promoCode.update({ where: { id }, data: { isActive } });
}

export async function deletePromoCode(id: string) {
  return db.promoCode.delete({ where: { id } });
}
