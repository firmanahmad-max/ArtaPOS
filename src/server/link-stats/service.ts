import "server-only";
import { db } from "@/lib/db";
import { localParts } from "@/lib/timezone";
import { summarizeLinkVisits, type LinkVisitKind, type LinkVisitSummary } from "@/lib/track-link";
import type { PortalVisitKind } from "@/lib/portal";

/** Tanggal WIB hari ini sebagai nilai kolom DATE (tengah malam UTC tanggal itu). */
function todayDate(now: Date = new Date()): Date {
  const { y, m, d } = localParts(now);
  return new Date(Date.UTC(y, m, d));
}

/**
 * Catat satu kunjungan dari tautan yang dibagikan toko (dipanggil endpoint publik).
 * Toko ditentukan dari slug (hanya toko aktif). Best-effort: slug tak dikenal → diam.
 */
export async function recordLinkVisit(slug: string, kind: LinkVisitKind): Promise<void> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return;
  const tenant = await db.tenant.findFirst({ where: { slug, isActive: true }, select: { id: true } });
  if (!tenant) return;
  await incrementVisitStat(tenant.id, kind);
}

/** +1 penghitung harian (tanggal WIB) untuk toko & jenis kunjungan. */
export async function incrementVisitStat(tenantId: string, kind: LinkVisitKind | PortalVisitKind): Promise<void> {
  const key = { tenantId, day: todayDate(), kind };
  try {
    await db.linkVisitStat.upsert({
      where: { tenantId_day_kind: key },
      create: { ...key, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch {
    // Dua kunjungan pertama bersamaan → salah satu create bentrok unik (P2002); ulang sebagai increment.
    await db.linkVisitStat.updateMany({ where: key, data: { count: { increment: 1 } } });
  }
}

/** Awal periode `days` hari terakhir (termasuk hari ini) sebagai nilai kolom DATE. */
export function periodStartDate(days: number): Date {
  const { y, m, d } = localParts();
  return new Date(Date.UTC(y, m, d - (days - 1)));
}

/** Ringkasan kunjungan dari tautan selama `days` hari terakhir (termasuk hari ini). */
export async function getLinkVisitSummary(tenantId: string, days = 30): Promise<LinkVisitSummary | null> {
  try {
    const from = periodStartDate(days);
    const rows = await db.linkVisitStat.findMany({
      where: { tenantId, day: { gte: from } },
      select: { kind: true, count: true },
    });
    return summarizeLinkVisits(rows);
  } catch {
    // Tabel belum ada (migrasi produksi belum jalan) → sembunyikan kartu, jangan gagalkan halaman.
    return null;
  }
}
