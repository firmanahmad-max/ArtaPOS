import "server-only";
import { db } from "@/lib/db";
import type { DailyContentKind } from "@/generated/prisma/enums";
import { wibDateKey, type CustomDailyItem, type DailyKind } from "@/lib/daily-content";

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
