import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectBrand,
  guessCategory,
  resolveFacets,
  filterGallery,
  galleryFacets,
  parseGalleryQuery,
  galleryQueryString,
  EMPTY_FILTERS,
  type GalleryCard,
} from "../src/lib/gallery-filter.ts";

test("detectBrand: alias, batas kata, kemunculan paling awal", () => {
  assert.equal(detectBrand("MSI GeForce RTX 3060 Ventus 2X"), "MSI");
  assert.equal(detectBrand("VGA Radeon RX 6600 8GB"), "AMD");
  assert.equal(detectBrand("SSD Western Digital Blue 1TB"), "WD");
  assert.equal(detectBrand("Laptop ThinkPad T480"), "Lenovo");
  assert.equal(detectBrand("RAM Team Group T-Force Delta 16GB"), "Team Group");
  assert.equal(detectBrand("Monitor LG 27GN750"), "LG");
  assert.equal(detectBrand("Kabel HDMI 2 meter"), null);
  assert.equal(detectBrand("Msistem pendingin"), null); // bukan "MSI"
  assert.equal(detectBrand(""), null);
});

test("guessCategory: kata kunci umum", () => {
  assert.equal(guessCategory("Laptop Asus VivoBook 14"), "Laptop");
  assert.equal(guessCategory("MSI RTX 3060 Ventus"), "VGA");
  assert.equal(guessCategory("Ryzen 5 5600 Box"), "Prosesor");
  assert.equal(guessCategory("Gigabyte B550M Aorus Elite"), "Motherboard");
  assert.equal(guessCategory("RAM DDR4 16GB 3200MHz"), "RAM");
  assert.equal(guessCategory("Samsung 980 NVMe 1TB"), "SSD");
  assert.equal(guessCategory("Deepcool AK400 Cooler"), "Pendingin");
  assert.equal(guessCategory("Thermal paste Arctic MX-4"), "Pendingin");
  assert.equal(guessCategory("Sesuatu yang aneh"), null);
});

test("resolveFacets: isian toko > sumber tautan > tebakan judul", () => {
  assert.deepEqual(resolveFacets({ title: "MSI RTX 3060", category: " Kartu Grafis ", brand: "msi" }), {
    category: "Kartu Grafis",
    brand: "msi",
  });
  assert.deepEqual(resolveFacets({ title: "MSI RTX 3060", sourceCategory: "VGA" }), { category: "VGA", brand: "MSI" });
  assert.deepEqual(resolveFacets({ title: "Monitor LG 24" }), { category: "Monitor", brand: "LG" });
});

const card = (p: Partial<GalleryCard> & { id: string }): GalleryCard => ({
  title: p.id,
  spec: null,
  price: 0,
  photo: null,
  label: null,
  category: null,
  brand: null,
  condition: "baru",
  order: 0,
  clicks: 0,
  views: 0,
  ...p,
});

const items = [
  card({ id: "a", title: "MSI RTX 3060", category: "VGA", brand: "MSI", price: 4_500_000, order: 0, clicks: 2 }),
  card({ id: "b", title: "ASUS RTX 4060", category: "VGA", brand: "ASUS", price: 5_200_000, order: 1, clicks: 5 }),
  card({ id: "c", title: "RAM Kingston 16GB", category: "RAM", brand: "Kingston", price: 650_000, order: 2 }),
  card({ id: "d", title: "MSI B550M", category: "Motherboard", brand: "MSI", price: 1_800_000, order: 3, condition: "bekas" }),
  card({ id: "e", title: "Paket rakitan", category: "PC Rakitan", price: 0, order: 4 }),
];

test("filterGallery: kategori (tak peka huruf), brand, kondisi, harga, cari, urut", () => {
  const f = { ...EMPTY_FILTERS };
  assert.deepEqual(filterGallery(items, { ...f, category: "vga" }).map((i) => i.id), ["a", "b"]);
  assert.deepEqual(filterGallery(items, { ...f, brand: "MSI" }).map((i) => i.id), ["a", "d"]);
  assert.deepEqual(filterGallery(items, { ...f, condition: "bekas" }).map((i) => i.id), ["d"]);
  assert.deepEqual(filterGallery(items, { ...f, price: "500-2jt" }).map((i) => i.id), ["c", "d"]);
  assert.deepEqual(filterGallery(items, { ...f, q: "msi rtx" }).map((i) => i.id), ["a"]);
  assert.deepEqual(filterGallery(items, { ...f, sort: "murah" }).map((i) => i.id), ["c", "d", "a", "b", "e"]); // "Hubungi" di akhir
  assert.deepEqual(filterGallery(items, { ...f, sort: "mahal" }).map((i) => i.id), ["b", "a", "d", "c", "e"]);
  assert.deepEqual(filterGallery(items, { ...f, sort: "populer" }).map((i) => i.id).slice(0, 2), ["b", "a"]);
});

test("galleryFacets: hitungan memakai filter grup lain", () => {
  const fx = galleryFacets(items, { ...EMPTY_FILTERS, brand: "MSI" });
  // Kategori dihitung untuk brand MSI saja.
  assert.deepEqual(fx.categories.map((c) => [c.value, c.count]), [
    ["Motherboard", 1],
    ["VGA", 1],
    ["PC Rakitan", 0],
    ["RAM", 0],
  ]);
  // Brand dihitung TANPA filter brand (semua brand tampil).
  assert.deepEqual(fx.brands.map((b) => b.value), ["MSI", "ASUS", "Kingston"]);
  assert.deepEqual(fx.condition, [{ value: "baru", count: 1 }, { value: "bekas", count: 1 }]);
});

test("query URL: parse aman & round-trip", () => {
  const f = parseGalleryQuery({ k: "VGA", b: "MSI", kondisi: "bekas", harga: "2-5jt", urut: "murah", q: " rtx " });
  assert.deepEqual(f, { q: "rtx", category: "VGA", brand: "MSI", condition: "bekas", price: "2-5jt", sort: "murah" });
  assert.deepEqual(parseGalleryQuery({ kondisi: "rusak", harga: "x", urut: "__proto__" }), EMPTY_FILTERS);
  assert.equal(galleryQueryString(f, { ref: "struk" }), "?ref=struk&q=rtx&k=VGA&b=MSI&kondisi=bekas&harga=2-5jt&urut=murah");
  assert.equal(galleryQueryString(EMPTY_FILTERS), "");
});
