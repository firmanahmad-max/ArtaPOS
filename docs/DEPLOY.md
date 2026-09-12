# Runbook Deploy Produksi — ArtaPOS

Panduan langkah-langkah untuk merilis ArtaPOS ke produksi.

**Arsitektur produksi:** Vercel (aplikasi Next.js) + Supabase (PostgreSQL, region Tokyo).

- **Kode** ter-deploy **otomatis** oleh Vercel setiap ada push ke branch `main`.
- **Migrasi database dijalankan MANUAL** lewat **Supabase → SQL Editor**. Laptop
  pengembang tidak bisa terhubung langsung ke Supabase (`prisma migrate deploy`
  gagal "tenant not found"), jadi setiap perubahan skema diterapkan dengan
  menempelkan SQL ke SQL Editor. Runtime aplikasi (Vercel) hanya butuh **skema DB
  yang cocok** — tidak menjalankan migrasi, sehingga tabel `_prisma_migrations`
  tidak wajib sinkron.

---

## Alur deploy singkat

1. **Pra-rilis (di laptop):** pastuhkan kualitas.
   ```bash
   npm run typecheck && npm test && npm run build
   ```
   Ketiganya harus lolos. `npm run build` = gerbang yang sama dengan Vercel.

2. **Push kode:**
   ```bash
   git push origin main
   ```
   Vercel otomatis membangun & merilis commit tersebut. Cek statusnya di dashboard Vercel.

3. **Terapkan migrasi DB (bila ada perubahan skema)** di Supabase → SQL Editor —
   lihat bagian [Migrasi database](#migrasi-database). Lakukan **sebelum atau tepat
   setelah** build Vercel selesai agar kode & skema cocok. SQL ditulis **idempoten**
   (aman diulang) sehingga tak masalah bila sebagian sudah pernah dijalankan.

4. **Verifikasi env vars** di Vercel (lihat [Environment variables](#environment-variables)).

5. **Smoke test** setelah rilis (lihat [Smoke test](#smoke-test-pasca-deploy)).

> **Kapan butuh migrasi?** Hanya bila ada perubahan pada `prisma/schema.prisma`
> (kolom/tabel/enum baru). Perubahan yang murni kode (UI, teks, logika, header) **tidak**
> butuh migrasi. Tiap migrasi punya folder di `prisma/migrations/<timestamp>_<nama>/`.

---

## Migrasi database

### Cara kerja
Setiap folder di `prisma/migrations/` berisi `migration.sql`. Untuk produksi,
salin isi migrasi yang **belum** diterapkan ke Supabase SQL Editor. Bila ragu apakah
sudah diterapkan, gunakan versi **idempoten** (dengan `IF NOT EXISTS` / guard `DO $$`)
agar aman dijalankan berulang.

### Verifikasi apakah sebuah kolom/tabel sudah ada
```sql
-- Contoh cek kolom
SELECT column_name FROM information_schema.columns
WHERE table_name = 'service_tickets' AND column_name = 'discount';
-- Contoh cek tabel
SELECT to_regclass('public.build_simulations');
```

### Konsolidasi migrasi fitur terbaru (idempoten)
Mencakup: **Simulasi Rakitan** (`20260824000000_add_build_simulations`),
**Diskon Servis** (`20260825000000_add_service_discount`),
**Diskon Rakit PC** (`20260826000000_add_build_discount`).
Aman dijalankan sekali walau sebagian sudah pernah diterapkan.

```sql
-- 1) Enum SimStatus
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SimStatus') THEN
    CREATE TYPE "SimStatus" AS ENUM ('DRAFT','SENT','APPROVED','IMPORTED','REJECTED');
  END IF;
END $$;

-- 2) pc_build_items: komponen non-inventory + tanda stok dialokasikan
ALTER TABLE "pc_build_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "pc_build_items" ADD COLUMN IF NOT EXISTS "stockApplied" BOOLEAN NOT NULL DEFAULT true;

-- 3) Tabel simulasi rakitan
CREATE TABLE IF NOT EXISTS "build_simulations" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "number" TEXT NOT NULL, "name" TEXT NOT NULL,
  "customerId" TEXT, "customerName" TEXT, "customerPhone" TEXT,
  "budget" INTEGER NOT NULL DEFAULT 0, "buildFee" INTEGER NOT NULL DEFAULT 0,
  "status" "SimStatus" NOT NULL DEFAULT 'DRAFT', "note" TEXT, "importedBuildId" TEXT,
  "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "build_simulations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "build_simulation_items" (
  "id" TEXT NOT NULL, "simulationId" TEXT NOT NULL, "productId" TEXT, "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 1, "costPrice" INTEGER NOT NULL DEFAULT 0,
  "sellPrice" INTEGER NOT NULL DEFAULT 0, "subtotal" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "build_simulation_items_pkey" PRIMARY KEY ("id")
);

-- 4) Index
CREATE INDEX IF NOT EXISTS "build_simulations_tenantId_idx" ON "build_simulations"("tenantId");
CREATE INDEX IF NOT EXISTS "build_simulations_tenantId_status_idx" ON "build_simulations"("tenantId","status");
CREATE UNIQUE INDEX IF NOT EXISTS "build_simulations_tenantId_number_key" ON "build_simulations"("tenantId","number");
CREATE INDEX IF NOT EXISTS "build_simulation_items_simulationId_idx" ON "build_simulation_items"("simulationId");

-- 5) Foreign key
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='build_simulations_tenantId_fkey') THEN
    ALTER TABLE "build_simulations" ADD CONSTRAINT "build_simulations_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='build_simulation_items_simulationId_fkey') THEN
    ALTER TABLE "build_simulation_items" ADD CONSTRAINT "build_simulation_items_simulationId_fkey"
      FOREIGN KEY ("simulationId") REFERENCES "build_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) Kolom diskon
ALTER TABLE "service_tickets" ADD COLUMN IF NOT EXISTS "discount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pc_builds"       ADD COLUMN IF NOT EXISTS "discount" INTEGER NOT NULL DEFAULT 0;
```

Verifikasi (harus mengembalikan nama kedua tabel + tiga angka `1`):
```sql
SELECT to_regclass('public.build_simulations') AS sim_table,
       to_regclass('public.build_simulation_items') AS sim_items,
       (SELECT 1 FROM information_schema.columns WHERE table_name='pc_build_items'  AND column_name='stockApplied') AS stock_applied,
       (SELECT 1 FROM information_schema.columns WHERE table_name='service_tickets' AND column_name='discount')     AS svc_discount,
       (SELECT 1 FROM information_schema.columns WHERE table_name='pc_builds'       AND column_name='discount')     AS build_discount;
```

### Untuk migrasi baru di masa depan
1. Di laptop: `npm run db:migrate` (membuat folder migrasi + menerapkan ke DB lokal).
2. Buka `prisma/migrations/<baru>/migration.sql`, salin isinya.
3. Jadikan idempoten bila perlu (`ADD COLUMN IF NOT EXISTS`, guard `DO $$` untuk
   `CREATE TYPE` & `ADD CONSTRAINT`, `CREATE TABLE/INDEX IF NOT EXISTS`).
4. Tempel & jalankan di Supabase SQL Editor, lalu verifikasi.

---

## Environment variables

Wajib ada di Vercel (Project Settings → Environment Variables). Tidak ada yang baru
belakangan ini — cukup pastikan lengkap:

| Variable | Fungsi |
|---|---|
| `DATABASE_URL` | Koneksi runtime (Supabase **transaction pooler**, port 6543). |
| `DIRECT_URL` | Untuk migrasi (Supabase **session pooler**, port 5432). Tak dipakai runtime Vercel. |
| `AUTH_SECRET` | Kunci tanda tangan sesi JWT. **Min 32 karakter.** Jangan diubah sembarangan (mengubahnya me-logout semua pengguna). |
| `SUPER_ADMIN_EMAILS` | Email admin platform (dipisah koma). Dipakai hanya untuk **bootstrap** flag `isSuperAdmin` saat login. |
| `DB_POOL_MAX` | Batas koneksi pool per-instance (mis. `3`) — cegah "too many connections" di Supabase. |

> **Keamanan (perubahan terbaru):** otorisasi admin platform sekarang murni dari flag
> DB `isSuperAdmin`, bukan email env. Akun admin yang sudah pernah login tetap aman.
> Akun admin yang **belum** pernah login sejak perubahan cukup login sekali (email di
> `SUPER_ADMIN_EMAILS` & unik global) agar flag ter-set.

---

## Smoke test pasca-deploy

Setelah build Vercel selesai **dan** migrasi diterapkan:

1. `GET /api/health` → `{"status":"ok","database":"connected", ...}`.
2. Login sebagai OWNER/ADMIN → dashboard tampil.
3. Buka **/simulations** → buat 1 simulasi (butuh migrasi build_simulations).
4. Buka 1 tiket **Servis** → isi **Diskon** → total menyesuaikan (butuh kolom diskon).
5. Buka 1 **Rakit PC** → isi **Diskon** → total menyesuaikan.
6. Cek 1 transaksi POS berjalan normal (potong stok + struk).

---

## Catatan operasional

- **CSP nonce:** sejak hardening keamanan, `src/proxy.ts` menyetel CSP berbasis nonce
  per-request. Konsekuensinya seluruh halaman **dynamic-rendered** (tanpa cache statis).
  Ini disengaja; tidak memblokir deploy. Jangan tambahkan `Content-Security-Policy`
  statis di `next.config.ts` (bentrok dengan nonce).
- **Rollback:** revert commit lalu `git push` (Vercel merilis versi sebelumnya).
  Migrasi database **tidak** otomatis ikut mundur — hindari perubahan skema yang
  merusak (destructive); kolom baru dengan `DEFAULT` aman untuk rollback kode.
- **Rekonsiliasi stok:** bila curiga cache stok melenceng, jalankan
  `npm run stock:reconcile` (dry-run) dari laptop yang terhubung ke DB target.
- **Referensi:** daftar fitur & migrasi ada di `CLAUDE.md` (bagian "Fitur tambahan").
