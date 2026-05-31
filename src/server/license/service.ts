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
