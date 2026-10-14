import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeConsignment, splitConsignment, soldSplit } from "../src/lib/consignment-calc.ts";

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

test("splitConsignment: persen dibulatkan, dibatasi 0–100", () => {
  assert.deepEqual(splitConsignment(3_500_000, "PERCENT", 10), { commission: 350_000, ownerShare: 3_150_000 });
  assert.deepEqual(splitConsignment(999, "PERCENT", 10), { commission: 100, ownerShare: 899 }); // 99.9 → 100
  assert.deepEqual(splitConsignment(1_000, "PERCENT", 150), { commission: 1_000, ownerShare: 0 }); // >100 dibatasi
  assert.deepEqual(splitConsignment(1_000, "PERCENT", 0), { commission: 0, ownerShare: 1_000 });
});

test("splitConsignment: nominal tetap tak melebihi harga; hak pemilik tak negatif", () => {
  assert.deepEqual(splitConsignment(650_000, "FIXED", 50_000), { commission: 50_000, ownerShare: 600_000 });
  assert.deepEqual(splitConsignment(30_000, "FIXED", 50_000), { commission: 30_000, ownerShare: 0 });
  assert.deepEqual(splitConsignment(-5, "FIXED", 10), { commission: 0, ownerShare: 0 });
});

test("soldSplit: pakai angka tersimpan; data lama (kosong) dihitung dari syarat komisi", () => {
  assert.deepEqual(
    soldSplit({ askingPrice: 1_000, status: "SOLD", soldPrice: 900, storeCommission: 123, ownerShare: 777 }),
    { commission: 123, ownerShare: 777 },
  );
  assert.deepEqual(
    soldSplit({ askingPrice: 1_000, status: "SOLD", soldPrice: 900, commissionType: "PERCENT", commissionValue: 10 }),
    { commission: 90, ownerShare: 810 },
  );
});

test("summarizeConsignment: komisi & hak pemilik — dibayar vs belum", () => {
  const s = summarizeConsignment([
    { askingPrice: 3_500_000, status: "SOLD", soldPrice: 3_400_000, storeCommission: 340_000, ownerShare: 3_060_000, ownerPaidAt: "2026-10-14" },
    { askingPrice: 650_000, status: "SOLD", soldPrice: 600_000, storeCommission: 50_000, ownerShare: 550_000, ownerPaidAt: null },
    { askingPrice: 1_000_000, status: "AVAILABLE", commissionType: "PERCENT", commissionValue: 10 },
  ]);
  assert.equal(s.commissionTotal, 390_000);
  assert.equal(s.ownerShareTotal, 3_610_000);
  assert.equal(s.ownerPaid, 3_060_000);
  assert.equal(s.ownerOwed, 550_000);
});
