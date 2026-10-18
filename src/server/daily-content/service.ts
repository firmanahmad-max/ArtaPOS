import "server-only";
import { db } from "@/lib/db";
import type { DailyContentKind } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { builtinByKey, wibDateKey, type CustomDailyItem, type DailyKind } from "@/lib/daily-content";
import { summarizeDailyStats } from "@/lib/daily-content-stats";

/** Konten Harian kustom toko. Semua query ter-scope tenantId. */

const TO_DB: Record<DailyKind, DailyContentKind> = { motivasi: "MOTIVASI", tips: "TIPS", fakta: "FAKTA", gaming: "GAMING", promo: "PROMO" };
const FROM_DB: Record<DailyContentKind, DailyKind> = { MOTIVASI: "motivasi", TIPS: "tips", FAKTA: "fakta", GAMING: "gaming", PROMO: "promo" };

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
  /** PROMO saja: produk inventory yang dipromosikan + harga promo opsional. */
  productId?: string | null;
  promoPrice?: number | null;
}

/** "YYYY-MM-DD" ⇄ kolom DATE (disimpan sebagai tengah malam UTC tanggal itu). */
const toDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : null);
const fromDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const PRODUCT_SELECT = { id: true, name: true, sku: true, sellPrice: true, stock: true, isActive: true } as const;

async function findRows(
  where: Prisma.DailyContentItemWhereInput,
  opts: { take?: number; orderBy?: Prisma.DailyContentItemOrderByWithRelationInput | Prisma.DailyContentItemOrderByWithRelationInput[] } = {},
) {
  return db.dailyContentItem.findMany({
    where,
    include: {
      product: {
        select: {
          ...PRODUCT_SELECT,
          // Foto dari Galeri Publik (bila produk dipajang) untuk gambar promo.
          galleryItems: { where: { isActive: true, photo: { not: null } }, select: { photo: true }, take: 1 },
        },
      },
    },
    ...opts,
  });
}
type Row = Awaited<ReturnType<typeof findRows>>[number];

const toView = (r: Row) => ({
  id: r.id,
  kind: FROM_DB[r.kind],
  title: r.title,
  emphasis: r.emphasis ?? undefined,
  body: r.body,
  steps: (r.kind === "TIPS" || r.kind === "GAMING") && r.steps.length === 3 ? (r.steps as [string, string, string]) : undefined,
  cta: r.cta,
  startsOn: fromDate(r.startsOn),
  endsOn: fromDate(r.endsOn),
  isActive: r.isActive,
  updatedAt: r.updatedAt.toISOString(),
  promoPrice: r.promoPrice,
  product: r.product
    ? {
        id: r.product.id,
        name: r.product.name,
        sku: r.product.sku,
        price: r.product.sellPrice,
        stock: r.product.isActive ? r.product.stock : 0,
        isActive: r.product.isActive,
        photo: r.product.galleryItems[0]?.photo ?? null,
      }
    : null,
});
export type DailyContentView = ReturnType<typeof toView>;

function data(input: DailyContentInput) {
  // Langkah disimpan untuk Tips (wajib) & PC Gaming (opsional: hanya bila lengkap 3).
  const rawSteps = (input.steps ?? []).map((s) => s.trim());
  const keepSteps = input.kind === "tips" || (input.kind === "gaming" && rawSteps.length === 3 && rawSteps.every(Boolean));
  const productId = input.kind === "promo" ? input.productId || null : null;
  return {
    kind: TO_DB[input.kind],
    title: input.title.trim(),
    emphasis: input.emphasis?.trim() || null,
    body: input.body.trim(),
    steps: keepSteps ? rawSteps : [],
    cta: input.cta.trim(),
    startsOn: toDate(input.startsOn),
    endsOn: toDate(input.endsOn),
    productId,
    promoPrice: productId && input.promoPrice && input.promoPrice > 0 ? input.promoPrice : null,
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
  };
}

/** Pastikan produk yang ditautkan milik toko ini (cegah tautan lintas-tenant). */
async function assertProduct(tenantId: string, input: DailyContentInput) {
  if (input.kind !== "promo" || !input.productId) return;
  const p = await db.product.findFirst({ where: { id: input.productId, tenantId }, select: { id: true } });
  if (!p) throw new Error("Produk tidak ditemukan.");
}

export async function listDailyContent(tenantId: string) {
  const rows = await findRows({ tenantId }, { orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }] });
  return rows.map(toView);
}

/**
 * Konten aktif yang belum kedaluwarsa (untuk Dashboard). Promo bertaut produk membawa
 * harga/stok/foto terkini; produk nonaktif dihitung stok 0 → berhenti tampil otomatis
 * (disaring `activeCustom`). Tabel belum ada → [].
 */
export async function listActiveDailyContent(tenantId: string, now: number): Promise<CustomDailyItem[]> {
  try {
    const rows = await findRows(
      { tenantId, isActive: true, OR: [{ endsOn: null }, { endsOn: { gte: toDate(wibDateKey(now))! } }] },
      { orderBy: { createdAt: "asc" }, take: 200 },
    );
    return rows.map((r) => {
      const v = toView(r);
      return {
        id: v.id,
        kind: v.kind,
        title: v.title,
        emphasis: v.emphasis,
        body: v.body,
        steps: v.steps,
        cta: v.cta,
        startsOn: v.startsOn,
        endsOn: v.endsOn,
        product: v.product
          ? { name: v.product.name, price: v.product.price, promoPrice: v.promoPrice, stock: v.product.stock, photo: v.product.photo }
          : undefined,
      };
    });
  } catch {
    return [];
  }
}

/** Cari produk aktif untuk ditautkan ke promo (nama / SKU / barcode). */
export async function searchPromoProducts(tenantId: string, q: string) {
  const term = q.trim();
  const rows = await db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { sku: { contains: term, mode: "insensitive" as const } },
              { barcode: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: 12,
    select: { id: true, name: true, sku: true, sellPrice: true, stock: true },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, sku: r.sku, price: r.sellPrice, stock: r.stock }));
}

export async function createDailyContent(tenantId: string, userId: string, input: DailyContentInput) {
  await assertProduct(tenantId, input);
  const r = await db.dailyContentItem.create({ data: { tenantId, createdById: userId, ...data(input) } });
  return r.id;
}

export async function updateDailyContent(tenantId: string, id: string, input: DailyContentInput) {
  await assertProduct(tenantId, input);
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
