import "server-only";
import { db } from "@/lib/db";

/** Service Galeri Publik — etalase produk/promo. Ter-scope tenantId. */

export interface GalleryInput {
  productId?: string | null;
  title: string;
  spec?: string | null;
  price: number;
  /** data URL JPEG (sudah di-resize di browser), null = hapus, undefined = biarkan. */
  photo?: string | null;
  label?: string | null;
  isActive?: boolean;
}

const MAX_PHOTO = 1_400_000; // ~1.4 MB (data URL)
function cleanPhoto(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (!photo.startsWith("data:image/")) throw new Error("Format foto tidak valid.");
  if (photo.length > MAX_PHOTO) throw new Error("Foto terlalu besar — kecilkan/kompres dulu.");
  return photo;
}

export function listGalleryAdmin(tenantId: string) {
  return db.galleryItem.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

/** Item aktif untuk halaman publik (tanpa field berat yang tak perlu). */
export function listGalleryPublic(tenantId: string) {
  return db.galleryItem.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, spec: true, price: true, photo: true, label: true },
  });
}

/** Data toko (publik) berdasarkan slug — untuk header & nomor WA galeri. */
export function getGalleryStoreBySlug(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, phone: true, logo: true, slug: true, isActive: true },
  });
}

async function resolveDefaults(tenantId: string, input: GalleryInput) {
  let title = input.title?.trim() || "";
  let price = input.price;
  if (input.productId) {
    const p = await db.product.findFirst({
      where: { id: input.productId, tenantId },
      select: { name: true, sellPrice: true },
    });
    if (!p) throw new Error("Produk tidak ditemukan.");
    if (!title) title = p.name;
    if (price == null) price = p.sellPrice;
  }
  if (!title) throw new Error("Judul wajib diisi.");
  return { title, price: Math.max(0, Math.round(price || 0)) };
}

export async function createGalleryItem(tenantId: string, userId: string, input: GalleryInput) {
  const { title, price } = await resolveDefaults(tenantId, input);
  const photo = cleanPhoto(input.photo);
  return db.galleryItem.create({
    data: {
      tenantId,
      productId: input.productId || null,
      title,
      spec: input.spec?.trim() || null,
      price,
      photo,
      label: input.label?.trim() || null,
      isActive: input.isActive ?? true,
      createdById: userId,
    },
  });
}

export async function updateGalleryItem(tenantId: string, id: string, input: GalleryInput) {
  const existing = await db.galleryItem.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) throw new Error("Item galeri tidak ditemukan.");
  const { title, price } = await resolveDefaults(tenantId, input);
  return db.galleryItem.update({
    where: { id },
    data: {
      productId: input.productId || null,
      title,
      spec: input.spec?.trim() || null,
      price,
      // photo: undefined = biarkan, null/string = ganti.
      photo: input.photo === undefined ? undefined : cleanPhoto(input.photo),
      label: input.label?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function setGalleryActive(tenantId: string, id: string, isActive: boolean) {
  const r = await db.galleryItem.updateMany({ where: { id, tenantId }, data: { isActive } });
  if (r.count === 0) throw new Error("Item galeri tidak ditemukan.");
}

export async function deleteGalleryItem(tenantId: string, id: string) {
  const r = await db.galleryItem.deleteMany({ where: { id, tenantId } });
  if (r.count === 0) throw new Error("Item galeri tidak ditemukan.");
}
