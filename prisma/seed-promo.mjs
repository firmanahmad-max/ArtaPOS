/**
 * Seed KODE PROMO ArtaPOS — membuat/menyegarkan kode aktivasi skema pricing.
 * Idempoten: ON CONFLICT (code) DO UPDATE — konfigurasi diperbarui, jumlah
 * penukaran (redemptionsUsed) TIDAK direset.
 *
 * Jalankan:  node prisma/seed-promo.mjs   (atau: npm run seed:promo)
 *   - Lokal   : DATABASE_URL menunjuk localhost (default .env).
 *   - Produksi: set DATABASE_URL ke Supabase (pooler 6543) sebelum menjalankan.
 *               (Bila laptop tak bisa menjangkau Supabase, pakai SQL setara di
 *                Supabase SQL Editor — lihat komentar di bawah.)
 *
 * Semua kode: plan UNLIMITED (akses penuh). durationDays = lama masa berlaku
 * yang ditambahkan saat ditukar (menumpuk dari sisa masa aktif). maxRedemptions
 * = kuota total (null = tak terbatas). Lihat src/lib/pricing.ts & /harga.
 */
import "dotenv/config";
import pg from "pg";
import { randomUUID } from "node:crypto";

const { Client } = pg;
const url = process.env.DATABASE_URL || "";
if (!url) {
  console.error("DATABASE_URL kosong. Set dulu di .env (lokal) atau ke Supabase (produksi).");
  process.exit(1);
}
const isLocal = /(localhost|127\.0\.0\.1)/.test(url);
const c = new Client({ connectionString: url, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

/** Daftar kode. duration=hari, quota=maxRedemptions (null=tak terbatas). */
const CODES = [
  { code: "PENDIRI10", duration: 180, quota: 10, note: "Angkatan Pendiri — 10 toko pertama (komitmen 6 bulan). Harga dikunci." },
  { code: "EARLY50", duration: 180, quota: 40, note: "Early Adopter — 40 toko berikutnya (tarif perkenalan)." },
  { code: "AJAKMASUK", duration: 30, quota: null, note: "Referral — bonus 1 bulan untuk toko baru hasil rujukan (ditumpuk)." },
  { code: "MITRA-CONTOH", duration: 180, quota: null, note: "Template kode Mitra/Reseller — klon per mitra (mis. MITRA-BUDI) untuk atribusi." },
];

const SQL = `
INSERT INTO "promo_codes"
  ("id","code","plan","durationDays","maxRedemptions","redemptionsUsed","isActive","note","createdAt","updatedAt")
VALUES ($1,$2,'UNLIMITED'::"LicensePlan",$3,$4,0,true,$5,now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "plan" = EXCLUDED."plan",
  "durationDays" = EXCLUDED."durationDays",
  "maxRedemptions" = EXCLUDED."maxRedemptions",
  "isActive" = true,
  "note" = EXCLUDED."note",
  "updatedAt" = now()
RETURNING "code","durationDays","maxRedemptions","redemptionsUsed";
`;

async function main() {
  await c.connect();
  console.log(`Menyambung ke ${isLocal ? "DB lokal" : "DB remote"}…`);
  for (const k of CODES) {
    const r = await c.query(SQL, [randomUUID(), k.code, k.duration, k.quota, k.note]);
    const row = r.rows[0];
    const kuota = row.maxRedemptions == null ? "∞" : `${row.redemptionsUsed}/${row.maxRedemptions}`;
    console.log(`  ✓ ${row.code.padEnd(14)} durasi ${String(row.durationDays).padStart(3)} hari · kuota ${kuota}`);
  }
  console.log("Selesai. Kode siap ditukar di Pengaturan → Lisensi.");
}

main()
  .catch((e) => { console.error("Gagal:", e.message); process.exitCode = 1; })
  .finally(() => c.end());

/*
-- ── SQL setara untuk Supabase SQL Editor (produksi) ──
-- Jalankan sekali; aman diulang (ON CONFLICT). Ganti "MITRA-CONTOH" per mitra.
INSERT INTO "promo_codes" ("id","code","plan","durationDays","maxRedemptions","redemptionsUsed","isActive","note","createdAt","updatedAt")
VALUES
  (gen_random_uuid()::text,'PENDIRI10','UNLIMITED'::"LicensePlan",180,10,0,true,'Angkatan Pendiri — 10 toko pertama',now(),now()),
  (gen_random_uuid()::text,'EARLY50','UNLIMITED'::"LicensePlan",180,40,0,true,'Early Adopter — 40 toko berikutnya',now(),now()),
  (gen_random_uuid()::text,'AJAKMASUK','UNLIMITED'::"LicensePlan",30,NULL,0,true,'Referral — bonus 1 bulan toko baru',now(),now()),
  (gen_random_uuid()::text,'MITRA-CONTOH','UNLIMITED'::"LicensePlan",180,NULL,0,true,'Template kode Mitra — klon per mitra',now(),now())
ON CONFLICT ("code") DO UPDATE SET
  "durationDays"=EXCLUDED."durationDays","maxRedemptions"=EXCLUDED."maxRedemptions",
  "isActive"=true,"note"=EXCLUDED."note","updatedAt"=now();
*/
