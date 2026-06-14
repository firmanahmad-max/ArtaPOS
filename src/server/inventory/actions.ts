"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import {
  categorySchema,
  unitSchema,
  productSchema,
  stockAdjustSchema,
} from "@/lib/validations/inventory";
import * as svc from "@/server/inventory/service";

const NO_PERMISSION = "Anda tidak punya izin untuk mengelola inventory.";

/** Map error Prisma (mis. unik) ke pesan ramah. */
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Unique constraint") || (e as { code?: string })?.code === "P2002") {
    if (msg.includes("sku")) return "SKU/kode sudah dipakai produk lain.";
    if (msg.includes("barcode")) return "Barcode sudah dipakai produk lain.";
    return "Data sudah ada (duplikat).";
  }
  return msg || "Terjadi kesalahan.";
}

// ── Kategori ─────────────────────────────────────────────────────────────—
export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERMISSION };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await svc.createCategory(ctx.tenantId, parsed.data);
  } catch (e) {
    return { message: friendlyError(e) };
  }
  revalidatePath("/inventory/master");
  return { ok: true, message: "Kategori ditambahkan." };
}

/** Buat kategori cepat (dari form produk) → kembalikan id+nama untuk dipilih. */
export async function quickCreateCategoryAction(
  name: string,
): Promise<{ ok: boolean; id?: string; name?: string; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: NO_PERMISSION };

  const parsed = categorySchema.safeParse({ name, description: undefined });
  if (!parsed.success) return { ok: false, message: "Nama kategori tidak valid." };

  try {
    const cat = await svc.createCategory(ctx.tenantId, parsed.data);
    revalidatePath("/inventory/master");
    return { ok: true, id: cat.id, name: cat.name };
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
}

// ── Satuan ───────────────────────────────────────────────────────────────—
export async function createUnitAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERMISSION };

  const parsed = unitSchema.safeParse({
    name: formData.get("name"),
    symbol: formData.get("symbol"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await svc.createUnit(ctx.tenantId, parsed.data);
  } catch (e) {
    return { message: friendlyError(e) };
  }
  revalidatePath("/inventory/master");
  return { ok: true, message: "Satuan ditambahkan." };
}

/** Buat satuan cepat (dari form produk) → kembalikan id+nama untuk dipilih. */
export async function quickCreateUnitAction(
  name: string,
): Promise<{ ok: boolean; id?: string; name?: string; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: NO_PERMISSION };

  const parsed = unitSchema.safeParse({ name, symbol: undefined });
  if (!parsed.success) return { ok: false, message: "Nama satuan tidak valid." };

  try {
    const unit = await svc.createUnit(ctx.tenantId, parsed.data);
    revalidatePath("/inventory/master");
    return { ok: true, id: unit.id, name: unit.name };
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
}

// ── Produk ───────────────────────────────────────────────────────────────—
function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    unitId: formData.get("unitId"),
    costPrice: formData.get("costPrice"),
    sellPrice: formData.get("sellPrice"),
    initialStock: formData.get("initialStock"),
    minStock: formData.get("minStock"),
    warrantyMonths: formData.get("warrantyMonths"),
  });
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERMISSION };

  const parsed = parseProduct(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await svc.createProduct(ctx.tenantId, ctx.userId, parsed.data);
  } catch (e) {
    return { message: friendlyError(e) };
  }
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function updateProductAction(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERMISSION };

  const parsed = parseProduct(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await svc.updateProduct(ctx.tenantId, productId, parsed.data);
  } catch (e) {
    return { message: friendlyError(e) };
  }
  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function deactivateProductAction(productId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) throw new Error(NO_PERMISSION);
  await svc.deactivateProduct(ctx.tenantId, productId);
  revalidatePath("/inventory");
}

export async function importProductsAction(
  csvText: string,
): Promise<{ ok: boolean; message?: string; created?: number; errors?: { row: number; message: string }[] }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: NO_PERMISSION };
  try {
    const r = await svc.importProducts(ctx.tenantId, ctx.userId, csvText);
    revalidatePath("/inventory");
    return { ok: true, created: r.created, errors: r.errors };
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
}

export async function adjustStockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERMISSION };

  const parsed = stockAdjustSchema.safeParse({
    productId: formData.get("productId"),
    qty: formData.get("qty"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    const { stockAfter } = await svc.adjustStock(ctx.tenantId, ctx.userId, parsed.data);
    revalidatePath("/inventory");
    return { ok: true, message: `Stok diperbarui. Stok sekarang: ${stockAfter}.` };
  } catch (e) {
    return { message: friendlyError(e) };
  }
}
