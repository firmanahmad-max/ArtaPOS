/**
 * Perhitungan MURNI simulasi rakitan (dipakai editor klien & unit test).
 * Semua nilai rupiah Int. Tidak menyentuh DB/DOM.
 */

export interface SimLine {
  qty: number;
  costPrice: number; // modal per unit
  sellPrice: number; // jual per unit
}

export interface SimTotals {
  totalSell: number; // total jual komponen (tanpa jasa)
  totalCost: number; // total modal komponen
  fee: number; // jasa rakit
  grandSell: number; // total dibayar pelanggan = totalSell + fee
  margin: number; // laba = grandSell - totalCost (jasa rakit = 100% margin)
  marginPct: number; // margin / grandSell * 100
  remaining: number; // sisa bujet = budget - grandSell (0 bila budget 0/tanpa batas)
  overBudget: boolean; // grandSell melebihi budget (>0)
}

const nn = (v: number) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Hitung total jual, modal, margin, dan sisa bujet dari daftar komponen. */
export function simTotals(items: SimLine[], buildFee: number, budget: number): SimTotals {
  let totalSell = 0;
  let totalCost = 0;
  for (const it of items) {
    const q = nn(it.qty);
    totalSell += nn(it.sellPrice) * q;
    totalCost += nn(it.costPrice) * q;
  }
  const fee = nn(buildFee);
  const b = nn(budget);
  const grandSell = totalSell + fee;
  const margin = grandSell - totalCost;
  const marginPct = grandSell > 0 ? (margin / grandSell) * 100 : 0;
  const remaining = b > 0 ? b - grandSell : 0;
  return {
    totalSell,
    totalCost,
    fee,
    grandSell,
    margin,
    marginPct,
    remaining,
    overBudget: b > 0 && grandSell > b,
  };
}
