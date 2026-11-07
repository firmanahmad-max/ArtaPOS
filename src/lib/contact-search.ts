/**
 * Pencarian kontak (pelanggan/supplier) — murni, dipakai klien (saring instan) &
 * server (kunci No. HP). No. HP dicocokkan pada digitnya saja dengan 0… ≡ 62…,
 * jadi "0812 3456", "+62 812-3456" & "812345" saling menemukan.
 */

export interface SearchableContact {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

/** Digit No. HP dengan awalan 0 / 62 dibuang (bentuk inti untuk dicocokkan). */
export function phoneCore(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.startsWith("62")) return d.slice(2);
  if (d.startsWith("0")) return d.slice(1);
  return d;
}

/** Semua kata kunci harus cocok (nama/email/alamat), atau digitnya cocok di No. HP. */
export function matchContact(c: SearchableContact, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  // Kueri berupa nomor (≥3 digit, tanpa huruf) → cocokkan ke No. HP.
  if (digits.length >= 3 && !/[a-z]/.test(q)) {
    const core = phoneCore(digits);
    return !!core && phoneCore(c.phone).includes(core);
  }
  const hay = [c.name, c.email, c.address, c.phone].filter(Boolean).join(" ").toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
