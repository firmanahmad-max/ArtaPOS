import { test } from "node:test";
import assert from "node:assert/strict";
import { localParts, startOfDay, dayKey, formatLocalDate } from "../src/lib/timezone.ts";

// WIB = UTC+7 tetap. Semua perhitungan harus benar terlepas dari TZ server.

test("localParts membaca tanggal menurut WIB", () => {
  // 2026-06-13 19:00Z = 2026-06-14 02:00 WIB
  const p = localParts(new Date("2026-06-13T19:00:00Z"));
  assert.deepEqual(p, { y: 2026, m: 5, d: 14 });
});

test("startOfDay = tengah malam WIB dalam UTC", () => {
  // 00:00 WIB 14 Juni = 13 Juni 17:00Z
  assert.equal(startOfDay(2026, 5, 14).toISOString(), "2026-06-13T17:00:00.000Z");
});

test("dayKey mem-bucket penjualan dini hari ke tanggal WIB yang benar", () => {
  // 01:00 WIB 14 Juni (18:00Z 13 Juni) → 2026-06-14
  assert.equal(dayKey(new Date("2026-06-13T18:00:00Z")), "2026-06-14");
  // 23:30 WIB 13 Juni (16:30Z 13 Juni) → 2026-06-13
  assert.equal(dayKey(new Date("2026-06-13T16:30:00Z")), "2026-06-13");
});

test("startOfDay menormalkan luapan bulan/hari", () => {
  // d+1 dari 30 Juni → 1 Juli
  assert.equal(startOfDay(2026, 5, 31).toISOString(), "2026-06-30T17:00:00.000Z");
  // m+1 dari Desember → Januari tahun depan
  assert.equal(startOfDay(2026, 12, 1).toISOString(), "2026-12-31T17:00:00.000Z");
});

test("formatLocalDate memakai zona laporan, bukan zona server", () => {
  const label = formatLocalDate(startOfDay(2026, 5, 14), { dateStyle: "full" });
  assert.match(label, /14 Juni 2026/);
});
