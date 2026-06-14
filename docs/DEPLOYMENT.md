# Panduan Deploy ArtaPOS (Supabase + Vercel)

ArtaPOS = Next.js 16 + PostgreSQL (Prisma 7). Rekomendasi hosting termurah & termudah:
**Database → Supabase**, **Aplikasi → Vercel** (HTTPS otomatis; penting untuk kamera & Bluetooth).

Repo sudah disiapkan: `postinstall: prisma generate` (Vercel akan generate Prisma Client saat
build), halaman yang mengakses DB sudah `force-dynamic` (tidak butuh DB saat build).

---

## Langkah 1 — Database di Supabase
1. Buat akun di https://supabase.com → **New project** (pilih region terdekat, mis. Singapore).
   Catat **Database Password** yang Anda buat.
2. Buka **Project Settings → Database → Connection string**. Ambil dua URL:
   - **DATABASE_URL** = mode **Connection pooling / Transaction** (host `...pooler.supabase.com`, port **6543**).
     Tambahkan akhiran: `?pgbouncer=true`
   - **DIRECT_URL** = koneksi **Direct** (port **5432**) — dipakai khusus untuk migration.
   Ganti `[YOUR-PASSWORD]` dengan password DB Anda di kedua URL.

   Contoh:
   ```
   DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

## Langkah 2 — Terapkan skema ke Supabase (sekali)
Di komputer Anda, sementara set `.env` ke nilai Supabase di atas, lalu:
```bash
npm run db:deploy     # menjalankan prisma migrate deploy → membuat semua tabel
```
Setelah selesai, kembalikan `.env` ke nilai lokal jika ingin lanjut dev lokal.
> Alternatif: jalankan langkah ini lewat terminal mana pun yang punya `DATABASE_URL`/`DIRECT_URL`
> Supabase di environment-nya.

## Langkah 3 — Generate AUTH_SECRET untuk produksi
Buat secret BARU (jangan pakai yang dev):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Simpan hasilnya untuk dipakai di Vercel.

## Langkah 4 — Deploy ke Vercel
1. Buat akun di https://vercel.com (login dengan GitHub).
2. **Add New → Project → Import** repo `firmanahmad-max/ArtaPOS`.
3. Framework akan terdeteksi otomatis **Next.js**. Biarkan Build & Install Command default.
4. Buka **Environment Variables**, tambahkan (untuk Production):
   | Name | Value |
   |---|---|
   | `DATABASE_URL` | URL pooler Supabase (port 6543, `?pgbouncer=true`) |
   | `DIRECT_URL` | URL direct Supabase (port 5432) |
   | `AUTH_SECRET` | hasil generate di Langkah 3 |
   | `TZ` | `Asia/Jakarta` (penting — lihat catatan Zona Waktu) |
5. Klik **Deploy**. Tunggu build selesai.

> **Zona waktu (TZ):** server Vercel berjalan di UTC. Tanpa `TZ=Asia/Jakarta`,
> tanggal/jam yang dirender di sisi-server (mis. riwayat penjualan, shift) tampil
> 7 jam lebih awal. Batas hari pada *laporan keuangan & tren* sudah dihitung
> eksplisit di WIB (benar tanpa env ini), tetapi set `TZ` tetap disarankan agar
> SEMUA tampilan tanggal konsisten. Untuk WITA/WIT ganti nilainya
> (`Asia/Makassar` / `Asia/Jayapura`).

## Langkah 5 — Pakai aplikasinya
1. Buka URL Vercel (mis. `https://arta-pos.vercel.app`).
2. Anda akan diarahkan ke **wizard setup** → buat toko & akun pemilik pertama.
3. Selesai — aplikasi siap dipakai online. PWA dapat di-install dari browser; kamera (scan
   barcode) & Web Bluetooth (print) aktif karena HTTPS.

---

## Catatan
- **Migration berikutnya**: setiap kali skema berubah, jalankan `npm run db:deploy` terhadap
  Supabase (atau jadikan langkah CI), lalu Vercel redeploy otomatis saat `git push`.
- **Custom domain**: bisa ditambahkan di Vercel → Settings → Domains.
- **Keamanan**: rate-limit login bawaan tahan-lama (tabel `LoginAttempt` di Postgres),
  konsisten lintas instance serverless. 8 percobaan gagal / 5 menit → kunci 15 menit.
- **Jika ada error koneksi DB di serverless**: pastikan DATABASE_URL memakai pooler (6543).
  Bila perlu, coba mode **Session** pooler dari Supabase.
- **Alternatif DB**: Neon (https://neon.tech) juga kompatibel — pola `DATABASE_URL` (pooled) +
  `DIRECT_URL` (direct) sama.
- **Alternatif hosting**: VPS (Node 20+) dengan `npm run build && npm run start` di balik
  reverse proxy (Nginx) + sertifikat HTTPS.
