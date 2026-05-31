"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { saleSchema, salePaymentSchema, type SaleInput } from "@/lib/validations/pos";
import { toFieldErrors, type FormState } from "@/lib/form";
import { createSale, voidSale, recordSalePayment, createReturn } from "@/server/pos/service";
import { checkLicense } from "@/server/license/service";

export interface CheckoutResult {
  ok: boolean;
  message?: string;
  saleId?: string;
  number?: string;
  change?: number;
}

/** Checkout penjualan. Menerima payload keranjang dari klien POS. */
export async function createSaleAction(input: SaleInput): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) {
    return { ok: false, message: "Anda tidak punya izin melakukan penjualan." };
  }

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  // Enforcement lisensi/demo.
  const lic = await checkLicense(user.tenantId);
  if (!lic.allowed) return { ok: false, message: lic.reason };

  try {
    const sale = await createSale(
      user.tenantId,
      { id: user.id, name: user.name },
      parsed.data,
    );
    revalidatePath("/inventory");
    revalidatePath("/pos");
    return { ok: true, saleId: sale.id, number: sale.number, change: sale.change };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Checkout gagal." };
  }
}

/** Batalkan (void) transaksi — hanya Owner/Admin. */
export async function voidSaleAction(
  saleId: string,
): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return { ok: false, message: "Hanya Admin/Pemilik yang bisa membatalkan transaksi." };
  }
  try {
    const r = await voidSale(user.tenantId, user.id, saleId);
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/inventory");
    return { ok: true, message: `Transaksi ${r.number} dibatalkan, stok dikembalikan.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal membatalkan." };
  }
}

/** Retur penjualan sebagian. */
export async function createReturnAction(
  saleId: string,
  lines: { saleItemId: string; qty: number }[],
): Promise<{ ok: boolean; message?: string; number?: string; refund?: number }> {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return { ok: false, message: "Hanya Admin/Pemilik yang bisa memproses retur." };
  }
  try {
    const r = await createReturn(user.tenantId, user.id, saleId, lines);
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/inventory");
    return { ok: true, number: r.number, refund: r.refund };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal memproses retur." };
  }
}

/** Catat pembayaran piutang penjualan kredit. */
export async function recordSalePaymentAction(
  saleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) return { message: "Tidak punya izin." };

  const parsed = salePaymentSchema.safeParse({
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    const r = await recordSalePayment(
      user.tenantId,
      user.id,
      saleId,
      parsed.data.amount,
      parsed.data.note || undefined,
    );
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/receivables");
    return {
      ok: true,
      message: r.outstanding > 0 ? `Pembayaran tercatat. Sisa piutang: ${r.outstanding}.` : "Piutang lunas.",
    };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal mencatat pembayaran." };
  }
}
