import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_CONTENT,
  dailyItem,
  dailyKind,
  dailyShareText,
  splitEmphasis,
  wibDayNumber,
  pickDaily,
  activeCustom,
  dailyKinds,
  validateDailyItem,
} from "../src/lib/daily-content.ts";

const at = (iso: string) => new Date(`${iso}+07:00`).getTime();

test("pustaka konten: 30 per jenis, emphasis ada di judul, tips 3 langkah", () => {
  for (const [kind, list] of Object.entries(DAILY_CONTENT)) {
    assert.equal(list.length, 30, kind);
    for (const it of list) {
      if (it.emphasis) assert.ok(it.title.includes(it.emphasis), `${kind}: "${it.emphasis}" tak ada di "${it.title}"`);
      assert.ok(it.title.length <= 70, `${kind}: judul terlalu panjang: ${it.title}`);
      assert.ok(it.cta.length > 0);
    }
  }
  assert.ok(DAILY_CONTENT.tips.every((t) => t.steps?.length === 3));
  for (const f of DAILY_CONTENT.fakta.filter((x) => x.compare)) {
    assert.ok(f.compare!.b.pct <= 100 && f.compare!.a.pct >= 0);
  }
});

test("berganti tepat pukul 00:00 WIB & bergilir jenis", () => {
  const a = at("2026-10-18T23:59:00");
  const b = at("2026-10-19T00:00:00");
  assert.equal(wibDayNumber(b) - wibDayNumber(a), 1);
  assert.notEqual(dailyKind(a), dailyKind(b));
  assert.notEqual(dailyItem("motivasi", a).title, dailyItem("motivasi", b).title);
  // Dalam satu hari WIB konten tetap sama.
  assert.equal(dailyItem("tips", at("2026-10-18T00:01:00")).title, dailyItem("tips", a).title);
});

test("splitEmphasis & teks bagikan", () => {
  assert.deepEqual(splitEmphasis("Laptop cepat panas?", "panas?"), ["Laptop cepat ", "panas?", ""]);
  assert.deepEqual(splitEmphasis("Tanpa aksen"), ["Tanpa aksen", "", ""]);
  assert.deepEqual(splitEmphasis("Judul", "tidak ada"), ["Judul", "", ""]);
  const tip = DAILY_CONTENT.tips[0];
  const txt = dailyShareText("tips", tip, "Max Computer", "0812-0000-0000");
  assert.match(txt, /TIPS TEKNOLOGI/);
  assert.match(txt, /1\. Bersihkan kipas/);
  assert.match(txt, /Max Computer/);
  assert.match(txt, /Chat WA: 0812-0000-0000/);
});

test("konten kustom: periode, giliran genap/ganjil, promo", () => {
  const base = { body: "Isi konten toko yang cukup panjang.", cta: "Chat kami" };
  const custom = [
    { id: "m1", kind: "motivasi" as const, title: "Motivasi toko", ...base },
    { id: "p1", kind: "promo" as const, title: "Diskon SSD 10%", ...base, startsOn: "2026-10-18", endsOn: "2026-10-20" },
  ];
  const d18 = at("2026-10-18T10:00:00"); // hari ke-n (genap/ganjil diuji relatif)
  const even = wibDayNumber(d18) % 2 === 0 ? d18 : at("2026-10-19T10:00:00");
  const odd = even + 86_400_000;
  assert.equal(pickDaily("motivasi", even, custom)?.customId, "m1");
  assert.equal(pickDaily("motivasi", odd, custom)?.customId, null);
  // Jenis tanpa konten toko → selalu bawaan.
  assert.equal(pickDaily("tips", even, custom)?.customId, null);
  // Promo hanya dari toko & hanya dalam periode.
  assert.equal(pickDaily("promo", at("2026-10-19T10:00:00"), custom)?.customId, "p1");
  assert.equal(pickDaily("promo", at("2026-10-21T10:00:00"), custom), null);
  assert.equal(activeCustom(custom, at("2026-10-17T23:59:00")).length, 1);
  assert.equal(activeCustom(custom, at("2026-10-20T23:59:00")).length, 2); // akhir periode inklusif
  // Rotasi 4 jenis saat ada promo aktif.
  const seen = new Set(Array.from({ length: 4 }, (_, i) => dailyKind(d18 + i * 86_400_000, true)));
  assert.deepEqual([...seen].sort(), ["fakta", "motivasi", "promo", "tips"]);
  assert.deepEqual(dailyKinds(true)[0], "promo");
  assert.equal(dailyKinds(false).includes("promo"), false);
});

test("validateDailyItem", () => {
  const ok = { kind: "motivasi" as const, title: "Judul bagus", body: "Isi yang cukup panjang.", cta: "Chat kami" };
  assert.deepEqual(validateDailyItem(ok), {});
  assert.ok(validateDailyItem({ ...ok, emphasis: "tidak ada" }).emphasis);
  assert.ok(validateDailyItem({ ...ok, title: "x".repeat(71) }).title);
  assert.ok(validateDailyItem({ ...ok, kind: "tips", steps: ["a", "", "c"] }).steps);
  assert.deepEqual(validateDailyItem({ ...ok, kind: "tips", steps: ["a", "b", "c"] }), {});
  assert.ok(validateDailyItem({ ...ok, startsOn: "2026-10-20", endsOn: "2026-10-19" }).endsOn);
});
