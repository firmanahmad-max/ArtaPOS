import { test } from "node:test";
import assert from "node:assert/strict";
import { simTotals } from "../src/lib/build-sim-calc.ts";

test("simTotals: total jual, modal, margin, dan sisa bujet", () => {
  const items = [
    { qty: 1, costPrice: 800_000, sellPrice: 1_000_000 }, // margin 200rb
    { qty: 2, costPrice: 300_000, sellPrice: 400_000 }, // margin 200rb, jual 800rb
  ];
  const t = simTotals(items, 150_000 /* jasa */, 3_000_000 /* bujet */);
  assert.equal(t.totalSell, 1_800_000);
  assert.equal(t.totalCost, 1_400_000);
  assert.equal(t.fee, 150_000);
  assert.equal(t.grandSell, 1_950_000);
  assert.equal(t.margin, 550_000); // 1.95jt - 1.4jt (jasa 100% margin)
  assert.equal(t.remaining, 1_050_000); // 3jt - 1.95jt
  assert.equal(t.overBudget, false);
});

test("simTotals: bujet 0 → tanpa batas, remaining 0", () => {
  const t = simTotals([{ qty: 1, costPrice: 0, sellPrice: 500_000 }], 0, 0);
  assert.equal(t.remaining, 0);
  assert.equal(t.overBudget, false);
});

test("simTotals: lewat bujet → overBudget true, remaining negatif", () => {
  const t = simTotals([{ qty: 1, costPrice: 400_000, sellPrice: 600_000 }], 0, 500_000);
  assert.equal(t.grandSell, 600_000);
  assert.equal(t.remaining, -100_000);
  assert.equal(t.overBudget, true);
});

test("simTotals: daftar kosong → semua 0", () => {
  const t = simTotals([], 0, 1_000_000);
  assert.equal(t.totalSell, 0);
  assert.equal(t.grandSell, 0);
  assert.equal(t.margin, 0);
  assert.equal(t.marginPct, 0);
  assert.equal(t.remaining, 1_000_000);
});

test("simTotals: nilai negatif/NaN diabaikan (dianggap 0)", () => {
  const t = simTotals(
    [{ qty: -3, costPrice: 100, sellPrice: 100 }, { qty: NaN, costPrice: 1, sellPrice: 1 }],
    -5,
    -10,
  );
  assert.equal(t.totalSell, 0);
  assert.equal(t.grandSell, 0);
  assert.equal(t.remaining, 0); // bujet negatif → dianggap 0/tanpa batas
});

test("simTotals: marginPct dihitung dari grandSell", () => {
  const t = simTotals([{ qty: 1, costPrice: 750_000, sellPrice: 1_000_000 }], 0, 0);
  assert.equal(t.margin, 250_000);
  assert.equal(Math.round(t.marginPct), 25);
});
