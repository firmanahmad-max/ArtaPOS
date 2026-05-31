import "server-only";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv";
import type {
  CategoryInput,
  UnitInput,
  ProductInput,
  StockAdjustInput,
} from "@/lib/validations/inventory";

/**
 * Service inventory — SATU-SATUNYA titik akses ke tabel master data & stok.
 * SEMUA fungsi menerima `tenantId` dan WAJIB menyertakannya di setiap query
 * (isolasi multi-tenant). Stok diubah hanya lewat mutasi (transaksional).
 */

// ── Kategori ───────────────────────────────────────────────────────────────
export function listCategories(tenantId: string) {
  return db.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export function createCategory(tenantId: string, input: CategoryInput) {
  return db.category.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
    },
  });
}

// ── Satuan ───────────────────────────────────────────────────────────────—
export function listUnits(tenantId: string) {
  return db.unit.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export function createUnit(tenantId: string, input: UnitInput) {
  return db.unit.create({
    data: { tenantId, name: input.name, symbol: input.symbol || null },
  });
}

/** Buat satuan default bila tenant belum punya satuan apa pun. */
export async function ensureDefaultUnits(tenantId: string) {
  const count = await db.unit.count({ where: { tenantId } });
  if (count > 0) return;
  await db.unit.createMany({
    data: [
      { tenantId, name: "Pcs", symbol: "pcs" },
      { tenantId, name: "Unit", symbol: "unit" },
      { tenantId, name: "Set", symbol: "set" },
    ],
  });
}

// ── Produk ───────────────────────────────────────────────────────────────—
export function listProducts(
  tenantId: string,
  opts: { search?: string } = {},
) {
  const search = opts.search?.trim();
  return db.product.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { name: true } },
      unit: { select: { name: true, symbol: true } },
    },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export function getProduct(tenantId: string, id: string) {
  return db.product.findFirst({ where: { id, tenantId } });
}

export function getProductByBarcode(tenantId: string, barcode: string) {
  return db.product.findFirst({
    where: { tenantId, barcode, isActive: true },
  });
}

/** Verifikasi categoryId/unitId milik tenant; kembalikan null bila kosong/invalid. */
async function resolveRefs(tenantId: string, categoryId?: string, unitId?: string) {
  const cat =
    categoryId && (await db.category.findFirst({ where: { id: categoryId, tenantId }, select: { id: true } }))
      ? categoryId
      : null;
  const unit =
    unitId && (await db.unit.findFirst({ where: { id: unitId, tenantId }, select: { id: true } }))
      ? unitId
      : null;
  return { categoryId: cat, unitId: unit };
}

export async function createProduct(
  tenantId: string,
  userId: string,
  input: ProductInput,
) {
  const refs = await resolveRefs(tenantId, input.categoryId, input.unitId);
  const initial = input.initialStock ?? 0;

  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId,
        sku: input.sku,
        barcode: input.barcode || null,
        name: input.name,
        categoryId: refs.categoryId,
        unitId: refs.unitId,
        costPrice: input.costPrice,
        sellPrice: input.sellPrice,
        minStock: input.minStock,
        warrantyMonths: input.warrantyMonths,
        stock: initial,
      },
    });
    if (initial > 0) {
      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          type: "INITIAL",
          qty: initial,
          stockAfter: initial,
          note: "Stok awal",
          createdById: userId,
        },
      });
    }
    return product;
  });
}

export async function updateProduct(
  tenantId: string,
  id: string,
  input: ProductInput,
) {
  // Pastikan produk milik tenant.
  const existing = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) throw new Error("Produk tidak ditemukan.");
  const refs = await resolveRefs(tenantId, input.categoryId, input.unitId);

  // Catatan: stok TIDAK diubah di sini — gunakan adjustStock.
  return db.product.update({
    where: { id },
    data: {
      sku: input.sku,
      barcode: input.barcode || null,
      name: input.name,
      categoryId: refs.categoryId,
      unitId: refs.unitId,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      minStock: input.minStock,
    },
  });
}

/** Soft-delete (nonaktifkan) — pertahankan riwayat stok. */
export async function deactivateProduct(tenantId: string, id: string) {
  const existing = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) throw new Error("Produk tidak ditemukan.");
  return db.product.update({ where: { id }, data: { isActive: false } });
}

// ── Import massal (CSV) ───────────────────────────────────────────────────—
const HEADER_ALIAS: Record<string, string> = {
  nama: "name", name: "name", produk: "name",
  sku: "sku", kode: "sku",
  barcode: "barcode",
  kategori: "category", category: "category",
  satuan: "unit", unit: "unit",
  modal: "costPrice", hargamodal: "costPrice", costprice: "costPrice",
  jual: "sellPrice", hargajual: "sellPrice", sellprice: "sellPrice", harga: "sellPrice",
  stok: "stock", stokawal: "stock", stock: "stock",
  minstok: "minStock", stokmin: "minStock", minstock: "minStock",
  garansi: "warrantyMonths", warranty: "warrantyMonths", garansibulan: "warrantyMonths",
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]/g, "");
}
function toInt(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/[^0-9-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

/** Import produk massal dari teks CSV. Auto-buat kategori/satuan by nama. */
export async function importProducts(
  tenantId: string,
  userId: string,
  csvText: string,
): Promise<ImportResult> {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("CSV kosong atau hanya berisi header.");

  const header = rows[0].map((h) => HEADER_ALIAS[normHeader(h)] ?? "");
  if (!header.includes("name") || !header.includes("sku")) {
    throw new Error("Header wajib memuat kolom 'nama' dan 'sku'.");
  }

  const catCache = new Map<string, string>();
  const unitCache = new Map<string, string>();

  async function resolveCategory(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    if (catCache.has(key)) return catCache.get(key)!;
    const existing = await db.category.findFirst({ where: { tenantId, name: { equals: name.trim(), mode: "insensitive" } }, select: { id: true } });
    const id = existing?.id ?? (await db.category.create({ data: { tenantId, name: name.trim() }, select: { id: true } })).id;
    catCache.set(key, id);
    return id;
  }
  async function resolveUnit(name: string): Promise<string | null> {
    const key = name.trim().toLowerCase();
    if (!key) return null;
    if (unitCache.has(key)) return unitCache.get(key)!;
    const existing = await db.unit.findFirst({ where: { tenantId, name: { equals: name.trim(), mode: "insensitive" } }, select: { id: true } });
    const id = existing?.id ?? (await db.unit.create({ data: { tenantId, name: name.trim() }, select: { id: true } })).id;
    unitCache.set(key, id);
    return id;
  }

  const result: ImportResult = { created: 0, errors: [] };

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (field: string) => {
      const idx = header.indexOf(field);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };
    const name = get("name");
    const sku = get("sku");
    if (!name || !sku) {
      result.errors.push({ row: i + 1, message: "Nama/SKU kosong." });
      continue;
    }
    try {
      const categoryId = await resolveCategory(get("category"));
      const unitId = await resolveUnit(get("unit"));
      const stock = toInt(get("stock"));
      const barcode = get("barcode") || null;
      await db.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            tenantId, sku, barcode, name, categoryId, unitId,
            costPrice: toInt(get("costPrice")),
            sellPrice: toInt(get("sellPrice")),
            minStock: toInt(get("minStock")),
            warrantyMonths: toInt(get("warrantyMonths")),
            stock,
          },
        });
        if (stock > 0) {
          await tx.stockMovement.create({
            data: { tenantId, productId: product.id, type: "INITIAL", qty: stock, stockAfter: stock, note: "Stok awal (import)", createdById: userId },
          });
        }
      });
      result.created++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const friendly = msg.includes("Unique constraint") || (e as { code?: string })?.code === "P2002"
        ? `SKU/barcode "${sku}" duplikat.`
        : "Gagal menyimpan.";
      result.errors.push({ row: i + 1, message: friendly });
    }
  }
  return result;
}

/** Penyesuaian stok manual (transaksional, cegah stok negatif). */
export async function adjustStock(
  tenantId: string,
  userId: string,
  input: StockAdjustInput,
) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, tenantId },
      select: { id: true, stock: true },
    });
    if (!product) throw new Error("Produk tidak ditemukan.");

    const stockAfter = product.stock + input.qty;
    if (stockAfter < 0) throw new Error("Stok tidak boleh menjadi negatif.");

    await tx.product.update({
      where: { id: product.id },
      data: { stock: stockAfter },
    });
    await tx.stockMovement.create({
      data: {
        tenantId,
        productId: product.id,
        type: "ADJUSTMENT",
        qty: input.qty,
        stockAfter,
        note: input.note || null,
        createdById: userId,
      },
    });
    return { stockAfter };
  });
}
