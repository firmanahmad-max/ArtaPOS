# Arta

**Dibangun untuk Toko Komputer Indonesia.**

Aplikasi manajemen toko komputer yang lengkap: penjualan (POS), pembelian, inventory,
utang/piutang, jasa servis, rakit PC, hingga laporan keuangan. Multi-tenant (siap jadi SaaS),
responsive (desktop + tablet/HP), tema terang/gelap, scan barcode, print struk Bluetooth,
dan kirim laporan ke WhatsApp.

## Fitur Utama
- **POS / Penjualan** — keranjang, scan barcode, diskon (transaksi & per item), pembayaran
  tunai/transfer/QRIS/kredit, kembalian, struk printable + **print Bluetooth ESC/POS**,
  tahan transaksi, shift kasir.
- **Inventory** — produk, kategori, satuan, stok + mutasi (audit), stok opname, barcode
  (scan kamera/USB + cetak label), import massal CSV, saran pembelian (reorder).
- **Pembelian & Utang** · **Piutang** (penjualan kredit + cicilan).
- **Jasa Servis** — tiket, workflow status, sparepart (potong stok), foto kondisi,
  lacak status online untuk pelanggan + notifikasi WhatsApp.
- **Rakit PC** — komponen + jasa rakit.
- **Keuangan** — biaya, laba-rugi per periode, kirim laporan ke WhatsApp.
- **Garansi & Nomor Seri**, **Membership & Poin Loyalitas**, **Dashboard Analitik**,
  **Retur penjualan sebagian**.
- **Multi-user + RBAC** (Pemilik/Admin/Kasir/Teknisi), **Lisensi/Demo** (harian/bulanan/
  batas transaksi/unlimited).

## Stack
Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS v4 · PostgreSQL · Prisma 7
(driver adapter) · auth kustom (jose + argon2).

## Menjalankan (dev)
```bash
# 1. Siapkan PostgreSQL & salin env
cp .env.example .env   # lalu isi DATABASE_URL, DIRECT_URL, AUTH_SECRET

# 2. Install dependency
npm install

# 3. Terapkan skema database
npm run db:deploy      # atau: npm run db:migrate (dev)

# 4. Jalankan
npm run dev            # http://localhost:3000
```
Buka aplikasi → ikuti **wizard setup** untuk membuat toko & akun pemilik pertama.

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run typecheck` | Cek TypeScript |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Buat & terapkan migration (dev) |
| `npm run db:deploy` | Terapkan migration (produksi) |
| `npm run db:studio` | Prisma Studio |

## Deployment
Portabel: cukup ganti `DATABASE_URL` + `DIRECT_URL` ke Postgres cloud (mis. Supabase),
jalankan `npm run db:deploy`, lalu deploy (Vercel/VPS). Nol refactor.

---
© Arta — Dibangun untuk Toko Komputer Indonesia.
