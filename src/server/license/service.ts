import "server-only";
import { db } from "@/lib/db";
import type { LicensePlan, LicenseStatus } from "@/generated/prisma/enums";

/** Service Lisensi/Demo — enforcement & manajemen. Ter-scope tenantId. */

export function getLicense(tenantId: string) {
  return db.license.findUnique({ where: { tenantId } });
}

export interface LicenseCheck {
  allowed: boolean;
  reason?: string;
}

/** Cek apakah tenant boleh membuat transaksi baru. */
export async function checkLicense(tenantId: string): Promise<LicenseCheck> {
  const lic = await db.license.findUnique({ where: { tenantId } });
  if (!lic) return { allowed: true }; // tanpa lisensi = tidak dibatasi
  if (lic.status === "SUSPENDED") return { allowed: false, reason: "Lisensi ditangguhkan. Hubungi admin." };
  if (lic.plan === "UNLIMITED") return { allowed: true };

  if (lic.validUntil && lic.validUntil.getTime() < Date.now()) {
    return { allowed: false, reason: "Masa demo/lisensi sudah berakhir. Silakan upgrade." };
  }
  if (lic.plan === "DEMO_TRANSACTIONS" && lic.maxTransactions != null && lic.transactionsUsed >= lic.maxTransactions) {
    return { allowed: false, reason: `Batas transaksi demo (${lic.maxTransactions}) tercapai. Silakan upgrade.` };
  }
  return { allowed: true };
}

export interface UpdateLicenseInput {
  plan: LicensePlan;
  status: LicenseStatus;
  maxTransactions?: number | null;
  validUntil?: string | null;
}

/** Tukar kode promo/aktivasi → terapkan paket lisensi ke toko (transaksional). */
export async function redeemPromoCode(tenantId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error("Masukkan kode aktivasi.");
  return db.$transaction(async (tx) => {
    const promo = await tx.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw new Error("Kode tidak valid atau sudah nonaktif.");
    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) throw new Error("Kode sudah kedaluwarsa.");
    if (promo.maxRedemptions != null && promo.redemptionsUsed >= promo.maxRedemptions) {
      throw new Error("Kuota penukaran kode ini sudah habis.");
    }
    const already = await tx.promoRedemption.findUnique({
      where: { promoCodeId_tenantId: { promoCodeId: promo.id, tenantId } },
    });
    if (already) throw new Error("Kode ini sudah pernah Anda gunakan.");

    // Masa berlaku baru: perpanjang dari max(sekarang, validUntil lama yg masih aktif).
    let validUntil: Date | null = null;
    if (promo.durationDays != null) {
      const existing = await tx.license.findUnique({ where: { tenantId }, select: { validUntil: true } });
      const base =
        existing?.validUntil && existing.validUntil.getTime() > Date.now() ? existing.validUntil : new Date();
      validUntil = new Date(base.getTime() + promo.durationDays * 86400000);
    }
    const data = {
      plan: promo.plan,
      status: "ACTIVE" as const,
      maxTransactions: promo.maxTransactions ?? null,
      transactionsUsed: 0,
      validUntil,
    };
    await tx.license.upsert({ where: { tenantId }, update: data, create: { tenantId, ...data } });
    await tx.promoRedemption.create({ data: { promoCodeId: promo.id, tenantId } });
    await tx.promoCode.update({ where: { id: promo.id }, data: { redemptionsUsed: { increment: 1 } } });
    return { plan: promo.plan, validUntil };
  });
}

export async function updateLicense(tenantId: string, input: UpdateLicenseInput) {
  return db.license.upsert({
    where: { tenantId },
    update: {
      plan: input.plan,
      status: input.status,
      maxTransactions: input.maxTransactions ?? null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
    },
    create: {
      tenantId,
      plan: input.plan,
      status: input.status,
      maxTransactions: input.maxTransactions ?? null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
    },
  });
}
