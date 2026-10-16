import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pointsEarnedFor,
  pointsWorth,
  cashbackPercent,
  maxRedeemablePoints,
  resolveRedemption,
  loyaltyNoteLines,
  redeemHint,
  programStarted,
  earnedPointsTarget,
  saleEligibleRupiah,
  jobEligibleRupiah,
} from "../src/lib/loyalty.ts";

const cfg = { pointValue: 10, minRedeem: 100 };

test("pointsEarnedFor: 1 poin per Rp 1.000 (dibulatkan ke bawah)", () => {
  assert.equal(pointsEarnedFor(3_600_000), 3600);
  assert.equal(pointsEarnedFor(999), 0);
  assert.equal(pointsEarnedFor(-5), 0);
});

test("pointsWorth & cashbackPercent", () => {
  assert.equal(pointsWorth(71_930, cfg), 719_300);
  assert.equal(cashbackPercent(cfg), 1);
  assert.equal(cashbackPercent({ pointValue: 5, minRedeem: 0 }), 0.5);
});

test("maxRedeemablePoints: dibatasi saldo, total bayar, minimal & program aktif", () => {
  assert.equal(maxRedeemablePoints(1_250, 1_000_000, cfg), 1_250);
  assert.equal(maxRedeemablePoints(1_250, 5_000, cfg), 500); // potongan ≤ total
  assert.equal(maxRedeemablePoints(99, 1_000_000, cfg), 0); // di bawah minimal
  assert.equal(maxRedeemablePoints(1_250, 1_000_000, { pointValue: 0, minRedeem: 0 }), 0);
});

test("resolveRedemption: normalisasi & pesan galat", () => {
  assert.deepEqual(resolveRedemption(500, 1_250, 1_000_000, cfg), { points: 500, discount: 5_000 });
  assert.deepEqual(resolveRedemption(1_250, 1_250, 5_000, cfg), { points: 500, discount: 5_000 }); // dipotong ke maks
  assert.deepEqual(resolveRedemption(0, 1_250, 5_000, cfg), { points: 0, discount: 0 });
  assert.match(resolveRedemption(200, 1_250 - 1_200, 1e6, cfg).error ?? "", /mulai 100 poin/);
  assert.match(resolveRedemption(2_000, 1_250, 1e6, cfg).error ?? "", /tidak cukup/);
  assert.match(resolveRedemption(100, 500, 1e6, { pointValue: 0, minRedeem: 0 }).error ?? "", /nonaktif/);
});

test("loyaltyNoteLines: isi nota sesuai kondisi", () => {
  assert.deepEqual(loyaltyNoteLines({ earned: 3_600, redeemed: 500, balance: 4_350 }, cfg), [
    "Poin ditukar: -500",
    "Poin didapat: +3.600",
    "Saldo poin: 4.350 (senilai Rp 43.500)",
    "Tukarkan poin sebagai potongan belanja berikutnya.",
  ]);
  assert.deepEqual(loyaltyNoteLines({ earned: 40, redeemed: 0, balance: 60 }, cfg), [
    "Poin didapat: +40",
    "Saldo poin: 60 (senilai Rp 600)",
    "Kumpulkan 40 poin lagi untuk mulai menukar (min. 100).",
  ]);
  assert.deepEqual(loyaltyNoteLines({ earned: 5, redeemed: 0, balance: null }, cfg), []);
  assert.equal(redeemHint(500, { pointValue: 0, minRedeem: 0 }), null);
});

test("jadwal mulai: sebelum mulai tak bisa tukar & nota berisi pengumuman", () => {
  const pending = { pointValue: 10, minRedeem: 100, startsAt: "2026-10-31T17:00:00.000Z", started: false };
  assert.equal(maxRedeemablePoints(5_000, 1e6, pending), 0);
  assert.match(resolveRedemption(500, 5_000, 1e6, pending).error ?? "", /belum dimulai \(mulai 1 November 2026\)/);
  assert.deepEqual(loyaltyNoteLines({ earned: 0, redeemed: 0, balance: null }, pending), [
    "Program Poin Member mulai 1 November 2026: dapat 1 poin tiap Rp 1.000 belanja.",
  ]);
  assert.equal(redeemHint(5_000, pending), null);
  // Setelah dimulai → perilaku normal.
  assert.equal(maxRedeemablePoints(5_000, 1e6, { ...pending, started: true }), 5_000);
});

test("programStarted: berdasarkan waktu", () => {
  const start = "2026-11-01T00:00:00+07:00";
  assert.equal(programStarted(null), true);
  assert.equal(programStarted(start, Date.parse("2026-10-31T23:59:00+07:00")), false);
  assert.equal(programStarted(start, Date.parse("2026-11-01T00:00:00+07:00")), true);
});

test("earnedPointsTarget: kumulatif sesuai porsi dibayar", () => {
  assert.equal(earnedPointsTarget(8_000_000, 8_000_000, 8_000_000), 8_000);
  assert.equal(earnedPointsTarget(8_000_000, 8_000_000, 2_000_000), 2_000); // DP 25%
  assert.equal(earnedPointsTarget(8_000_000, 8_000_000, 9_000_000), 8_000); // lebih bayar dibatasi
  assert.equal(earnedPointsTarget(0, 1_000_000, 1_000_000), 0);
  // Cicilan 3x tanpa drift: total selisih = target penuh.
  const steps = [333_333, 666_666, 1_000_000].map((p) => earnedPointsTarget(1_000_000, 1_000_000, p));
  assert.deepEqual(steps, [333, 666, 1000]);
});

test("saleEligibleRupiah: titipan dikecualikan", () => {
  assert.equal(saleEligibleRupiah(5_000_000, 3_500_000), 1_500_000);
  assert.equal(saleEligibleRupiah(1_000_000, 2_000_000), 0);
});

test("jobEligibleRupiah: jasa ×2, sparepart ×1, diskon proporsional", () => {
  // Servis: jasa 150rb + SSD 600rb = 300 + 600 = 900 poin
  assert.equal(earnedPointsTarget(jobEligibleRupiah({ labor: 150_000, parts: 600_000, total: 750_000, multiplier: 2 }), 750_000, 750_000), 900);
  // Diskon 75rb (10%) → 810 poin
  assert.equal(earnedPointsTarget(jobEligibleRupiah({ labor: 150_000, parts: 600_000, total: 675_000, multiplier: 2 }), 675_000, 675_000), 810);
  // Rakit PC (×1): sama dengan total
  assert.equal(jobEligibleRupiah({ labor: 200_000, parts: 9_000_000, total: 9_200_000, multiplier: 1 }), 9_200_000);
  assert.equal(jobEligibleRupiah({ labor: 0, parts: 0, total: 0, multiplier: 2 }), 0);
});
