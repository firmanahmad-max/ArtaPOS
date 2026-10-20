/**
 * Barang titipan berupa PAKET/SET — murni (tanpa I/O) agar mudah diuji & dipakai
 * klien + server. Satu paket = satu ConsignmentItem (satu harga, komisi, status);
 * isinya hanya rincian (bukti serah-terima & info pembeli), TANPA harga per komponen.
 */

export interface SetComponent {
  name: string;
  serialNumber?: string | null;
  note?: string | null;
}

export const MAX_SET_COMPONENTS = 20;
/** Paket minimal berisi 2 komponen (1 komponen = barang tunggal biasa). */
export const MIN_SET_COMPONENTS = 2;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Baca kolom JSON `components` dengan aman (data rusak/lama → []). Juga dipakai
 * merapikan isian form: baris tanpa nama dibuang, spasi & panjang dirapikan.
 */
export function parseComponents(raw: unknown): SetComponent[] {
  if (!Array.isArray(raw)) return [];
  const out: SetComponent[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const name = str(o.name, 120);
    if (!name) continue;
    const serialNumber = str(o.serialNumber, 60) || null;
    const note = str(o.note, 120) || null;
    out.push({ name, serialNumber, note });
    if (out.length >= MAX_SET_COMPONENTS) break;
  }
  return out;
}

/** Pesan galat bila jumlah komponen tak valid (null = valid). */
export function componentsError(list: SetComponent[]): string | null {
  if (list.length === 0) return null;
  if (list.length < MIN_SET_COMPONENTS) {
    return `Paket minimal ${MIN_SET_COMPONENTS} komponen — atau kosongkan rincian agar jadi barang tunggal.`;
  }
  if (list.length > MAX_SET_COMPONENTS) return `Paket maksimal ${MAX_SET_COMPONENTS} komponen.`;
  return null;
}

export const isSet = (list: SetComponent[]) => list.length > 0;

/** "Monitor LG 24MK600 (SN: ABC123)" — satu baris komponen. */
export function componentLabel(c: SetComponent, withSerial = true): string {
  return withSerial && c.serialNumber ? `${c.name} (SN: ${c.serialNumber})` : c.name;
}

/** Ringkasan isi untuk baris struk/kasir, mis. "isi: CPU Ryzen 5, Monitor LG 24\", Keyboard". */
export function setContentsText(list: SetComponent[]): string {
  return list.length ? `isi: ${list.map((c) => c.name).join(", ")}` : "";
}

/** Nama baris penjualan (tercetak di struk). Paket → nama + daftar isi. */
export function consignmentSaleName(category: string, name: string, components: SetComponent[]): string {
  const base = `${category} ${name}`.trim();
  return components.length ? `${base} — ${setContentsText(components)}` : base;
}

/** Semua no. seri komponen (untuk scan di kasir). */
export function setSerials(list: SetComponent[]): string[] {
  return list.map((c) => c.serialNumber ?? "").filter(Boolean);
}

/** Deskripsi Galeri Publik: daftar isi paket + kondisi. */
export function setGallerySpec(components: SetComponent[], condition?: string | null): string | null {
  const parts: string[] = [];
  if (components.length) {
    parts.push(
      ["Isi paket:", ...components.map((c) => `• ${c.name}${c.note ? ` — ${c.note}` : ""}`)].join("\n"),
    );
  }
  if (condition?.trim()) parts.push(components.length ? `Kondisi: ${condition.trim()}` : condition.trim());
  return parts.length ? parts.join("\n\n") : null;
}
