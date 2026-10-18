import "server-only";
import { db } from "@/lib/db";
import type { DailyContentKind } from "@/generated/prisma/enums";
import { builtinByKey, wibDateKey, type CustomDailyItem, type DailyKind } from "@/lib/daily-content";
import { summarizeDailyStats } from "@/lib/daily-content-stats";

/** Konten Harian kustom toko. Semua query ter-scope tenantId. */

const TO_DB: Record<DailyKind, DailyContentKind> = { motivasi: "MOTIVASI", tips: "TIPS", fakta: "FAKTA", promo: "PROMO" };
const FROM_DB: Record<DailyContentKind, DailyKind> = { MOTIVASI: "motivasi", TIPS: "tips", FAKTA: "fakta", PROMO: "promo" };

export interface DailyContentInput {
  kind: DailyKind;
  title: string;
  emphasis?: string | null;
  body: string;
  steps?: string[];
  cta: string;
  startsOn?: string | null;
  endsOn?: string | null;
  isActive?: boolean;
}

/** "YYYY-MM-DD" ⇄ kolom DATE (disimpan sebagai tengah malam UTC tanggal itu). */
const toDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : null);
const fromDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

type Row = Awaited<ReturnType<typeof db.dailyContentItem.findMany>>[number];
const toView = (r: Row) => ({
  id: r.id,
  kind: FROM_DB[r.kind],
  title: r.title,
  emphasis: r.emphasis ?? undefined,
  body: r.body,
  steps: r.kind === "TIPS" && r.steps.length === 3 ? (r.steps as [string, string, string]) : undefined,
  cta: r.cta,
  startsOn: fromDate(r.startsOn),
  endsOn: fromDate(r.endsOn),
  isActive: r.isActive,
  updatedAt: r.updatedAt.toISOString(),
});
export type DailyContentView = ReturnType<typeof toView>;

function data(input: DailyContentInput) {
  const isTips = input.kind === "tips";
  return {
    kind: TO_DB[input.kind],
    title: input.title.trim(),
    emphasis: input.emphasis?.trim() || null,
    body: input.body.trim(),
    steps: isTips ? (input.steps ?? []).map((s) => s.trim()) : [],
    cta: input.cta.trim(),
    startsOn: toDate(input.startsOn),
    endsOn: toDate(input.endsOn),
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  };
}

export async function listDailyContent(tenantId: string) {
  const rows = await db.dailyContentItem.findMany({ where: { tenantId }, orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }] });
  return rows.map(toView);
}

/** Konten aktif yang belum kedaluwarsa (untuk Dashboard). Tabel belum ada → []. */
export async function listActiveDailyContent(tenantId: string, now: number): Promise<CustomDailyItem[]> {
  try {
    const rows = await db.dailyContentItem.findMany({
      where: { tenantId, isActive: true, OR: [{ endsOn: null }, { endsOn: { gte: toDate(wibDateKey(now))! } }] },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return rows.map((r) => {
      const v = toView(r);
      return { id: v.id, kind: v.kind, title: v.title, emphasis: v.emphasis, body: v.body, steps: v.steps, cta: v.cta, startsOn: v.startsOn, endsOn: v.endsOn };
    });
  } catch {
    return [];
  }
}

export async function createDailyContent(tenantId: string, userId: string, input: DailyContentInput) {
  const r = await db.dailyContentItem.create({ data: { tenantId, createdById: userId, ...data(input) } });
  return toView(r);
}

export async function updateDailyContent(tenantId: string, id: string, input: DailyContentInput) {
  const r = await db.dailyContentItem.updateMany({ where: { id, tenantId }, data: data(input) });
  if (r.count === 0) throw new Error("Konten tidak ditemukan.");
}

export async function setDailyContentActive(tenantId: string, id: string, isActive: boolean) {
  const r = await db.dailyContentItem.updateMany({ where: { id, tenantId }, data: { isActive } });
  if (r.count === 0) throw new Error("Konten tidak ditemukan.");
}

export async function deleteDailyContent(tenantId: string, id: string) {
  const r = await db.dailyContentItem.deleteMany({ where: { id, tenantId } });
  if (r.count === 0) throw new Error("Konten tidak ditemukan.");
}

// ── Statistik pemakaian ─────────────────────────────────────────────────────

export type DailyContentActionKind = "SHARE" | "DOWNLOAD" | "COPY";

/**
 * Catat satu tindakan atas konten (bagikan/unduh/salin). Kunci divalidasi di server:
 * konten toko harus milik tenant ini, konten bawaan harus ada di pustaka — judul &
 * jenis diambil dari sumbernya, bukan dari klien. Kunci tak dikenal → diam.
 */
export async function recordDailyContentUse(tenantId: string, contentKey: string, action: DailyContentActionKind, now: number) {
  let kind: DailyContentKind;
  let title: string;
  let isCustom: boolean;
  if (contentKey.startsWith("custom:")) {
    const item = await db.dailyContentItem.findFirst({
      where: { id: contentKey.slice(7), tenantId },
      select: { kind: true, title: true },
    });
    if (!item) return;
    ({ kind, title } = item);
    isCustom = true;
  } else {
    const b = builtinByKey(contentKey);
    if (!b) return;
    kind = TO_DB[b.kind];
    title = b.item.title;
    isCustom = false;
  }
  const key = { tenantId, day: toDate(wibDateKey(now))!, contentKey, action };
  try {
    await db.dailyContentStat.upsert({
      where: { tenantId_day_contentKey_action: key },
      create: { ...key, kind, isCustom, title, count: 1 },
      update: { count: { increment: 1 }, title },
    });
  } catch {
    // Dua catatan pertama bersamaan → salah satu create bentrok unik; ulang sebagai increment.
    await db.dailyContentStat.updateMany({ where: key, data: { count: { increment: 1 } } });
  }
}

/** Ringkasan `days` hari terakhir (termasuk hari ini). null bila tabel belum ada. */
export async function getDailyContentStats(tenantId: string, now: number, days = 30) {
  try {
    const from = toDate(wibDateKey(now - (days - 1) * 86_400_000))!;
    const rows = await db.dailyContentStat.findMany({
      where: { tenantId, day: { gte: from } },
      select: { day: true, contentKey: true, kind: true, isCustom: true, title: true, action: true, count: true },
    });
    return summarizeDailyStats(
      rows.map((r) => ({ ...r, day: fromDate(r.day)! })),
      days,
    );
  } catch {
    return null;
  }
}

/** Jumlah dibagikan + diunduh dalam `days` hari terakhir (baris kecil di kartu Dashboard). */
export async function countDailyContentShares(tenantId: string, now: number, days = 7) {
  try {
    const from = toDate(wibDateKey(now - (days - 1) * 86_400_000))!;
    const agg = await db.dailyContentStat.aggregate({
      where: { tenantId, day: { gte: from }, action: { in: ["SHARE", "DOWNLOAD"] } },
      _sum: { count: true },
    });
    return agg._sum.count ?? 0;
  } catch {
    return 0;
  }
}
