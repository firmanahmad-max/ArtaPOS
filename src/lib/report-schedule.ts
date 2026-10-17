/**
 * Laporan WhatsApp Terjadwal (semi-otomatis) — aturan murni, tanpa I/O, unit-tested.
 * Tidak memakai cron: saat Dashboard dibuka, `dueReportSlots` menentukan periode
 * TERAKHIR tiap jenis laporan yang sudah "jatuh jadwal"; yang belum dikirim/dilewati
 * ditampilkan dengan tombol kirim via WhatsApp 1 klik.
 * Zona tetap WIB (UTC+7, tanpa DST) — helper disalin lokal agar test Node bisa impor.
 */

const OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const TZ = "Asia/Jakarta";
/** Laporan mingguan & bulanan siap mulai jam ini (WIB). */
export const MORNING_HOUR = 7;

export type ReportKind = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ReportScheduleConfig {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  /** Jam (0–23 WIB) laporan harian siap dikirim. */
  dailyHour: number;
}

export interface ReportSlot {
  kind: ReportKind;
  /** Kunci periode unik per jenis: harian/mingguan = tanggal awal "YYYY-MM-DD", bulanan = "YYYY-MM". */
  periodKey: string;
  from: Date;
  to: Date;
  label: string;
  /** Periode pembanding sebelumnya (mingguan & bulanan). */
  prev?: { from: Date; to: Date; label: string };
}

/** Bagian tanggal WIB dari sebuah instant. */
function wib(at: number) {
  const t = new Date(at + OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), dow: t.getUTCDay() };
}
/** Tengah malam WIB (instant UTC) untuk tanggal lokal y-m-d (luapan dinormalkan). */
const midnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d) - OFFSET_MS);
const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (at: Date) => {
  const p = wib(at.getTime());
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
};
const fmt = (at: Date, opts: Intl.DateTimeFormatOptions) => at.toLocaleDateString("id-ID", { ...opts, timeZone: TZ });

function weekLabel(from: Date, to: Date): string {
  const last = new Date(to.getTime() - 1);
  return `${fmt(from, { day: "numeric", month: "short" })} – ${fmt(last, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Periode harian terakhir yang siap: hari ini bila sudah lewat `dailyHour`, selain itu kemarin. */
export function dailySlot(now: number, dailyHour: number): ReportSlot {
  const p = wib(now);
  const back = p.h >= dailyHour ? 0 : 1;
  const from = midnight(p.y, p.m, p.d - back);
  const to = midnight(p.y, p.m, p.d - back + 1);
  return { kind: "DAILY", periodKey: dateKey(from), from, to, label: fmt(from, { dateStyle: "full" }) };
}

/** Minggu (Senin–Minggu) lengkap terakhir; siap mulai Senin jam MORNING_HOUR. */
export function weeklySlot(now: number): ReportSlot {
  const p = wib(now);
  const sinceMonday = (p.dow + 6) % 7; // Senin = 0
  const thisMonday = midnight(p.y, p.m, p.d - sinceMonday);
  const ready = now >= thisMonday.getTime() + MORNING_HOUR * 3_600_000;
  const to = new Date(thisMonday.getTime() - (ready ? 0 : 7 * DAY_MS));
  const from = new Date(to.getTime() - 7 * DAY_MS);
  const prevFrom = new Date(from.getTime() - 7 * DAY_MS);
  return {
    kind: "WEEKLY",
    periodKey: dateKey(from),
    from,
    to,
    label: weekLabel(from, to),
    prev: { from: prevFrom, to: from, label: weekLabel(prevFrom, from) },
  };
}

/** Bulan lengkap terakhir; siap mulai tanggal 1 jam MORNING_HOUR. */
export function monthlySlot(now: number): ReportSlot {
  const p = wib(now);
  const ready = now >= midnight(p.y, p.m, 1).getTime() + MORNING_HOUR * 3_600_000;
  const m = p.m - (ready ? 1 : 2);
  const from = midnight(p.y, m, 1);
  const to = midnight(p.y, m + 1, 1);
  const prevFrom = midnight(p.y, m - 1, 1);
  const f = wib(from.getTime()); // tahun/bulan lokal periode (luapan bulan sudah dinormalkan)
  return {
    kind: "MONTHLY",
    periodKey: `${f.y}-${pad(f.m + 1)}`,
    from,
    to,
    label: fmt(from, { month: "long", year: "numeric" }),
    prev: { from: prevFrom, to: from, label: fmt(prevFrom, { month: "long", year: "numeric" }) },
  };
}

/** Slot laporan aktif sesuai pengaturan (sebelum disaring status kirim/lewati). */
export function dueReportSlots(now: number, cfg: ReportScheduleConfig): ReportSlot[] {
  const out: ReportSlot[] = [];
  if (cfg.daily) out.push(dailySlot(now, cfg.dailyHour));
  if (cfg.weekly) out.push(weeklySlot(now));
  if (cfg.monthly) out.push(monthlySlot(now));
  return out;
}

export function isReportKind(v: unknown): v is ReportKind {
  return v === "DAILY" || v === "WEEKLY" || v === "MONTHLY";
}

/** Slot untuk (jenis, kunci periode) tertentu — divalidasi ulang di server agar tak bisa dipalsukan. */
export function slotFor(kind: ReportKind, periodKey: string, now: number, cfg: ReportScheduleConfig): ReportSlot | null {
  const s = dueReportSlots(now, { ...cfg, daily: true, weekly: true, monthly: true }).find((x) => x.kind === kind);
  return s && s.periodKey === periodKey ? s : null;
}

export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  DAILY: "Laporan Harian",
  WEEKLY: "Laporan Mingguan",
  MONTHLY: "Laporan Bulanan",
};

// ── Isi laporan ──────────────────────────────────────────────────────────────

/** Angka keuangan yang dipakai laporan (subset FinanceReport). */
export interface ReportFigures {
  salesRevenue: number;
  salesGrossProfit: number;
  salesCount: number;
  serviceRevenue: number;
  serviceCount: number;
  buildRevenue: number;
  buildCount: number;
  purchaseTotal: number;
  expenseTotal: number;
  estimatedNet: number;
}

/** Kondisi operasional saat laporan dibuat (snapshot "sekarang"). */
export interface ReportOps {
  activeService: number;
  readyService: number;
  outOfStock: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface ReportTextInput {
  kind: ReportKind;
  storeName: string;
  periodLabel: string;
  cur: ReportFigures;
  prev?: ReportFigures | null;
  prevLabel?: string;
  top?: { name: string; qty: number }[];
  ops?: ReportOps | null;
}

export function rupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

/** Perubahan vs periode sebelumnya: "▲ 12%" / "▼ 5%" / "baru" / "" (tanpa pembanding). */
export function deltaText(cur: number, prev: number | undefined | null): string {
  if (prev === undefined || prev === null) return "";
  if (prev === 0) return cur > 0 ? " (baru)" : "";
  // Bulatkan nilai mutlak → naik/turun dibulatkan simetris (−12,5% = ▼ 13%, bukan 12%).
  const pct = Math.round((Math.abs(cur - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return " (= 0%)";
  return cur > prev ? ` (▲ ${pct}%)` : ` (▼ ${pct}%)`;
}

export function buildScheduledReportText(r: ReportTextInput): string {
  const line = "────────────────";
  const c = r.cur;
  const p = r.prev ?? undefined;
  const rows = [`*${r.storeName}*`, `📊 ${REPORT_KIND_LABEL[r.kind]}`, r.periodLabel, line];
  const omzet = c.salesRevenue + c.serviceRevenue + c.buildRevenue;
  const pOmzet = p ? p.salesRevenue + p.serviceRevenue + p.buildRevenue : undefined;
  rows.push(`💰 *Total pendapatan: ${rupiah(omzet)}*${deltaText(omzet, pOmzet)}`);
  rows.push(`🛒 Penjualan: ${rupiah(c.salesRevenue)} · ${c.salesCount} transaksi${deltaText(c.salesRevenue, p?.salesRevenue)}`);
  rows.push(`   • Laba kotor: ${rupiah(c.salesGrossProfit)}`);
  rows.push(`🔧 Servis: ${rupiah(c.serviceRevenue)} · ${c.serviceCount} tiket${deltaText(c.serviceRevenue, p?.serviceRevenue)}`);
  if (c.buildCount > 0 || (p && p.buildCount > 0))
    rows.push(`🖥️ Rakit PC: ${rupiah(c.buildRevenue)} · ${c.buildCount} rakitan`);
  rows.push(`📦 Pembelian stok: ${rupiah(c.purchaseTotal)}`);
  rows.push(`💸 Biaya operasional: ${rupiah(c.expenseTotal)}`);
  rows.push(line);
  rows.push(`*Estimasi laba bersih: ${rupiah(c.estimatedNet)}*${deltaText(c.estimatedNet, p?.estimatedNet)}`);
  if (p && r.prevLabel) rows.push(`_Pembanding: ${r.prevLabel}_`);
  if (r.top && r.top.length > 0) {
    rows.push(line, "🏆 Terlaris:");
    r.top.forEach((t, i) => rows.push(`${i + 1}. ${t.name} (${t.qty}×)`));
  }
  if (r.ops) {
    const o = r.ops;
    const ops: string[] = [];
    if (o.activeService > 0 || o.readyService > 0)
      ops.push(`🔧 Servis aktif: ${o.activeService}${o.readyService > 0 ? ` · ${o.readyService} siap diambil` : ""}`);
    if (o.overdueCount > 0) ops.push(`⏰ Piutang lewat tempo: ${o.overdueCount} (${rupiah(o.overdueAmount)})`);
    if (o.outOfStock > 0) ops.push(`📉 Stok habis: ${o.outOfStock} produk`);
    if (ops.length > 0) rows.push(line, "Perlu perhatian:", ...ops);
  }
  rows.push("", "_Dikirim dari ArtaPOS_");
  return rows.join("\n");
}
