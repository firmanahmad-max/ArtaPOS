/**
 * Garansi Digital + QR — aturan murni (tanpa I/O) agar mudah diuji & dipakai klien +
 * server. Tiap unit ber-SN punya link publik /garansi/<token> (QR di kartu/stiker).
 */

export type WarrantyCardStatus = "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";

export function isWarrantyToken(v: string | null | undefined): v is string {
  return typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
}

export function buildWarrantyUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/garansi/${token}`;
}

/**
 * Progres masa garansi: persen SISA (100 = baru dibeli, 0 = habis) + sisa hari.
 * Tanpa tanggal akhir → null (garansi tanpa batas / tidak bergaransi).
 */
export function warrantyProgress(
  soldAt: Date | string,
  until: Date | string | null,
  now: number,
): { remainingPct: number; daysLeft: number } | null {
  if (!until) return null;
  const start = new Date(soldAt).getTime();
  const end = new Date(until).getTime();
  const span = Math.max(1, end - start);
  const left = Math.max(0, end - now);
  return {
    remainingPct: Math.max(0, Math.min(100, Math.round((left / span) * 100))),
    daysLeft: Math.ceil(left / 86_400_000),
  };
}

/** "1 tahun 2 bulan" / "3 bulan" / "45 hari" — sisa masa garansi untuk tampilan. */
export function remainingText(daysLeft: number): string {
  if (daysLeft <= 0) return "Masa garansi habis";
  if (daysLeft < 60) return `${daysLeft} hari lagi`;
  const months = Math.floor(daysLeft / 30.44);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} tahun` : "", m ? `${m} bulan` : ""].filter(Boolean).join(" ") + " lagi";
}

export const WARRANTY_STATUS_PUBLIC: Record<WarrantyCardStatus, { label: string; tone: "ok" | "muted" | "info" | "bad" }> = {
  ACTIVE: { label: "Garansi Aktif", tone: "ok" },
  EXPIRED: { label: "Garansi Telah Berakhir", tone: "muted" },
  CLAIMED: { label: "Garansi Sudah Diklaim", tone: "info" },
  VOID: { label: "Garansi Dibatalkan", tone: "bad" },
};

/** Masa garansi dalam bulan → "1 tahun" / "6 bulan" / "Tanpa garansi". */
export function periodText(months: number): string {
  if (months <= 0) return "Tanpa garansi";
  if (months % 12 === 0) return `${months / 12} tahun`;
  return `${months} bulan`;
}
