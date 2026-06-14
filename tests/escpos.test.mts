import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReceiptEscpos } from "../src/lib/escpos.ts";

const decode = (b: Uint8Array) => String.fromCharCode(...b);

const baseReceipt = {
  storeName: "Toko Maju",
  number: "INV-00001",
  dateText: "14/06/26 10:00",
  cashierName: "Budi",
  customerName: null,
  items: [{ name: "SSD NVMe", qty: 2, price: 500000, subtotal: 1000000 }],
  subtotal: 1000000,
  discount: 0,
  total: 1000000,
  methodLabel: "Tunai",
  paid: 1000000,
  change: 0,
  footer: "Terima kasih",
};

test("menghasilkan Uint8Array diawali perintah init ESC @", () => {
  const out = buildReceiptEscpos(baseReceipt);
  assert.ok(out instanceof Uint8Array);
  assert.ok(out.length > 0);
  assert.equal(out[0], 0x1b); // ESC
  assert.equal(out[1], 0x40); // @
});

test("memuat teks struk (nama toko, nomor, item, TOTAL, footer)", () => {
  const s = decode(buildReceiptEscpos(baseReceipt));
  for (const frag of ["Toko Maju", "INV-00001", "SSD NVMe", "TOTAL", "Terima kasih"]) {
    assert.ok(s.includes(frag), `harus memuat "${frag}"`);
  }
});

test("menyaring karakter non-ASCII (aman untuk printer thermal)", () => {
  const s = decode(buildReceiptEscpos({ ...baseReceipt, storeName: "Tökö × Müra –" }));
  assert.ok(s.includes("Tk x Mra -")); // ö/ü dibuang, ×→x, –→-
  assert.ok(!s.includes("ö") && !s.includes("×"));
});

test("baris Diskon hanya muncul bila discount > 0", () => {
  assert.ok(!decode(buildReceiptEscpos(baseReceipt)).includes("Diskon"));
  const withDisc = decode(buildReceiptEscpos({ ...baseReceipt, discount: 50000 }));
  assert.ok(withDisc.includes("Diskon"));
});
