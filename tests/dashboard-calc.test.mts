import { test } from "node:test";
import assert from "node:assert/strict";
import {
  greeting,
  dayRanges,
  monthToDateRanges,
  pctChange,
  grossProfit,
  revenueSplit,
  totalRevenue,
  ageDays,
  rupiahShort,
} from "../src/lib/dashboard-calc.ts";

const at = (iso: string) => new Date(`${iso}+07:00`).getTime();

test("greeting mengikuti jam WIB", () => {
  assert.equal(greeting(at("2026-10-18T06:00:00")), "Selamat pagi");
  assert.equal(greeting(at("2026-10-18T12:30:00")), "Selamat siang");
  assert.equal(greeting(at("2026-10-18T16:00:00")), "Selamat sore");
  assert.equal(greeting(at("2026-10-18T21:00:00")), "Selamat malam");
  assert.equal(greeting(at("2026-10-18T02:00:00")), "Selamat malam");
});

test("dayRanges: hari ini & kemarin WIB", () => {
  const r = dayRanges(at("2026-10-18T00:30:00"));
  assert.equal(r.today.from.toISOString(), "2026-10-17T17:00:00.000Z");
  assert.equal(r.yesterday.from.toISOString(), "2026-10-16T17:00:00.000Z");
});

test("monthToDateRanges: setara bulan lalu, dijepit akhir bulan", () => {
  const r = monthToDateRanges(at("2026-10-18T10:00:00"));
  assert.equal(r.cur.from.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(r.prev.from.toISOString(), "2026-08-31T17:00:00.000Z");
  assert.equal(r.prev.to.toISOString(), "2026-09-18T03:00:00.000Z");
  assert.equal(r.label, "1–18 Okt");
  assert.equal(r.prevLabel, "1–18 Sep");
  assert.equal(r.monthLabel, "Oktober 2026");
  // 31 Maret vs Februari (28 hari) → dijepit ke akhir Februari.
  const m = monthToDateRanges(at("2027-03-31T20:00:00"));
  assert.equal(m.prev.to.toISOString(), "2027-02-28T17:00:00.000Z");
  assert.equal(m.prevLabel, "1–28 Feb");
  // Januari → pembanding Desember tahun lalu.
  assert.equal(monthToDateRanges(at("2027-01-05T09:00:00")).prevLabel, "1–5 Des");
});

test("pctChange, laba kotor & porsi pendapatan", () => {
  assert.equal(pctChange(118, 100), 18);
  assert.equal(pctChange(50, 0), null);
  assert.equal(pctChange(50, null), null);
  const r = { salesRevenue: 600, salesGrossProfit: 100, serviceRevenue: 300, serviceCogs: 50, buildRevenue: 100, buildCogs: 80 };
  assert.equal(totalRevenue(r), 1000);
  assert.equal(grossProfit(r), 100 + 250 + 20);
  assert.deepEqual(revenueSplit(r), { sales: 60, service: 30, build: 10 });
  assert.deepEqual(revenueSplit({ ...r, salesRevenue: 0, serviceRevenue: 0, buildRevenue: 0 }), { sales: 0, service: 0, build: 0 });
});

test("ageDays & rupiahShort", () => {
  assert.equal(ageDays(new Date(at("2026-10-14T10:00:00")), at("2026-10-18T09:00:00")), 3);
  assert.match(rupiahShort(41_200_000), /^Rp 41,2 jt$/);
  assert.match(rupiahShort(958_700), /^Rp 959 rb$/);
  assert.match(rupiahShort(500), /^Rp 500$/);
  assert.match(rupiahShort(-2_500_000), /^−Rp 2,5 jt$/);
});
