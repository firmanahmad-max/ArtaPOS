import "server-only";
import { db } from "@/lib/db";
import { gradeText, warrantyText } from "@/lib/used-item";

/** Service Galeri Publik — etalase produk/promo. Ter-scope tenantId. */

export interface GalleryInput {
  productId?: string | null;
  /** Tautan barang titipan (titip jual) — saling eksklusif dengan productId. */
  consignmentItemId?: string | null;
  /** Tautan barang bekas milik toko — saling eksklusif dengan productId & titipan. */
  usedItemId?: string | null;
  title: string;
  spec?: string | null;
  price: number;
  /** data URL JPEG (sudah di-resize di browser), null = hapus, undefined = biarkan. */
  photo?: string | null;
  label?: string | null;
  isActive?: boolean;
}

const MAX_PHOTO = 1_400_000; // ~1.4 MB (data URL)
// Hanya raster yang aman di-<img> publik; tolak svg (permukaan XSS) & lainnya.
const PHOTO_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/;
function cleanPhoto(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (!PHOTO_RE.test(photo)) throw new Error("Format foto tidak valid.");
  if (photo.length > MAX_PHOTO) throw new Error("Foto terlalu besar — kecilkan/kompres dulu.");
  return photo;
}

/**
 * Aturan TAMPIL di publik: aktif DAN (bukan barang titipan ATAU titipannya masih
 * "Dititipkan") DAN (bukan barang bekas ATAU bekasnya masih "Tersedia"). Barang
 * yang laku/diambil kembali/ditarik otomatis tersembunyi tanpa perlu diubah manual.
 * Dipakai halaman publik, insight & tautan /lacak.
 */
export function publicGalleryWhere(tenantId: string) {
  return {
    tenantId,
    isActive: true,
    AND: [
      { OR: [{ consignmentItemId: null }, { consignmentItem: { status: "AVAILABLE" as const } }] },
      { OR: [{ usedItemId: null }, { usedItem: { status: "AVAILABLE" as const } }] },
    ],
  };
}

export function listGalleryAdmin(tenantId: string) {
  return db.galleryItem.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      consignmentItem: { select: { status: true, consignment: { select: { id: true, number: true } } } },
      usedItem: { select: { id: true, number: true, status: true } },
    },
  });
}

/** Item aktif untuk halaman publik (tanpa field berat yang tak perlu). */
export function listGalleryPublic(tenantId: string) {
  return db.galleryItem.findMany({
    where: publicGalleryWhere(tenantId),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, spec: true, price: true, photo: true, label: true },
    // Batasi agar halaman publik (foto data URL) tak membengkak tak terbatas.
    take: 200,
  });
}

/**
 * Item galeri paling diminati konsumen (untuk insight "Tanya Arta"/Dashboard).
 * Urut klik "Chat WA" lalu dilihat; hanya item aktif yang punya traksi.
 */
export function topGalleryItems(tenantId: string, limit = 3) {
  return db.galleryItem.findMany({
    where: { AND: [publicGalleryWhere(tenantId), { OR: [{ clicks: { gt: 0 } }, { views: { gt: 0 } }] }] },
    orderBy: [{ clicks: "desc" }, { views: "desc" }],
    select: { id: true, title: true, clicks: true, views: true },
    take: limit,
  });
}

/** Data toko (publik) berdasarkan slug — untuk header & nomor WA galeri. */
export function getGalleryStoreBySlug(slug: string) {
  return db.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, phone: true, logo: true, slug: true, isActive: true, updatedAt: true },
  });
}

/**
 * Validasi tautan & isi default. Barang titipan: harga SELALU mengikuti harga
 * diinginkan di Titip Jual (disinkron saat harga titipan diubah). `keepLinkedId`
 * = tautan lama item yang sedang diedit — boleh dipertahankan walau sudah laku
 * (mis. hanya mengganti foto); tautan BARU wajib barang yang masih dititipkan.
 */
async function resolveDefaults(
  tenantId: string,
  input: GalleryInput,
  keep?: { consignment?: string | null; used?: string | null },
) {
  let title = input.title?.trim() || "";
  let price = input.price;
  if ([input.productId, input.consignmentItemId, input.usedItemId].filter(Boolean).length > 1) {
    throw new Error("Pilih salah satu: produk, barang titipan, atau barang bekas.");
  }
  if (input.productId) {
    const p = await db.product.findFirst({
      where: { id: input.productId, tenantId },
      select: { name: true, sellPrice: true },
    });
    if (!p) throw new Error("Produk tidak ditemukan.");
    if (!title) title = p.name;
    if (price == null) price = p.sellPrice;
  }
  if (input.consignmentItemId) {
    const ci = await db.consignmentItem.findFirst({
      where: { id: input.consignmentItemId, consignment: { tenantId } },
      select: { category: true, name: true, askingPrice: true, status: true },
    });
    if (!ci) throw new Error("Barang titipan tidak ditemukan.");
    if (ci.status !== "AVAILABLE" && input.consignmentItemId !== keep?.consignment) {
      throw new Error("Barang titipan ini sudah tidak dititipkan (laku/diambil kembali).");
    }
    if (!title) title = `${ci.category} ${ci.name}`;
    price = ci.askingPrice;
  }
  if (input.usedItemId) {
    const u = await db.usedItem.findFirst({
      where: { id: input.usedItemId, tenantId },
      select: { category: true, name: true, sellPrice: true, status: true },
    });
    if (!u) throw new Error("Barang bekas tidak ditemukan.");
    if (u.status !== "AVAILABLE" && input.usedItemId !== keep?.used) {
      throw new Error("Barang bekas ini sudah tidak tersedia (terjual/ditarik).");
    }
    if (!title) title = `${u.category} ${u.name}`;
    price = u.sellPrice; // harga selalu mengikuti harga jual di menu Barang Bekas
  }
  if (!title) throw new Error("Judul wajib diisi.");
  return { title, price: Math.max(0, Math.round(price || 0)) };
}

/** Pesan ramah untuk tautan ganda (consignmentItemId/usedItemId unik). */
function friendlyGalleryError(e: unknown): never {
  if ((e as { code?: string })?.code === "P2002") throw new Error("Barang ini sudah ada di Galeri.");
  throw e;
}

export async function createGalleryItem(tenantId: string, userId: string, input: GalleryInput) {
  const { title, price } = await resolveDefaults(tenantId, input);
  const photo = cleanPhoto(input.photo);
  return db.galleryItem
    .create({
      data: {
        tenantId,
        productId: input.productId || null,
        consignmentItemId: input.consignmentItemId || null,
        usedItemId: input.usedItemId || null,
        title,
        spec: input.spec?.trim() || null,
        price,
        photo,
        label: input.label?.trim() || null,
        isActive: input.isActive ?? true,
        createdById: userId,
      },
    })
    .catch(friendlyGalleryError);
}

export async function updateGalleryItem(tenantId: string, id: string, input: GalleryInput) {
  const existing = await db.galleryItem.findFirst({
    where: { id, tenantId },
    select: { id: true, consignmentItemId: true, usedItemId: true },
  });
  if (!existing) throw new Error("Item galeri tidak ditemukan.");
  const { title, price } = await resolveDefaults(tenantId, input, {
    consignment: existing.consignmentItemId,
    used: existing.usedItemId,
  });
  return db.galleryItem
    .update({
      where: { id },
      data: {
        productId: input.productId || null,
        consignmentItemId: input.consignmentItemId || null,
        usedItemId: input.usedItemId || null,
        title,
        spec: input.spec?.trim() || null,
        price,
        // photo: undefined = biarkan, null/string = ganti.
        photo: input.photo === undefined ? undefined : cleanPhoto(input.photo),
        label: input.label?.trim() || null,
        isActive: input.isActive ?? true,
      },
    })
    .catch(friendlyGalleryError);
}

/**
 * Pajang satu barang titipan di Galeri (dari halaman Titip Jual). Judul, harga &
 * deskripsi (kondisi) terisi otomatis; foto bisa ditambahkan kemudian di Galeri.
 */
export async function addConsignmentToGallery(tenantId: string, userId: string, consignmentItemId: string) {
  const ci = await db.consignmentItem.findFirst({
    where: { id: consignmentItemId, consignment: { tenantId } },
    select: { condition: true },
  });
  if (!ci) throw new Error("Barang titipan tidak ditemukan.");
  return createGalleryItem(tenantId, userId, {
    consignmentItemId,
    title: "",
    spec: ci.condition,
    price: 0,
    photo: null,
    label: null,
    isActive: true,
  });
}

/**
 * Pajang satu barang bekas di Galeri (dari menu Barang Bekas). Judul & harga
 * otomatis; deskripsi dirangkai dari grade, kondisi, kelengkapan, spesifikasi &
 * garansi toko. Foto bisa ditambahkan kemudian di Galeri.
 */
export async function addUsedItemToGallery(tenantId: string, userId: string, usedItemId: string) {
  const u = await db.usedItem.findFirst({
    where: { id: usedItemId, tenantId },
    select: { grade: true, condition: true, completeness: true, specs: true, warrantyDays: true },
  });
  if (!u) throw new Error("Barang bekas tidak ditemukan.");
  const spec = [
    `Bekas — ${gradeText(u.grade)}`,
    u.specs,
    u.condition ? `Kondisi: ${u.condition}` : null,
    u.completeness ? `Kelengkapan: ${u.completeness}` : null,
    warrantyText(u.warrantyDays),
  ]
    .filter(Boolean)
    .join("\n");
  return createGalleryItem(tenantId, userId, {
    usedItemId,
    title: "",
    spec: spec.slice(0, 2000),
    price: 0,
    photo: null,
    label: "Bekas",
    isActive: true,
  });
}

/**
 * Catat impresi (view) untuk beberapa item sekaligus — dipanggil dari halaman
 * PUBLIK (tanpa tenant/auth). Tak perlu scoping tenant: increment per id, dibatasi
 * item aktif. Dibatasi 60 id/panggilan agar aman. Fire-and-forget (anti bot
 * sempurna tak dijamin; dedupe per sesi dilakukan di klien).
 */
export async function recordGalleryViews(itemIds: string[]) {
  const ids = itemIds.filter((x) => typeof x === "string" && x).slice(0, 60);
  if (!ids.length) return;
  await db.galleryItem.updateMany({
    where: { id: { in: ids }, isActive: true },
    data: { views: { increment: 1 } },
  });
}

/** Catat klik tombol "Chat WA" pada satu item (dari halaman publik). */
export async function recordGalleryClick(itemId: string) {
  if (!itemId) return;
  await db.galleryItem.updateMany({
    where: { id: itemId, isActive: true },
    data: { clicks: { increment: 1 } },
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
