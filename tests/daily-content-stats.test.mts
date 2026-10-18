import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeDailyStats, type StatRow } from "../src/lib/daily-content-stats.ts";
import { builtinByKey, pickDaily, DAILY_CONTENT } from "../src/lib/daily-content.ts";

const row = (p: Partial<StatRow>): StatRow => ({
  day: "2026-10-18",
  contentKey: "builtin:tips:3",
  kind: "TIPS",
  isCustom: false,
  title: "Judul",
  action: "SHARE",
  count: 1,
  ...p,
});

test("summarizeDailyStats: total, hari aktif, jenis, konten teratas", () => {
  const s = summarizeDailyStats(
    [
      row({ count: 2 }),
      row({ action: "DOWNLOAD", count: 1 }),
      row({ day: "2026-10-17", contentKey: "custom:p1", kind: "PROMO", isCustom: true, title: "Promo lama", count: 1 }),
      row({ day: "2026-10-18", contentKey: "custom:p1", kind: "PROMO", isCustom: true, title: "Promo baru", action: "COPY", count: 3 }),
      row({ day: "2026-10-16", contentKey: "builtin:fakta:0", kind: "FAKTA", count: 0 }), // nol diabaikan
    ],
    30,
  );
  assert.deepEqual(s.totals, { SHARE: 3, DOWNLOAD: 1, COPY: 3 });
  assert.equal(s.uses, 7);
  assert.equal(s.activeDays, 2);
  assert.deepEqual(s.byKind, { MOTIVASI: 0, TIPS: 3, FAKTA: 0, GAMING: 0, PROMO: 4 });
  assert.equal(s.custom, 4);
  assert.equal(s.builtin, 3);
  assert.equal(s.top[0].contentKey, "custom:p1");
  assert.equal(s.top[0].title, "Promo baru"); // judul terbaru
  assert.equal(s.top[0].shares, 1);
  assert.equal(s.top[1].shares, 2);
  assert.deepEqual(s.perCustom, { "custom:p1": 4 });
});

test("kunci konten: pickDaily ⇄ builtinByKey", () => {
  const now = new Date("2026-10-18T10:00:00+07:00").getTime();
  const p = pickDaily("tips", now)!;
  assert.match(p.key, /^builtin:tips:\d+$/);
  assert.equal(builtinByKey(p.key)?.item.title, p.item.title);
  assert.equal(builtinByKey("builtin:tips:999"), null);
  assert.equal(builtinByKey("builtin:promo:0"), null);
  assert.equal(builtinByKey("custom:abc"), null);
  assert.equal(builtinByKey(`builtin:fakta:${DAILY_CONTENT.fakta.length - 1}`)?.kind, "fakta");
  const c = pickDaily("promo", now, [{ id: "x1", kind: "promo", title: "T", body: "B", cta: "C" }])!;
  assert.equal(c.key, "custom:x1");
});
