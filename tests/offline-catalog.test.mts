import { test } from "node:test";
import assert from "node:assert/strict";
import { effectiveCatalog, reservationsFromOutbox } from "../src/lib/offline/catalog.ts";

const ssr = [
  { id: "p1", name: "SSD", sku: "SSD-1", barcode: null, sellPrice: 1000, stock: 5, minStock: 1, unit: null },
  { id: "p2", name: "RAM", sku: "RAM-1", barcode: "899", sellPrice: 500, stock: 3, minStock: 0, unit: { symbol: "pcs" } },
];
const cached = [
  { id: "p1", name: "SSD", sku: "SSD-1", barcode: null, sellPrice: 1000, costPrice: 800, stock: 8, minStock: 1, unit: "pcs", updatedAt: "2026-08-11T00:00:00Z" },
  { id: "p2", name: "RAM", sku: "RAM-1", barcode: "899", sellPrice: 500, costPrice: 300, stock: 4, minStock: 0, unit: "pcs", updatedAt: "2026-08-11T00:00:00Z" },
];
const ob = (items: { productId: string; qty: number }[]) => ({ payload: { items } });

test("effectiveCatalog: ONLINE pakai props SSR (item baru langsung tampil, cache diabaikan)", () => {
  // Cache 'ketinggalan' (mis. belum memuat item baru) — saat online HARUS pakai SSR.
  const r = effectiveCatalog(ssr, cached, [], true);
  assert.equal(r, ssr); // referensi SSR, cache diabaikan
  assert.equal(r.find((p) => p.id === "p1")!.stock, 5); // dari SSR, bukan 8 dari cache
});

test("effectiveCatalog: OFFLINE pakai cache IndexedDB (stok dari sinkron terakhir)", () => {
  const r = effectiveCatalog(ssr, cached, [], false);
  assert.equal(r.find((p) => p.id === "p1")!.stock, 8); // dari cache
  assert.deepEqual(r.find((p) => p.id === "p1")!.unit, { symbol: "pcs" });
});

test("effectiveCatalog: OFFLINE cache kosong → jatuh ke props SSR", () => {
  const r = effectiveCatalog(ssr, [], [], false);
  assert.equal(r, ssr);
});

test("effectiveCatalog: OFFLINE kurangi stok dgn reservasi outbox (realistis)", () => {
  const r = effectiveCatalog(ssr, cached, [ob([{ productId: "p1", qty: 3 }]), ob([{ productId: "p1", qty: 2 }, { productId: "p2", qty: 1 }])], false);
  assert.equal(r.find((p) => p.id === "p1")!.stock, 8 - 5); // cache 8 - reservasi 5 = 3
  assert.equal(r.find((p) => p.id === "p2")!.stock, 4 - 1); // 3
});

test("effectiveCatalog: stok tak pernah negatif", () => {
  const r = effectiveCatalog(ssr, cached, [ob([{ productId: "p2", qty: 99 }])], false);
  assert.equal(r.find((p) => p.id === "p2")!.stock, 0);
});

test("reservationsFromOutbox: akumulasi qty per produk; abaikan payload tanpa items", () => {
  const m = reservationsFromOutbox([ob([{ productId: "p1", qty: 2 }]), { payload: null }, ob([{ productId: "p1", qty: 1 }])]);
  assert.equal(m.get("p1"), 3);
  assert.equal(m.size, 1);
});
