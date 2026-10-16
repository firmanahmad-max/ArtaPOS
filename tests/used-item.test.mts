import { test } from "node:test";
import assert from "node:assert/strict";
import {
  usedMargin,
  usedSaleName,
  summarizeUsedItems,
  warrantyText,
  gradeText,
  daysInStock,
} from "../src/lib/used-item.ts";

test("usedMargin: margin & persen thd harga jual", () => {
  assert.deepEqual(usedMargin(3_000_000, 3_600_000), { margin: 600_000, pct: 17 });
  assert.deepEqual(usedMargin(500_000, 400_000), { margin: -100_000, pct: -25 });
  assert.deepEqual(usedMargin(0, 0), { margin: 0, pct: null });
});

test("usedSaleName: menandai bekas, grade & garansi", () => {
  assert.equal(
    usedSaleName({ category: "Laptop", name: "Asus X441", grade: "GOOD", warrantyDays: 30 }),
    "Laptop Asus X441 (Bekas, Grade B, garansi 1 bulan)",
  );
  assert.equal(
    usedSaleName({ category: "VGA", name: "RTX 3060", grade: "POOR", warrantyDays: 0 }),
    "VGA RTX 3060 (Bekas, Grade D)",
  );
  assert.equal(
    usedSaleName({ category: "RAM", name: "8GB", grade: "LIKE_NEW", warrantyDays: 7 }),
    "RAM 8GB (Bekas, Grade A, garansi 7 hari)",
  );
});

test("warrantyText & gradeText", () => {
  assert.equal(warrantyText(0), "Tanpa garansi");
  assert.equal(warrantyText(90), "Garansi toko 3 bulan");
  assert.equal(warrantyText(14), "Garansi toko 14 hari");
  assert.equal(gradeText("FAIR"), "Grade C · Cukup");
});

test("summarizeUsedItems: persediaan, potensi & laba terealisasi", () => {
  const s = summarizeUsedItems([
    { status: "AVAILABLE", costPrice: 1_000_000, sellPrice: 1_300_000, soldPrice: null },
    { status: "AVAILABLE", costPrice: 500_000, sellPrice: 650_000, soldPrice: null },
    { status: "SOLD", costPrice: 2_000_000, sellPrice: 2_500_000, soldPrice: 2_400_000 }, // diskon 100rb
    { status: "WITHDRAWN", costPrice: 300_000, sellPrice: 400_000, soldPrice: null },
  ]);
  assert.deepEqual(s, {
    available: 2,
    stockCost: 1_500_000,
    stockValue: 1_950_000,
    potentialProfit: 450_000,
    sold: 1,
    realizedProfit: 400_000,
    withdrawn: 1,
  });
});

test("daysInStock: dibulatkan ke bawah, tak negatif", () => {
  const now = Date.UTC(2026, 9, 16, 12);
  assert.equal(daysInStock(new Date(Date.UTC(2026, 9, 1, 13)), now), 14);
  assert.equal(daysInStock(new Date(Date.UTC(2026, 9, 20)), now), 0);
});
