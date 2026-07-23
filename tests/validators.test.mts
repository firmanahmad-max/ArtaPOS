import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPositiveInt, assertNonNegativeInt, slugify, formatRupiah, clampQty } from "../src/lib/utils.ts";

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

test("slugify membentuk slug URL-friendly", () => {
  assert.equal(slugify("Toko Maju Jaya"), "toko-maju-jaya");
  assert.equal(slugify("  Toko   Saya  "), "toko-saya"); // spasi ganda + trim
  assert.equal(slugify("Hello__World!!"), "helloworld"); // underscore & '!' dibuang
  assert.equal(slugify("Ärt@POS"), "rtpos"); // karakter non-ASCII dibuang
  assert.equal(slugify("---"), ""); // hanya pemisah → kosong (onboarding pakai fallback)
});

test("formatRupiah: Rp, pemisah ribuan, tanpa desimal", () => {
  assert.match(formatRupiah(1000), /Rp/);
  assert.match(formatRupiah(1000000), /1\.000\.000/);
  assert.doesNotMatch(formatRupiah(1500), /,/); // tak ada bagian desimal
  assert.match(formatRupiah(0), /0/);
});

test("clampQty membatasi jumlah sparepart ke 1..stok", () => {
  // normal
  assert.equal(clampQty(3, 10), 3);
  assert.equal(clampQty(1, 10), 1);
  // melebihi stok → dipotong ke stok
  assert.equal(clampQty(99, 5), 5);
  // kosong / NaN / nol / negatif → minimal 1
  assert.equal(clampQty(NaN, 10), 1);
  assert.equal(clampQty(0, 10), 1);
  assert.equal(clampQty(-4, 10), 1);
  // desimal dibulatkan ke bawah
  assert.equal(clampQty(2.9, 10), 2);
  // stok 0/negatif tetap mengembalikan 1 (server yang menolak, bukan NaN/0)
  assert.equal(clampQty(3, 0), 1);
});
