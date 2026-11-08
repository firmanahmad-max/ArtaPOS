import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWarrantyUrl, isWarrantyToken, periodText, remainingText, warrantyProgress } from "../src/lib/warranty-card.ts";

const DAY = 86_400_000;

test("token & URL", () => {
  assert.ok(isWarrantyToken("AbC_123-xyzAbC_123-xyz"));
  assert.ok(!isWarrantyToken("pendek"));
  assert.ok(!isWarrantyToken("../../etc/passwd/xxxxxxxx"));
  assert.equal(buildWarrantyUrl("https://x.id/", "tok"), "https://x.id/garansi/tok");
});

test("progres masa garansi", () => {
  const sold = new Date("2026-01-01T00:00:00Z");
  const until = new Date(sold.getTime() + 100 * DAY);
  assert.deepEqual(warrantyProgress(sold, until, sold.getTime()), { remainingPct: 100, daysLeft: 100 });
  assert.deepEqual(warrantyProgress(sold, until, sold.getTime() + 25 * DAY), { remainingPct: 75, daysLeft: 75 });
  assert.deepEqual(warrantyProgress(sold, until, until.getTime() + DAY), { remainingPct: 0, daysLeft: 0 });
  assert.equal(warrantyProgress(sold, null, Date.now()), null);
});

test("teks sisa & periode", () => {
  assert.equal(remainingText(0), "Masa garansi habis");
  assert.equal(remainingText(45), "45 hari lagi");
  assert.equal(remainingText(400), "1 tahun 1 bulan lagi");
  assert.equal(remainingText(365), "11 bulan lagi");
  assert.equal(remainingText(731), "2 tahun lagi");
  assert.equal(periodText(0), "Tanpa garansi");
  assert.equal(periodText(12), "1 tahun");
  assert.equal(periodText(36), "3 tahun");
  assert.equal(periodText(6), "6 bulan");
});
