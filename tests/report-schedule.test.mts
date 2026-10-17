import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailySlot,
  weeklySlot,
  monthlySlot,
  dueReportSlots,
  slotFor,
  deltaText,
  buildScheduledReportText,
} from "../src/lib/report-schedule.ts";

// Instant dari waktu lokal WIB.
const at = (iso: string) => new Date(`${iso}+07:00`).getTime();

test("dailySlot: sebelum jam laporan → kemarin, sesudahnya → hari ini", () => {
  const before = dailySlot(at("2026-10-17T20:59:00"), 21);
  assert.equal(before.periodKey, "2026-10-16");
  const after = dailySlot(at("2026-10-17T21:00:00"), 21);
  assert.equal(after.periodKey, "2026-10-17");
  assert.equal(after.from.toISOString(), "2026-10-16T17:00:00.000Z");
  assert.equal(after.to.toISOString(), "2026-10-17T17:00:00.000Z");
  // Lewat tengah malam (00:30 WIB) masih laporan kemarin.
  assert.equal(dailySlot(at("2026-10-18T00:30:00"), 21).periodKey, "2026-10-17");
});

test("weeklySlot: minggu Senin–Minggu lengkap terakhir, siap Senin 07:00", () => {
  // Sabtu 17 Okt 2026 → minggu lalu 5–11 Okt.
  const sat = weeklySlot(at("2026-10-17T12:00:00"));
  assert.equal(sat.periodKey, "2026-10-05");
  assert.equal(sat.to.toISOString(), "2026-10-11T17:00:00.000Z");
  assert.equal(sat.prev?.from.toISOString(), "2026-09-27T17:00:00.000Z");
  // Senin 19 Okt 06:59 → masih 5–11 Okt; 07:00 → 12–18 Okt.
  assert.equal(weeklySlot(at("2026-10-19T06:59:00")).periodKey, "2026-10-05");
  assert.equal(weeklySlot(at("2026-10-19T07:00:00")).periodKey, "2026-10-12");
  // Minggu 18 Okt malam → masih 5–11 Okt (minggu berjalan belum lengkap).
  assert.equal(weeklySlot(at("2026-10-18T23:00:00")).periodKey, "2026-10-05");
});

test("monthlySlot: bulan lengkap terakhir, siap tgl 1 07:00, lintas tahun", () => {
  assert.equal(monthlySlot(at("2026-10-17T12:00:00")).periodKey, "2026-09");
  assert.equal(monthlySlot(at("2026-11-01T06:00:00")).periodKey, "2026-09");
  const nov = monthlySlot(at("2026-11-01T07:00:00"));
  assert.equal(nov.periodKey, "2026-10");
  assert.equal(nov.from.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(nov.to.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.equal(nov.label, "Oktober 2026");
  const jan = monthlySlot(at("2027-01-05T09:00:00"));
  assert.equal(jan.periodKey, "2026-12");
  assert.equal(jan.prev?.label, "November 2026");
});

test("dueReportSlots mengikuti pengaturan; slotFor menolak periode palsu", () => {
  const now = at("2026-10-17T22:00:00");
  const cfg = { daily: true, weekly: false, monthly: true, dailyHour: 21 };
  assert.deepEqual(dueReportSlots(now, cfg).map((s) => s.kind), ["DAILY", "MONTHLY"]);
  assert.ok(slotFor("DAILY", "2026-10-17", now, cfg));
  assert.equal(slotFor("DAILY", "2026-10-10", now, cfg), null);
  assert.ok(slotFor("WEEKLY", "2026-10-05", now, cfg)); // jenis nonaktif tetap bisa divalidasi
});

test("deltaText & teks laporan", () => {
  assert.equal(deltaText(120, 100), " (▲ 20%)");
  assert.equal(deltaText(90, 100), " (▼ 10%)");
  assert.equal(deltaText(50, 0), " (baru)");
  assert.equal(deltaText(50, undefined), "");
  const f = {
    salesRevenue: 1_000_000, salesGrossProfit: 200_000, salesCount: 4, serviceRevenue: 300_000, serviceCount: 2,
    buildRevenue: 0, buildCount: 0, purchaseTotal: 500_000, expenseTotal: 50_000, estimatedNet: 350_000,
  };
  const txt = buildScheduledReportText({
    kind: "WEEKLY", storeName: "Max Computer", periodLabel: "5 Okt – 11 Okt 2026",
    cur: f, prev: { ...f, salesRevenue: 800_000, estimatedNet: 400_000 }, prevLabel: "28 Sep – 4 Okt 2026",
    top: [{ name: "SSD 1TB", qty: 3 }],
    ops: { activeService: 3, readyService: 1, outOfStock: 0, overdueCount: 1, overdueAmount: 250_000 },
  });
  assert.match(txt, /Laporan Mingguan/);
  assert.match(txt, /Penjualan: Rp\s1\.000\.000 · 4 transaksi \(▲ 25%\)/);
  assert.match(txt, /Estimasi laba bersih: Rp\s350\.000\*? ?\(▼ 13%\)/);
  assert.match(txt, /1\. SSD 1TB \(3×\)/);
  assert.match(txt, /Piutang lewat tempo: 1/);
  assert.doesNotMatch(txt, /Stok habis/);
  assert.doesNotMatch(txt, /Rakit PC/);
});
