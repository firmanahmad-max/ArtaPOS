import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, parseCsv } from "../src/lib/csv.ts";

const stripBom = (s: string) => s.replace(/^﻿/, "");

test("menetralkan formula injection pada nilai teks", () => {
  const out = stripBom(toCsv([["=cmd|calc"], ["+1+1"], ["-2+3"], ["@SUM(A1)"]]));
  assert.deepEqual(out.split("\r\n"), ["'=cmd|calc", "'+1+1", "'-2+3", "'@SUM(A1)"]);
});

test("angka (termasuk negatif) tidak diberi prefiks apostrof", () => {
  const out = stripBom(toCsv([["harga", -2500, 0, 1000]]));
  assert.equal(out, "harga,-2500,0,1000");
});

test("field dengan koma/kutip/newline di-quote dengan benar", () => {
  const out = stripBom(toCsv([["Mouse, Gaming", 'Dia bilang "halo"', "baris1\nbaris2"]]));
  assert.equal(out, '"Mouse, Gaming","Dia bilang ""halo""","baris1\nbaris2"');
});

test("diawali BOM agar Excel membaca UTF-8", () => {
  assert.ok(toCsv([["a"]]).startsWith("﻿"));
});

test("parseCsv round-trip menangani kutip & koma", () => {
  const rows = parseCsv('nama,harga\r\n"Mouse, Gaming",150000\r\n');
  assert.deepEqual(rows, [
    ["nama", "harga"],
    ["Mouse, Gaming", "150000"],
  ]);
});
