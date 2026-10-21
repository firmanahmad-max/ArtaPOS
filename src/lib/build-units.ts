/**
 * Komponen rakitan dari Barang Bekas / Titip Jual — tipe & helper murni (dipakai
 * klien + server). Lihat src/server/pcbuild/units.ts untuk klaim/lepas unit.
 */

export type UnitKind = "used" | "consignment";

/** Opsi unit untuk picker Rakit PC / Simulasi (hanya yang tersedia). */
export interface UnitOption {
  kind: UnitKind;
  id: string;
  /** No. dokumen: BK-xxxxx / TJ-xxxxx. */
  ref: string;
  name: string;
  /** Keterangan singkat: grade/garansi (bekas) atau pemilik + isi paket (titipan). */
  detail: string;
  serials: string[];
  sellPrice: number;
  /** Modal untuk margin simulasi: harga beli (bekas) / hak pemilik di harga daftar (titipan). */
  costPrice: number;
}

export const UNIT_KIND_LABEL: Record<UnitKind, string> = { used: "Bekas", consignment: "Titipan" };

/** Cocokkan kata kunci ke nama, no. dokumen, keterangan, atau no. seri (persis). */
export function matchUnit(u: UnitOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    u.name.toLowerCase().includes(q) ||
    u.ref.toLowerCase().includes(q) ||
    u.detail.toLowerCase().includes(q) ||
    u.serials.some((s) => s.toLowerCase() === q)
  );
}

/** Jenis unit dari baris komponen (null = produk inventory / komponen bebas). */
export function unitKindOf(row: { usedItemId?: string | null; consignmentItemId?: string | null }): UnitKind | null {
  if (row.usedItemId) return "used";
  if (row.consignmentItemId) return "consignment";
  return null;
}
