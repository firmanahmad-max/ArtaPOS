/**
 * Hitungan murni Dashboard (tanpa I/O), unit-tested. Zona tetap WIB (UTC+7, tanpa DST);
 * helper disalin lokal agar test Node bisa mengimpor tanpa alias.
 */

const OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function wib(at: number) {
  const t = new Date(at + OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours() };
}
const midnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - OFFSET_MS);

/** Sapaan sesuai jam WIB. */
export function greeting(now: number): string {
  const { h } = wib(now);
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Rentang hari ini & kemarin (WIB). */
export function dayRanges(now: number) {
  const { y, m, d } = wib(now);
  return {
    today: { from: midnight(y, m, d), to: midnight(y, m, d + 1) },
    yesterday: { from: midnight(y, m, d - 1), to: midnight(y, m, d) },
  };
}

/**
 * Bulan berjalan s/d sekarang vs rentang SETARA bulan lalu (tgl 1 → hari & jam yang sama,
 * dijepit ke akhir bulan lalu) — perbandingan adil, bukan bulan penuh.
 */
export function monthToDateRanges(now: number) {
  const { y, m, d } = wib(now);
  const from = midnight(y, m, 1);
  const elapsed = now - from.getTime();
  const prevFrom = midnight(y, m - 1, 1);
  const prevEnd = from; // awal bulan ini = akhir bulan lalu
  const prevTo = new Date(Math.min(prevFrom.getTime() + elapsed, prevEnd.getTime()));
  const pm = wib(prevFrom.getTime());
  const prevDays = Math.round((prevEnd.getTime() - prevFrom.getTime()) / DAY_MS);
  const prevDay = Math.min(d, prevDays);
  return {
    cur: { from, to: new Date(now) },
    prev: { from: prevFrom, to: prevTo },
    label: `1–${d} ${MONTHS[m]}`,
    prevLabel: `1–${prevDay} ${MONTHS[pm.m]}`,
    monthLabel: `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][m]} ${y}`,
  };
}

/** Perubahan persen (dibulatkan); null bila pembanding 0/tidak ada. */
export function pctChange(cur: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined || prev === 0) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 100);
}

export interface RevenueFigures {
  salesRevenue: number;
  salesGrossProfit: number;
  serviceRevenue: number;
  serviceCogs: number;
  buildRevenue: number;
  buildCogs: number;
}

/** Pendapatan semua kanal (penjualan + servis + rakit PC). */
export function totalRevenue(r: RevenueFigures): number {
  return r.salesRevenue + r.serviceRevenue + r.buildRevenue;
}

/** Laba kotor semua kanal = pendapatan − HPP (penjualan, sparepart servis, komponen rakit). */
export function grossProfit(r: RevenueFigures): number {
  return r.salesGrossProfit + (r.serviceRevenue - r.serviceCogs) + (r.buildRevenue - r.buildCogs);
}

/** Porsi pendapatan per kanal (%, total 100 bila ada pendapatan). */
export function revenueSplit(r: RevenueFigures): { sales: number; service: number; build: number } {
  const t = totalRevenue(r);
  if (t <= 0) return { sales: 0, service: 0, build: 0 };
  const sales = Math.round((r.salesRevenue / t) * 100);
  const service = Math.round((r.serviceRevenue / t) * 100);
  return { sales, service, build: Math.max(0, 100 - sales - service) };
}

/** Umur (hari penuh) sejak `at`. */
export function ageDays(at: Date | string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(at).getTime()) / DAY_MS));
}

/** Format ringkas: Rp 41,2 jt / Rp 958 rb / Rp 500. */
export function rupiahShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1_000_000_000) return `${sign}Rp ${(a / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000_000) return `${sign}Rp ${(a / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (a >= 10_000) return `${sign}Rp ${Math.round(a / 1_000).toLocaleString("id-ID")} rb`;
  return `${sign}Rp ${a.toLocaleString("id-ID")}`;
}
