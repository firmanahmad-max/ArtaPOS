import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseComponents,
  componentsError,
  consignmentSaleName,
  setContentsText,
  setSerials,
  setGallerySpec,
  componentLabel,
  MAX_SET_COMPONENTS,
} from "../src/lib/consignment-set.ts";

const set = [
  { name: "CPU Ryzen 5 5600 + RTX 3060", serialNumber: "PC-001", note: null },
  { name: 'Monitor LG 24"', serialNumber: "LG24X9", note: "ada goresan kecil" },
  { name: "Keyboard & Mouse Logitech", serialNumber: null, note: null },
];

test("parseComponents: aman untuk data rusak/lama & merapikan isian", () => {
  assert.deepEqual(parseComponents(null), []);
  assert.deepEqual(parseComponents("x"), []);
  assert.deepEqual(parseComponents({ name: "a" }), []);
  const p = parseComponents([{ name: "  Monitor  ", serialNumber: " ", note: "" }, { name: "" }, 5, null, { foo: 1 }]);
  assert.deepEqual(p, [{ name: "Monitor", serialNumber: null, note: null }]);
  const many = Array.from({ length: 30 }, (_, i) => ({ name: `K${i}` }));
  assert.equal(parseComponents(many).length, MAX_SET_COMPONENTS);
});

test("componentsError: kosong = tunggal, 1 komponen ditolak, 2+ valid", () => {
  assert.equal(componentsError([]), null);
  assert.ok(componentsError([set[0]]));
  assert.equal(componentsError(set), null);
});

test("nama baris struk, isi, no. seri & deskripsi galeri", () => {
  assert.equal(consignmentSaleName("VGA", "RTX 3060", []), "VGA RTX 3060");
  assert.equal(
    consignmentSaleName("1 Set PC", "Gaming Ryzen 5", set),
    '1 Set PC Gaming Ryzen 5 — isi: CPU Ryzen 5 5600 + RTX 3060, Monitor LG 24", Keyboard & Mouse Logitech',
  );
  assert.equal(setContentsText([]), "");
  assert.deepEqual(setSerials(set), ["PC-001", "LG24X9"]);
  assert.equal(componentLabel(set[1]), 'Monitor LG 24" (SN: LG24X9)');
  assert.equal(componentLabel(set[1], false), 'Monitor LG 24"');
  const spec = setGallerySpec(set, "Normal, pemakaian 1 tahun")!;
  assert.match(spec, /^Isi paket:\n• CPU Ryzen 5 5600 \+ RTX 3060\n• Monitor LG 24" — ada goresan kecil/);
  assert.match(spec, /\n\nKondisi: Normal, pemakaian 1 tahun$/);
  assert.doesNotMatch(spec, /PC-001/); // no. seri tak dipajang publik
  assert.equal(setGallerySpec([], "Mulus"), "Mulus");
  assert.equal(setGallerySpec([], null), null);
});
