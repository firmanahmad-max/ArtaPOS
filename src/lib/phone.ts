/**
 * Kunci No. HP ternormalisasi (format 62…, hanya digit) — dipakai mencocokkan tiket /
 * rakitan dengan pelanggan terdaftar. Murni, unit-tested. Selaras dengan backfill SQL
 * di migrasi `customer_link_service_reminders`.
 */
export function phoneKey(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

/** Nama unik untuk member baru bila nama sudah dipakai: "Budi (…7802)". */
export function disambiguatedName(name: string, phone: string | null | undefined): string {
  const tail = (phone ?? "").replace(/\D/g, "").slice(-4);
  return tail ? `${name} (…${tail})` : `${name} (baru)`;
}
