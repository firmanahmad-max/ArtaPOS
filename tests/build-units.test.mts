import { test } from "node:test";
import assert from "node:assert/strict";
import { matchUnit, unitKindOf, type UnitOption } from "../src/lib/build-units.ts";

const used: UnitOption = {
  kind: "used",
  id: "u1",
  ref: "BK-00007",
  name: "VGA RTX 3060 12GB",
  detail: "Bekas · Grade B · garansi 30 hari",
  serials: ["SN3060ABC"],
  sellPrice: 3_200_000,
  costPrice: 2_700_000,
};
const consigned: UnitOption = {
  kind: "consignment",
  id: "c1",
  ref: "TJ-00012",
  name: "1 Set PC Ryzen 5",
  detail: "Titipan · Budi Santoso · isi: CPU Ryzen 5, Monitor LG",
  serials: ["PCSET-01", "LGMON-77"],
  sellPrice: 8_500_000,
  costPrice: 7_650_000,
};

test("matchUnit: nama, no. dokumen, pemilik/isi, no. seri persis", () => {
  assert.ok(matchUnit(used, ""));
  assert.ok(matchUnit(used, "rtx"));
  assert.ok(matchUnit(used, "bk-00007"));
  assert.ok(matchUnit(consigned, "budi"));
  assert.ok(matchUnit(consigned, "monitor lg"));
  assert.ok(matchUnit(consigned, "lgmon-77")); // SN komponen paket
  assert.ok(!matchUnit(consigned, "lgmon")); // SN harus persis (hindari salah pilih)
  assert.ok(!matchUnit(used, "ryzen"));
});

test("unitKindOf: jenis baris komponen", () => {
  assert.equal(unitKindOf({ usedItemId: "u1", consignmentItemId: null }), "used");
  assert.equal(unitKindOf({ usedItemId: null, consignmentItemId: "c1" }), "consignment");
  assert.equal(unitKindOf({ usedItemId: null, consignmentItemId: null }), null);
  assert.equal(unitKindOf({}), null);
});
