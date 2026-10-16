/**
 * Barang BEKAS milik toko — label & hitungan murni (tanpa I/O), unit-tested.
 * Nilai enum dicerminkan dari Prisma (UsedItemStatus/Grade/Source) agar modul
 * ini bisa dipakai di klien & test tanpa mengimpor client Prisma.
 */

export type UsedStatus = "AVAILABLE" | "SOLD" | "WITHDRAWN";
export type UsedGrade = "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
export type UsedSource = "BUY" | "TRADE_IN" | "SUPPLIER" | "SERVICE" | "OTHER";

export const USED_GRADES: { value: UsedGrade; code: string; label: string; hint: string }[] = [
  { value: "LIKE_NEW", code: "A", label: "Seperti baru", hint: "Mulus, nyaris tanpa bekas pakai" },
  { value: "GOOD", code: "B", label: "Baik", hint: "Normal, bekas pakai wajar" },
  { value: "FAIR", code: "C", label: "Cukup", hint: "Ada lecet/kosmetik, fungsi normal" },
  { value: "POOR", code: "D", label: "Ada minus", hint: "Ada kekurangan — jelaskan di keterangan" },
];

export const USED_SOURCES: { value: UsedSource; label: string }[] = [
  { value: "BUY", label: "Beli dari pelanggan" },
  { value: "TRADE_IN", label: "Tukar tambah" },
  { value: "SUPPLIER", label: "Supplier / lelang" },
  { value: "SERVICE", label: "Unit servis tak diambil" },
  { value: "OTHER", label: "Lainnya" },
];

export const USED_STATUS_LABEL: Record<UsedStatus, string> = {
  AVAILABLE: "Tersedia",
  SOLD: "Terjual",
  WITHDRAWN: "Ditarik",
};

export function gradeMeta(g: UsedGrade) {
  return USED_GRADES.find((x) => x.value === g) ?? USED_GRADES[1];
}

export function sourceLabel(s: UsedSource): string {
  return USED_SOURCES.find((x) => x.value === s)?.label ?? "Lainnya";
}

/** "Grade B · Baik" */
export function gradeText(g: UsedGrade): string {
  const m = gradeMeta(g);
  return `Grade ${m.code} · ${m.label}`;
}

export function warrantyText(days: number): string {
  if (!days || days <= 0) return "Tanpa garansi";
  if (days % 30 === 0) return `Garansi toko ${days / 30} bulan`;
  return `Garansi toko ${days} hari`;
}

/** Margin kotor & persentasenya terhadap harga jual (null bila harga jual 0). */
export function usedMargin(costPrice: number, sellPrice: number): { margin: number; pct: number | null } {
  const margin = sellPrice - costPrice;
  return { margin, pct: sellPrice > 0 ? Math.round((margin / sellPrice) * 100) : null };
}

/**
 * Nama baris di struk/penjualan (snapshot): jelas bahwa barangnya BEKAS, grade-nya,
 * dan garansi toko — penting sebagai bukti bagi pembeli.
 */
export function usedSaleName(it: { category: string; name: string; grade: UsedGrade; warrantyDays: number }): string {
  const parts = [`Bekas, Grade ${gradeMeta(it.grade).code}`];
  if (it.warrantyDays > 0) parts.push(warrantyText(it.warrantyDays).replace("Garansi toko", "garansi"));
  return `${it.category} ${it.name} (${parts.join(", ")})`;
}

export interface UsedSummary {
  available: number;
  /** Total modal barang yang masih tersedia (nilai persediaan bekas). */
  stockCost: number;
  /** Total harga jual barang tersedia. */
  stockValue: number;
  /** Potensi laba bila semua yang tersedia laku di harga jual. */
  potentialProfit: number;
  sold: number;
  /** Laba kotor terealisasi dari yang terjual (harga terjual − modal). */
  realizedProfit: number;
  withdrawn: number;
}

export function summarizeUsedItems(
  items: { status: UsedStatus; costPrice: number; sellPrice: number; soldPrice: number | null }[],
): UsedSummary {
  const s: UsedSummary = {
    available: 0,
    stockCost: 0,
    stockValue: 0,
    potentialProfit: 0,
    sold: 0,
    realizedProfit: 0,
    withdrawn: 0,
  };
  for (const it of items) {
    if (it.status === "AVAILABLE") {
      s.available += 1;
      s.stockCost += it.costPrice;
      s.stockValue += it.sellPrice;
    } else if (it.status === "SOLD") {
      s.sold += 1;
      s.realizedProfit += (it.soldPrice ?? it.sellPrice) - it.costPrice;
    } else {
      s.withdrawn += 1;
    }
  }
  s.potentialProfit = s.stockValue - s.stockCost;
  return s;
}

/** Lama barang tersimpan (hari, dibulatkan ke bawah). `now` dapat diinjeksi untuk test. */
export function daysInStock(acquiredAt: Date | string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(acquiredAt).getTime()) / 86_400_000));
}
