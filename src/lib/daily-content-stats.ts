/**
 * Ringkasan statistik Konten Harian (murni, unit-tested): seberapa sering konten
 * dibagikan / diunduh / disalin, jenis mana yang paling dipakai, dan konten teratas.
 */

export type StatAction = "SHARE" | "DOWNLOAD" | "COPY";
export type StatKind = "MOTIVASI" | "TIPS" | "FAKTA" | "PROMO";

export interface StatRow {
  day: string; // YYYY-MM-DD (WIB)
  contentKey: string;
  kind: StatKind;
  isCustom: boolean;
  title: string;
  action: StatAction;
  count: number;
}

export interface DailyStatsSummary {
  days: number;
  totals: Record<StatAction, number>;
  /** Total semua tindakan. */
  uses: number;
  /** Hari (dari `days`) yang ada minimal satu tindakan. */
  activeDays: number;
  byKind: Record<StatKind, number>;
  custom: number;
  builtin: number;
  top: { contentKey: string; title: string; kind: StatKind; isCustom: boolean; uses: number; shares: number; lastDay: string }[];
  /** Total tindakan per konten toko ("custom:<id>" → jumlah). */
  perCustom: Record<string, number>;
}

export function summarizeDailyStats(rows: StatRow[], days: number): DailyStatsSummary {
  const totals: Record<StatAction, number> = { SHARE: 0, DOWNLOAD: 0, COPY: 0 };
  const byKind: Record<StatKind, number> = { MOTIVASI: 0, TIPS: 0, FAKTA: 0, PROMO: 0 };
  const dayset = new Set<string>();
  const items = new Map<string, DailyStatsSummary["top"][number]>();
  let custom = 0;
  let builtin = 0;
  for (const r of rows) {
    if (r.count <= 0) continue;
    totals[r.action] += r.count;
    byKind[r.kind] += r.count;
    dayset.add(r.day);
    if (r.isCustom) custom += r.count;
    else builtin += r.count;
    const cur = items.get(r.contentKey) ?? {
      contentKey: r.contentKey,
      title: r.title,
      kind: r.kind,
      isCustom: r.isCustom,
      uses: 0,
      shares: 0,
      lastDay: r.day,
    };
    cur.uses += r.count;
    if (r.action === "SHARE") cur.shares += r.count;
    if (r.day >= cur.lastDay) {
      cur.lastDay = r.day;
      cur.title = r.title; // judul terbaru
    }
    items.set(r.contentKey, cur);
  }
  const all = [...items.values()];
  const perCustom: Record<string, number> = {};
  for (const it of all) if (it.isCustom) perCustom[it.contentKey] = it.uses;
  return {
    days,
    totals,
    uses: totals.SHARE + totals.DOWNLOAD + totals.COPY,
    activeDays: dayset.size,
    byKind,
    custom,
    builtin,
    top: all.sort((a, b) => b.uses - a.uses || b.lastDay.localeCompare(a.lastDay)).slice(0, 5),
    perCustom,
  };
}
