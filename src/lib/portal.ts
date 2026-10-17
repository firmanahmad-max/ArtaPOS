/**
 * Portal Pelanggan — aturan murni (tanpa I/O), unit-tested.
 * Link pribadi: /member/<token>. "Rekam medis" = riwayat servis dikelompokkan per perangkat.
 */

/** Token link pribadi: ≥ 24 karakter base64url (dihasilkan server, 192-bit acak). */
export function isPortalToken(v: string | null | undefined): v is string {
  return !!v && /^[A-Za-z0-9_-]{24,64}$/.test(v);
}

/** Asal tautan portal (`?ref=`) — untuk statistik kanal mana yang paling sering dibuka. */
export type PortalRef = "struk" | "nota" | "pengingat" | "undangan";

export function buildPortalUrl(origin: string, token: string, ref?: PortalRef): string {
  const base = `${origin.replace(/\/+$/, "")}/member/${token}`;
  return ref ? `${base}?ref=${ref}` : base;
}

/** Jenis kunjungan portal (dicerminkan enum Prisma `LinkVisitKind` PORTAL_*). */
export const PORTAL_VISIT_KINDS = [
  "PORTAL_FROM_RECEIPT",
  "PORTAL_FROM_SERVICE",
  "PORTAL_FROM_REMINDER",
  "PORTAL_FROM_INVITE",
  "PORTAL_DIRECT",
] as const;
export type PortalVisitKind = (typeof PORTAL_VISIT_KINDS)[number];

const PORTAL_REF_KIND: Record<PortalRef, PortalVisitKind> = {
  struk: "PORTAL_FROM_RECEIPT",
  nota: "PORTAL_FROM_SERVICE",
  pengingat: "PORTAL_FROM_REMINDER",
  undangan: "PORTAL_FROM_INVITE",
};

/** `ref` tak dikenal / kosong → dibuka langsung (bookmark, diteruskan, dsb.). */
export function portalRefKind(ref?: unknown): PortalVisitKind {
  return typeof ref === "string" && Object.hasOwn(PORTAL_REF_KIND, ref)
    ? PORTAL_REF_KIND[ref as PortalRef]
    : "PORTAL_DIRECT";
}

export interface PortalStats {
  /** Member dengan link portal aktif. */
  linked: number;
  /** Member (link aktif) yang pernah membuka portal. */
  opened: number;
  /** % member ber-link yang pernah membuka (0–100, dibulatkan). */
  openRate: number;
  /** Member yang membuka portal sejak `since`. */
  activeRecent: number;
  /** Total kunjungan dalam periode + rincian per asal tautan. */
  visits: number;
  byChannel: { receipt: number; service: number; reminder: number; invite: number; direct: number };
}

/**
 * Ringkasan statistik portal: `members` = pelanggan aktif (link & penghitung),
 * `rows` = penghitung harian kunjungan dalam periode, `since` = awal periode.
 */
export function summarizePortalStats(
  members: { portalToken: string | null; portalViews: number; portalLastSeenAt: Date | null }[],
  rows: { kind: string; count: number }[],
  since: Date,
): PortalStats {
  const withLink = members.filter((m) => m.portalToken);
  const opened = withLink.filter((m) => m.portalViews > 0).length;
  const sum = (k: PortalVisitKind) => rows.reduce((a, r) => (r.kind === k ? a + r.count : a), 0);
  const byChannel = {
    receipt: sum("PORTAL_FROM_RECEIPT"),
    service: sum("PORTAL_FROM_SERVICE"),
    reminder: sum("PORTAL_FROM_REMINDER"),
    invite: sum("PORTAL_FROM_INVITE"),
    direct: sum("PORTAL_DIRECT"),
  };
  return {
    linked: withLink.length,
    opened,
    openRate: withLink.length ? Math.round((opened / withLink.length) * 100) : 0,
    activeRecent: members.filter((m) => m.portalLastSeenAt && m.portalLastSeenAt >= since).length,
    visits: Object.values(byChannel).reduce((a, b) => a + b, 0),
    byChannel,
  };
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
