/** Perhitungan titip jual — murni (tanpa I/O) agar mudah diuji & dipakai ulang. */

export type ConsignmentStatus = "AVAILABLE" | "SOLD" | "RETURNED";
export type CommissionType = "PERCENT" | "FIXED";

/**
 * Bagi hasil penjualan barang titipan.
 * - PERCENT: komisi = round(harga terjual × persen / 100), persen dibatasi 0–100.
 * - FIXED: komisi = nominal tetap, maksimal sebesar harga terjual.
 * Hak pemilik = harga terjual − komisi (tak pernah negatif).
 */
export function splitConsignment(
  soldPrice: number,
  type: CommissionType,
  value: number,
): { commission: number; ownerShare: number } {
  const price = Math.max(0, Math.round(soldPrice));
  const v = Math.max(0, Math.round(value));
  const commission = type === "PERCENT" ? Math.round((price * Math.min(v, 100)) / 100) : Math.min(v, price);
  return { commission, ownerShare: price - commission };
}

/** Label syarat komisi, mis. "10%" atau "Rp 50.000". */
export function commissionLabel(type: CommissionType, value: number, rupiah: (n: number) => string): string {
  return type === "PERCENT" ? `${value}%` : rupiah(value);
}

export interface ConsignmentLine {
  askingPrice: number;
  status: ConsignmentStatus;
  soldPrice?: number | null;
  commissionType?: CommissionType;
  commissionValue?: number;
  storeCommission?: number | null;
  ownerShare?: number | null;
  ownerPaidAt?: Date | string | null;
}

export interface ConsignmentSummary {
  count: number;
  available: number;
  sold: number;
  returned: number;
  /** Total harga diinginkan untuk barang yang MASIH dititipkan. */
  availableValue: number;
  /** Total hasil jual (soldPrice, atau askingPrice bila tak diisi). */
  soldValue: number;
  /** Total harga diinginkan seluruh barang (nilai titipan awal). */
  askingTotal: number;
  /** Total komisi toko dari barang terjual. */
  commissionTotal: number;
  /** Hak pemilik dari barang terjual: total, sudah dibayar, belum dibayar. */
  ownerShareTotal: number;
  ownerPaid: number;
  ownerOwed: number;
  /** Selesai = tak ada lagi barang yang dititipkan. */
  done: boolean;
}

/** Pembagian hasil satu barang terjual (pakai angka tersimpan; hitung bila data lama kosong). */
export function soldSplit(l: ConsignmentLine): { commission: number; ownerShare: number } {
  if (l.ownerShare != null && l.storeCommission != null) {
    return { commission: l.storeCommission, ownerShare: l.ownerShare };
  }
  return splitConsignment(l.soldPrice ?? l.askingPrice, l.commissionType ?? "PERCENT", l.commissionValue ?? 0);
}

export function summarizeConsignment(lines: ConsignmentLine[]): ConsignmentSummary {
  const s: ConsignmentSummary = {
    count: lines.length,
    available: 0,
    sold: 0,
    returned: 0,
    availableValue: 0,
    soldValue: 0,
    askingTotal: 0,
    commissionTotal: 0,
    ownerShareTotal: 0,
    ownerPaid: 0,
    ownerOwed: 0,
    done: false,
  };
  for (const l of lines) {
    s.askingTotal += l.askingPrice;
    if (l.status === "AVAILABLE") {
      s.available += 1;
      s.availableValue += l.askingPrice;
    } else if (l.status === "SOLD") {
      s.sold += 1;
      s.soldValue += l.soldPrice ?? l.askingPrice;
      const { commission, ownerShare } = soldSplit(l);
      s.commissionTotal += commission;
      s.ownerShareTotal += ownerShare;
      if (l.ownerPaidAt) s.ownerPaid += ownerShare;
      else s.ownerOwed += ownerShare;
    } else {
      s.returned += 1;
    }
  }
  s.done = s.count > 0 && s.available === 0;
  return s;
}
