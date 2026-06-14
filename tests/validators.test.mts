import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPositiveInt, assertNonNegativeInt } from "../src/lib/utils.ts";

test("assertPositiveInt menerima bilangan bulat > 0", () => {
  assert.equal(assertPositiveInt(5), 5);
  assert.equal(assertPositiveInt(1), 1);
});

test("assertPositiveInt menolak 0/negatif/desimal/NaN", () => {
  for (const bad of [0, -3, 2.5, NaN, Infinity]) {
    assert.throws(() => assertPositiveInt(bad), /bilangan bulat/);
  }
});

test("assertNonNegativeInt menerima 0 dan positif, menolak negatif/desimal", () => {
  assert.equal(assertNonNegativeInt(0), 0);
  assert.equal(assertNonNegativeInt(100), 100);
  for (const bad of [-1, 1.5, NaN]) {
    assert.throws(() => assertNonNegativeInt(bad), /bilangan bulat/);
  }
});

test("label kustom muncul di pesan error", () => {
  assert.throws(() => assertPositiveInt(-1, "Jumlah pembayaran"), /Jumlah pembayaran/);
});
