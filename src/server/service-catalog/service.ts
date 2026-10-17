import "server-only";
import { db } from "@/lib/db";

/** Katalog jasa servis (harga standar + interval perawatan berkala). Ter-scope tenantId. */

export interface CatalogInput {
  name: string;
  price: number;
  intervalMonths: number;
}

function clean(input: CatalogInput) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Nama jasa wajib diisi.");
  if (name.length > 80) throw new Error("Nama jasa maksimal 80 karakter.");
  if (!Number.isInteger(input.price) || input.price < 0) throw new Error("Harga tidak valid.");
  if (!Number.isInteger(input.intervalMonths) || input.intervalMonths < 0 || input.intervalMonths > 60) {
    throw new Error("Interval harus 0–60 bulan.");
  }
  return { name, price: input.price, intervalMonths: input.intervalMonths };
}

export function listCatalog(tenantId: string, activeOnly = false) {
  return db.serviceCatalogItem.findMany({
    where: { tenantId, ...(activeOnly ? { isActive: true } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createCatalogItem(tenantId: string, input: CatalogInput) {
  const data = clean(input);
  const last = await db.serviceCatalogItem.findFirst({
    where: { tenantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return db.serviceCatalogItem.create({ data: { tenantId, ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}

export async function updateCatalogItem(tenantId: string, id: string, input: CatalogInput) {
  const data = clean(input);
  const r = await db.serviceCatalogItem.updateMany({ where: { id, tenantId }, data });
  if (r.count === 0) throw new Error("Jasa tidak ditemukan.");
}

export async function setCatalogActive(tenantId: string, id: string, isActive: boolean) {
  const r = await db.serviceCatalogItem.updateMany({ where: { id, tenantId }, data: { isActive } });
  if (r.count === 0) throw new Error("Jasa tidak ditemukan.");
}

/** Hapus hanya bila belum pernah dipakai di tiket (riwayat & pengingat bergantung padanya). */
export async function deleteCatalogItem(tenantId: string, id: string) {
  const item = await db.serviceCatalogItem.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!item) throw new Error("Jasa tidak ditemukan.");
  const used = await db.serviceItem.count({ where: { catalogItemId: id, ticket: { tenantId } } });
  if (used > 0) throw new Error("Jasa ini sudah dipakai di tiket — nonaktifkan saja agar riwayat & pengingat tetap utuh.");
  await db.serviceCatalogItem.delete({ where: { id: item.id } });
}

/** Contoh katalog jasa umum toko komputer (hanya ditambahkan bila namanya belum ada). */
export async function seedCatalogDefaults(tenantId: string) {
  const defaults: CatalogInput[] = [
    { name: "Cleaning & repaste laptop", price: 150_000, intervalMonths: 6 },
    { name: "Cleaning PC desktop", price: 100_000, intervalMonths: 6 },
    { name: "Ganti thermal pad", price: 120_000, intervalMonths: 12 },
    { name: "Perawatan printer (head cleaning)", price: 80_000, intervalMonths: 3 },
    { name: "Cek & kalibrasi baterai UPS", price: 50_000, intervalMonths: 12 },
    { name: "Install ulang OS + driver", price: 100_000, intervalMonths: 0 },
  ];
  const existing = new Set(
    (await db.serviceCatalogItem.findMany({ where: { tenantId }, select: { name: true } })).map((c) => c.name.toLowerCase()),
  );
  let added = 0;
  for (const d of defaults) {
    if (existing.has(d.name.toLowerCase())) continue;
    await createCatalogItem(tenantId, d);
    added += 1;
  }
  return added;
}
