import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeReferralCode,
  isReferralCode,
  normalizeReferralCode,
  buildReferralUrl,
  validateReferralConfig,
  qualifies,
  referralView,
  summarizeReferrals,
  referrerDisplayName,
  DEFAULT_REFERRAL,
} from "../src/lib/referral.ts";

test("kode ajak: awalan nama + 3 acak, alfabet aman, valid", () => {
  const seq = [0, 0.5, 0.99];
  let i = 0;
  const code = makeReferralCode("Dewi Lestari", () => seq[i++ % 3]);
  assert.match(code, /^DEWIL[A-Z2-9]{3}$/);
  assert.ok(isReferralCode(code));
  assert.equal(makeReferralCode("  ", () => 0), "TEMANAAA");
  assert.equal(makeReferralCode("Él-Ñino 99", () => 0).slice(0, 5), "ELNIN");
  assert.ok(!/[01OIL]/.test(makeReferralCode("x", Math.random).slice(1)));
  assert.equal(normalizeReferralCode(" dewi-7k2 "), "DEWI7K2");
  assert.ok(isReferralCode("dewi7k2"));
  assert.ok(!isReferralCode("../etc"));
  assert.ok(!isReferralCode("TOOLONGNAME123"));
  assert.equal(buildReferralUrl("https://x.id/", "max-computer", "DEWI7K2"), "https://x.id/ajak/max-computer/DEWI7K2");
});

test("validasi pengaturan & syarat transaksi", () => {
  assert.equal(validateReferralConfig({ ...DEFAULT_REFERRAL, enabled: true }), null);
  assert.ok(validateReferralConfig({ ...DEFAULT_REFERRAL, enabled: true, referrerPoints: 0, friendPoints: 0 }));
  assert.ok(validateReferralConfig({ ...DEFAULT_REFERRAL, validDays: 3 }));
  assert.ok(validateReferralConfig({ ...DEFAULT_REFERRAL, referrerPoints: -1 }));
  assert.ok(qualifies(150_000, { minPurchase: 100_000 }));
  assert.ok(qualifies(100_000, { minPurchase: 100_000 }));
  assert.ok(!qualifies(99_000, { minPurchase: 100_000 }));
  assert.ok(!qualifies(0, { minPurchase: 0 }));
});

test("status & ringkasan", () => {
  const now = new Date("2026-10-30T10:00:00Z").getTime();
  const future = "2026-12-01T00:00:00Z";
  const past = "2026-10-01T00:00:00Z";
  assert.equal(referralView({ status: "PENDING", expiresAt: future }, now), "pending");
  assert.equal(referralView({ status: "PENDING", expiresAt: past }, now), "expired");
  assert.equal(referralView({ status: "REWARDED", expiresAt: past }, now), "rewarded");
  const s = summarizeReferrals(
    [
      { status: "REWARDED", expiresAt: past, referrerPoints: 200, friendPoints: 100, qualifyingTotal: 350_000 },
      { status: "REWARDED", expiresAt: future, referrerPoints: 200, friendPoints: 100, qualifyingTotal: 1_200_000 },
      { status: "PENDING", expiresAt: future, referrerPoints: 0, friendPoints: 0, qualifyingTotal: null },
      { status: "PENDING", expiresAt: past, referrerPoints: 0, friendPoints: 0, qualifyingTotal: null },
      { status: "CANCELLED", expiresAt: future, referrerPoints: 0, friendPoints: 0, qualifyingTotal: null },
    ],
    now,
  );
  assert.deepEqual(s, { joined: 4, rewarded: 2, pending: 1, expired: 1, conversion: 50, pointsGiven: 600, revenue: 1_550_000 });
  assert.equal(referrerDisplayName("dewi lestari"), "Dewi L.");
  assert.equal(referrerDisplayName(""), "Teman Anda");
});
