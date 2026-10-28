/**
 * Filter Galeri Publik — murni (tanpa I/O) agar mudah diuji & dipakai server + klien.
 * Kategori/brand item: isian toko → (bila kosong) sumber yang ditautkan (kategori
 * produk / jenis titipan / jenis barang bekas) → tebakan dari judul.
 */

export type GalleryCondition = "baru" | "bekas";
export type GallerySort = "default" | "murah" | "mahal" | "populer";

export interface GalleryCard {
  id: string;
  title: string;
  spec: string | null;
  price: number;
  photo: string | null;
  label: string | null;
  category: string | null;
  brand: string | null;
  condition: GalleryCondition;
  /** Urutan bawaan toko (indeks) & popularitas (klik WA, dilihat). */
  order: number;
  clicks: number;
  views: number;
}

export interface GalleryFilters {
  q: string;
  category: string | null;
  brand: string | null;
  condition: GalleryCondition | null;
  price: string | null; // id PRICE_BANDS
  sort: GallerySort;
}

export const EMPTY_FILTERS: GalleryFilters = { q: "", category: null, brand: null, condition: null, price: null, sort: "default" };

/** Brand umum toko komputer (huruf sesuai tampilan). Alias → nama baku. */
const BRANDS: [string, ...string[]][] = [
  ["ASUS", "rog", "tuf gaming"],
  ["MSI"],
  ["Gigabyte", "aorus"],
  ["ASRock"],
  ["Intel"],
  ["AMD", "ryzen", "radeon"],
  ["NVIDIA", "geforce"],
  ["Zotac"],
  ["Palit"],
  ["Galax"],
  ["Colorful"],
  ["Inno3D"],
  ["PNY"],
  ["Sapphire"],
  ["PowerColor"],
  ["Samsung"],
  ["Kingston", "hyperx"],
  ["Corsair"],
  ["ADATA", "xpg"],
  ["Team Group", "teamgroup", "t-force"],
  ["G.Skill", "gskill"],
  ["V-GeN", "vgen"],
  ["Crucial"],
  ["Klevv"],
  ["Hikvision"],
  ["WD", "western digital", "wdc"],
  ["Seagate"],
  ["Toshiba"],
  ["SanDisk"],
  ["Lexar"],
  ["Logitech"],
  ["Razer"],
  ["SteelSeries"],
  ["Fantech"],
  ["Rexus"],
  ["Rakk"],
  ["Lenovo", "thinkpad", "ideapad", "legion"],
  ["HP", "hewlett packard", "omen", "victus"],
  ["Dell", "alienware"],
  ["Acer", "predator", "nitro"],
  ["Apple", "macbook", "imac"],
  ["Axioo"],
  ["Advan"],
  ["Infinix"],
  ["Huawei"],
  ["Xiaomi", "redmi"],
  ["Microsoft", "surface"],
  ["LG"],
  ["AOC"],
  ["ViewSonic"],
  ["BenQ"],
  ["Philips"],
  ["Cooler Master", "coolermaster"],
  ["NZXT"],
  ["Deepcool"],
  ["Thermaltake"],
  ["Lian Li", "lianli"],
  ["be quiet!", "be quiet"],
  ["Seasonic"],
  ["FSP"],
  ["Antec"],
  ["Noctua"],
  ["Arctic"],
  ["ID-Cooling", "id cooling"],
  ["Cube Gaming"],
  ["Epson"],
  ["Canon"],
  ["Brother"],
  ["TP-Link", "tplink"],
  ["Tenda"],
  ["D-Link", "dlink"],
  ["Mercusys"],
  ["Ubiquiti"],
  ["Prolink"],
  ["Sony", "playstation"],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BRAND_RES = BRANDS.map(([name, ...aliases]) => ({
  name,
  re: new RegExp(`(^|[^a-z0-9])(${[name, ...aliases].map((a) => escapeRe(a.toLowerCase())).join("|")})(?=$|[^a-z0-9])`),
}));

/** Tebak brand dari teks (judul) — kemunculan PALING AWAL yang menang. */
export function detectBrand(text: string | null | undefined): string | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  let best: { name: string; at: number } | null = null;
  for (const b of BRAND_RES) {
    const m = b.re.exec(t);
    if (m && (best === null || m.index < best.at)) best = { name: b.name, at: m.index };
  }
  return best?.name ?? null;
}

/** Kata kunci → kategori (urutan penting: yang lebih spesifik dulu). */
const CATEGORY_RULES: [string, RegExp][] = [
  ["Laptop", /\b(laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|aspire|inspiron|chromebook)\b/],
  ["PC Rakitan", /\b(pc gaming|pc rakitan|set pc|1 set|cpu rakitan|mini pc|all in one pc)\b/],
  ["VGA", /\b(vga|gpu|rtx|gtx|radeon rx|rx ?\d{3,4}|arc a\d{3})\b/],
  ["Prosesor", /\b(prosesor|processor|ryzen \d|core i\d|core ultra|pentium|celeron|athlon|xeon)\b/],
  ["Motherboard", /\b(motherboard|mobo|mainboard|[abhxz]\d{3}m?\b)/],
  ["RAM", /\b(ram|ddr[345]|sodimm|so-dimm)\b/],
  ["SSD", /\b(ssd|nvme|m\.2)\b/],
  ["HDD", /\b(hdd|hard ?disk|harddisk)\b/],
  ["Flashdisk & Memori", /\b(flashdisk|flash disk|micro ?sd|memory card|sd card)\b/],
  ["PSU", /\b(psu|power supply)\b/],
  ["Casing", /\b(casing|case pc|chassis)\b/],
  ["Pendingin", /\b(cooler|cooling|heatsink|aio|fan|kipas|thermal paste)\b/],
  ["Monitor", /\b(monitor|display)\b/],
  ["Keyboard", /\b(keyboard|keycaps?)\b/],
  ["Mouse", /\b(mouse|mousepad)\b/],
  ["Headset & Audio", /\b(headset|headphone|earphone|speaker|soundbar|microphone|mic)\b/],
  ["Printer", /\b(printer|tinta|cartridge|toner)\b/],
  ["Jaringan", /\b(router|access point|switch hub|modem|wifi|lan card)\b/],
  ["Aksesoris", /\b(kabel|cable|adapter|converter|hub|charger|webcam|ups|stabilizer)\b/],
];

/** Tebak kategori dari judul (null bila tak dikenali). */
export function guessCategory(text: string | null | undefined): string | null {
  const t = (text ?? "").toLowerCase();
  if (!t) return null;
  for (const [name, re] of CATEGORY_RULES) if (re.test(t)) return name;
  return null;
}

/** Rapikan isian bebas (spasi, panjang). Kosong → null. */
export function cleanFacet(v: string | null | undefined, max = 40): string | null {
  const s = (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
}

/** Kategori/brand efektif sebuah item galeri. */
export function resolveFacets(p: {
  title: string;
  category?: string | null;
  brand?: string | null;
  sourceCategory?: string | null;
}): { category: string | null; brand: string | null } {
  return {
    category: cleanFacet(p.category) ?? cleanFacet(p.sourceCategory) ?? guessCategory(p.title),
    brand: cleanFacet(p.brand) ?? detectBrand(p.title),
  };
}

export const PRICE_BANDS: { id: string; label: string; min: number; max: number }[] = [
  { id: "u500", label: "< 500rb", min: 1, max: 499_999 },
  { id: "500-2jt", label: "500rb – 2jt", min: 500_000, max: 1_999_999 },
  { id: "2-5jt", label: "2 – 5jt", min: 2_000_000, max: 4_999_999 },
  { id: "5-10jt", label: "5 – 10jt", min: 5_000_000, max: 9_999_999 },
  { id: "10jt", label: "≥ 10jt", min: 10_000_000, max: Number.MAX_SAFE_INTEGER },
];

const norm = (s: string) => s.toLowerCase();
const same = (a: string | null, b: string | null) => !!a && !!b && norm(a) === norm(b);

function matches(it: GalleryCard, f: GalleryFilters, skip?: keyof GalleryFilters): boolean {
  if (skip !== "q" && f.q.trim()) {
    const words = norm(f.q).split(/\s+/).filter(Boolean);
    const hay = norm([it.title, it.spec, it.category, it.brand, it.label].filter(Boolean).join(" "));
    if (!words.every((w) => hay.includes(w))) return false;
  }
  if (skip !== "category" && f.category && !same(it.category, f.category)) return false;
  if (skip !== "brand" && f.brand && !same(it.brand, f.brand)) return false;
  if (skip !== "condition" && f.condition && it.condition !== f.condition) return false;
  if (skip !== "price" && f.price) {
    const band = PRICE_BANDS.find((b) => b.id === f.price);
    if (band && !(it.price >= band.min && it.price <= band.max)) return false;
  }
  return true;
}

/** Saring + urutkan. */
export function filterGallery<T extends GalleryCard>(items: T[], f: GalleryFilters): T[] {
  const out = items.filter((it) => matches(it, f));
  const priced = (x: T) => (x.price > 0 ? x.price : Number.MAX_SAFE_INTEGER); // "Hubungi" di akhir
  switch (f.sort) {
    case "murah":
      return out.sort((a, b) => priced(a) - priced(b) || a.order - b.order);
    case "mahal":
      return out.sort((a, b) => b.price - a.price || a.order - b.order);
    case "populer":
      return out.sort((a, b) => b.clicks - a.clicks || b.views - a.views || a.order - b.order);
    default:
      return out.sort((a, b) => a.order - b.order);
  }
}

export interface FacetOption {
  value: string;
  count: number;
}

/**
 * Opsi filter + jumlah item. Hitungan tiap grup memakai filter LAIN yang aktif
 * (bukan grupnya sendiri) → pengguna melihat berapa hasil bila memilih opsi itu.
 * Semua nilai yang ada di galeri tetap terdaftar (hitungan 0 = dinonaktifkan di UI)
 * agar baris filter tak "melompat" saat filter lain dipilih.
 */
export function galleryFacets(items: GalleryCard[], f: GalleryFilters) {
  const tally = (key: "category" | "brand") => {
    const map = new Map<string, FacetOption>();
    for (const it of items) {
      const v = it[key];
      if (!v) continue;
      const k = norm(v);
      const hit = matches(it, f, key) ? 1 : 0;
      const cur = map.get(k);
      if (cur) cur.count += hit;
      else map.set(k, { value: v, count: hit });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "id"));
  };
  const condition = (["baru", "bekas"] as const).map((c) => ({
    value: c,
    count: items.filter((it) => it.condition === c && matches(it, f, "condition")).length,
  }));
  const price = PRICE_BANDS.map((b) => ({
    value: b.id,
    label: b.label,
    count: items.filter((it) => it.price >= b.min && it.price <= b.max && matches(it, f, "price")).length,
  }));
  return { categories: tally("category"), brands: tally("brand"), condition, price };
}

/** Baca filter dari query URL (?q=&k=&b=&kondisi=&harga=&urut=). Nilai asing diabaikan. */
export function parseGalleryQuery(sp: Record<string, string | string[] | undefined>): GalleryFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || null;
  };
  const cond = one("kondisi");
  const sort = one("urut");
  const price = one("harga");
  return {
    q: one("q") ?? "",
    category: one("k"),
    brand: one("b"),
    condition: cond === "baru" || cond === "bekas" ? cond : null,
    price: PRICE_BANDS.some((b) => b.id === price) ? price : null,
    sort: sort === "murah" || sort === "mahal" || sort === "populer" ? sort : "default",
  };
}

/** Filter → query string (hanya yang aktif), untuk tautan yang bisa dibagikan. */
export function galleryQueryString(f: GalleryFilters, keep: Record<string, string | null> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(keep)) if (v) p.set(k, v);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.category) p.set("k", f.category);
  if (f.brand) p.set("b", f.brand);
  if (f.condition) p.set("kondisi", f.condition);
  if (f.price) p.set("harga", f.price);
  if (f.sort !== "default") p.set("urut", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const activeFilterCount = (f: GalleryFilters) =>
  [f.q.trim(), f.category, f.brand, f.condition, f.price].filter(Boolean).length;
