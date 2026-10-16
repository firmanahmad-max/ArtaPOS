"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import {
  createGalleryItem,
  updateGalleryItem,
  setGalleryActive,
  deleteGalleryItem,
  addConsignmentToGallery,
  addUsedItemToGallery,
  type GalleryInput,
} from "./service";

const schema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  consignmentItemId: z.string().optional().nullable(),
  usedItemId: z.string().optional().nullable(),
  title: z.string().max(120).optional().default(""),
  spec: z.string().max(2000).optional().nullable(),
  price: z.number().int().min(0).max(2_000_000_000).optional().default(0),
  photo: z.string().optional().nullable(),
  label: z.string().max(24).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type GallerySaveInput = z.input<typeof schema>;

export async function saveGalleryItemAction(
  raw: GallerySaveInput,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("inventory.manage");
    const data = schema.parse(raw);
    const input: GalleryInput = {
      productId: data.productId ?? null,
      consignmentItemId: data.consignmentItemId ?? null,
      usedItemId: data.usedItemId ?? null,
      title: data.title,
      spec: data.spec ?? null,
      price: data.price,
      photo: data.photo === undefined ? undefined : data.photo,
      label: data.label ?? null,
      isActive: data.isActive,
    };
    if (data.id) await updateGalleryItem(ctx.tenantId, data.id, input);
    else await createGalleryItem(ctx.tenantId, ctx.userId, input);
    revalidatePath("/gallery");
    revalidatePath("/consignments", "layout");
    revalidatePath("/used-items", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
}

export async function toggleGalleryItemAction(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("inventory.manage");
    await setGalleryActive(ctx.tenantId, id, isActive);
    revalidatePath("/gallery");
    revalidatePath("/consignments", "layout");
    revalidatePath("/used-items", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal mengubah status." };
  }
}

export async function deleteGalleryItemAction(id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("inventory.manage");
    await deleteGalleryItem(ctx.tenantId, id);
    revalidatePath("/gallery");
    revalidatePath("/consignments", "layout");
    revalidatePath("/used-items", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus." };
  }
}

/** Pajang barang titipan di Galeri langsung dari halaman Titip Jual. */
export async function addConsignmentToGalleryAction(
  consignmentItemId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("inventory.manage");
    await addConsignmentToGallery(ctx.tenantId, ctx.userId, consignmentItemId);
    revalidatePath("/gallery");
    revalidatePath("/consignments", "layout");
    revalidatePath("/used-items", "layout");
    return { ok: true, message: "Ditambahkan ke Galeri Publik. Tambahkan foto di menu Galeri agar lebih menarik." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menambahkan ke Galeri." };
  }
}

/** Pajang barang bekas di Galeri langsung dari menu Barang Bekas. */
export async function addUsedItemToGalleryAction(usedItemId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("inventory.manage");
    await addUsedItemToGallery(ctx.tenantId, ctx.userId, usedItemId);
    revalidatePath("/gallery");
    revalidatePath("/used-items", "layout");
    return { ok: true, message: "Ditambahkan ke Galeri Publik. Tambahkan foto di menu Galeri agar lebih menarik." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menambahkan ke Galeri." };
  }
}
