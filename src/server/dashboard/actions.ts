"use server";

import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { getAssetsData, getProgramsData, type AssetsData, type ProgramsData } from "@/server/dashboard/service";

/** Bagian Dashboard yang bisa dilipat dimuat SAAT DIBUKA (bukan saat halaman dirender). */
export async function loadProgramsAction(): Promise<{ ok: boolean; data?: ProgramsData; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "reports.view")) return { ok: false, message: "Tidak punya izin." };
  try {
    return { ok: true, data: await getProgramsData(ctx.tenantId) };
  } catch {
    return { ok: false, message: "Gagal memuat data program." };
  }
}

export async function loadAssetsAction(): Promise<{ ok: boolean; data?: AssetsData; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: "Tidak punya izin." };
  try {
    return { ok: true, data: await getAssetsData(ctx.tenantId) };
  } catch {
    return { ok: false, message: "Gagal memuat data aset." };
  }
}
