import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeConsignment } from "../src/lib/consignment-calc.ts";

test("summarizeConsignment: hitung per status & nilai", () => {
  const s = summarizeConsignment([
    { askingPrice: 3_000_000, status: "AVAILABLE" },
    { askingPrice: 800_000, status: "SOLD", soldPrice: 750_000 },
    { askingPrice: 500_000, status: "SOLD" }, // tanpa soldPrice → pakai harga diinginkan
    { askingPrice: 200_000, status: "RETURNED" },
  ]);
  assert.equal(s.count, 4);
  assert.equal(s.available, 1);
  assert.equal(s.sold, 2);
  assert.equal(s.returned, 1);
  assert.equal(s.availableValue, 3_000_000);
  assert.equal(s.soldValue, 1_250_000);
  assert.equal(s.askingTotal, 4_500_000);
  assert.equal(s.done, false);
});

test("summarizeConsignment: selesai bila tak ada yang dititipkan; kosong ≠ selesai", () => {
  assert.equal(
    summarizeConsignment([
      { askingPrice: 1, status: "SOLD" },
      { askingPrice: 1, status: "RETURNED" },
    ]).done,
    true,
  );
  assert.equal(summarizeConsignment([]).done, false);
});
