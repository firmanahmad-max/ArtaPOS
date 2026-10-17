import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_CONTENT,
  dailyItem,
  dailyKind,
  dailyShareText,
  splitEmphasis,
  wibDayNumber,
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
