/**
 * Portal Pelanggan — aturan murni (tanpa I/O), unit-tested.
 * Link pribadi: /member/<token>. "Rekam medis" = riwayat servis dikelompokkan per perangkat.
 */

/** Token link pribadi: ≥ 24 karakter base64url (dihasilkan server, 192-bit acak). */
export function isPortalToken(v: string | null | undefined): v is string {
  return !!v && /^[A-Za-z0-9_-]{24,64}$/.test(v);
}

export function buildPortalUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/member/${token}`;
}

/** Kunci perangkat: jenis + merk + model, dinormalisasi (huruf kecil, spasi tunggal). */
export function deviceKey(type: string | null | undefined, brand?: string | null, info?: string | null): string {
  return [type, brand, info]
    .map((s) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("|");
}

export function deviceLabel(type: string | null | undefined, brand?: string | null, info?: string | null): string {
  return [type, brand, info].map((s) => (s ?? "").trim()).filter(Boolean).join(" ") || "Perangkat";
}

export interface DeviceTicket {
  id: string;
  deviceType: string;
  deviceBrand: string | null;
  deviceInfo: string | null;
  at: Date;
}

/** Kelompokkan tiket per perangkat; grup & isi diurutkan terbaru dulu. */
export function groupByDevice<T extends DeviceTicket>(tickets: T[]): { key: string; label: string; tickets: T[] }[] {
  const map = new Map<string, { key: string; label: string; tickets: T[] }>();
  for (const t of tickets) {
    const key = deviceKey(t.deviceType, t.deviceBrand, t.deviceInfo) || `t:${t.id}`;
    const g = map.get(key) ?? { key, label: deviceLabel(t.deviceType, t.deviceBrand, t.deviceInfo), tickets: [] };
    g.tickets.push(t);
    map.set(key, g);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.tickets.sort((a, b) => b.at.getTime() - a.at.getTime());
    const latest = g.tickets[0];
    g.label = deviceLabel(latest.deviceType, latest.deviceBrand, latest.deviceInfo); // penulisan terbaru
  }
  return groups.sort((a, b) => b.tickets[0].at.getTime() - a.tickets[0].at.getTime());
}

/**
 * Jadwal perawatan berikutnya per jasa berkala pada satu perangkat:
 * ambil servis TERAKHIR tiap jasa → tanggal + interval (fungsi `addMonths` diinjeksi).
 */
export function nextMaintenance(
  done: { catalogItemId: string; name: string; intervalMonths: number; at: Date }[],
  addMonths: (d: Date, months: number) => Date,
): { catalogItemId: string; name: string; lastAt: Date; dueAt: Date }[] {
  const last = new Map<string, { catalogItemId: string; name: string; intervalMonths: number; at: Date }>();
  for (const d of done) {
    if (d.intervalMonths <= 0) continue;
    const cur = last.get(d.catalogItemId);
    if (!cur || d.at > cur.at) last.set(d.catalogItemId, d);
  }
  return [...last.values()]
    .map((d) => ({ catalogItemId: d.catalogItemId, name: d.name, lastAt: d.at, dueAt: addMonths(d.at, d.intervalMonths) }))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
