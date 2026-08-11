# Arsitektur Offline-First (Blueprint)

> Status: **rencana disepakati**. Engine akan diimplementasikan di **Fase 3 (POS)** —
> saat ada transaksi nyata yang benar-benar butuh jalan offline. Dokumen ini
> mengunci keputusan desain agar implementasi nanti tanpa refactor besar.

## Mengapa ditunda ke Fase 3 (bukan dibangun kosong di Fase 2)
Sync engine yang benar harus dirancang di sekitar entitas transaksional (penjualan,
pembayaran, stok) dengan aturan konflik yang spesifik. Membangunnya di atas data
master (produk/supplier) yang jarang berubah = effort mubazir & kemungkinan besar
di-refactor. Fondasi yang tepat di Fase 2 adalah **arsitektur & batasannya**, bukan kode engine.

## Prinsip
1. **Server = sumber kebenaran** untuk stok & nomor dokumen. Klien optimistic, server rekonsiliasi.
2. **Local-first read/write** di perangkat kasir; UI tak pernah menunggu jaringan.
3. **Idemponten**: setiap operasi punya `clientOpId` (UUID) agar aman di-retry tanpa dobel.

## Komponen
- **Local DB**: RxDB (storage IndexedDB) di browser/PWA. Koleksi cermin dari tabel bisnis
  (products, customers, sales, sale_items, payments, stock_movements).
- **Outbox**: setiap mutasi offline ditulis ke antrian lokal `outbox` (append-only).
- **Replication**: protokol pull/push RxDB ke endpoint Next.js:
  - `GET /api/sync/pull?since=<checkpoint>` → dokumen berubah sejak checkpoint (per tenant).
  - `POST /api/sync/push` → kirim batch outbox; server memproses transaksional & balas hasil.
- **Service Worker (PWA)**: cache app-shell + aset agar app tetap terbuka saat offline.

## Aturan konflik (kritis)
- **Stok**: tidak direplikasi sebagai nilai absolut. Klien mengirim **delta movement**
  (mis. SALE -2). Server menerapkan delta secara transaksional → stok server otoritatif.
  Bila stok server tak cukup (terjual di device lain), penjualan ditandai *needs-review*.
- **Nomor invoice**: offline memakai nomor sementara ber-prefix device (`DToko-3-000123`).
  Saat sync, server menetapkan **nomor final** berurutan; struk menampilkan nomor final.
- **Master data** (produk/harga/supplier/customer): last-write-wins per field, server menang
  bila ada `updatedAt` lebih baru.

## Multi-tenant
Semua koleksi lokal & endpoint sync **wajib ter-scope `tenantId`** (dari session).
Pull/push tak pernah lintas tenant.

## Tahapan implementasi (Fase 3+)
1. Service Worker app-shell (installable & buka offline). 
2. RxDB + koleksi read-only (produk/pelanggan) + replication pull → POS bisa cari produk offline.
3. Outbox + push untuk transaksi penjualan (delta stok + nomor sementara).
4. Rekonsiliasi server (nomor final, needs-review) + indikator status sinkron di UI.

## Status implementasi

### ✅ Fondasi SERVER (selesai & terverifikasi)
Endpoint sinkron + idempotensi sudah dibangun dan diuji end-to-end:
- **`GET /api/sync/pull?since=<ISO>`** — katalog produk & pelanggan (delta via
  `updatedAt`, atau penuh bila tanpa `since`) + `checkpoint`. Ter-scope tenant.
- **`POST /api/sync/push`** — batch operasi PENJUALAN offline. Tiap op wajib
  `clientOpId` (+ opsional `clientCreatedAt` = waktu transaksi asli di perangkat).
  Server: proses berurutan, tiap op transaksi sendiri; balas per-op
  `{synced|duplicate|needs_review|error}`.
- **Idempotensi**: `Sale.clientOpId` (`@@unique([tenantId, clientOpId])`);
  `createSale` cek-dulu + tangani balapan P2002 → kirim ulang TIDAK dobel
  (stok terpotong sekali). Terverifikasi: kirim 2× → 1 penjualan, stok 12→10.
- **Konflik stok**: stok tak cukup (terjual di device lain) → op `needs_review`,
  TIDAK menjatuhkan batch. Nomor invoice final ditetapkan server (berurutan).
- **Tanggal offline**: `clientCreatedAt` → penjualan bertanggal saat TERJADI,
  bukan saat tersinkron (penting untuk laporan).
- Auth via session (401 bila tak login), izin `pos.use`, tenant dari session.

### 🔜 Sisa (sisi KLIEN — langkah berikutnya)
- Cache katalog ke IndexedDB (dari `/pull`) → pencarian produk POS saat offline.
- **Outbox IndexedDB**: checkout saat offline → tulis ke antrian dengan
  `clientOpId` (UUID) + `clientCreatedAt`; struk sementara ("menunggu sinkron").
- **Sync loop**: saat online kembali (+ berkala) POST outbox ke `/push`,
  tandai hasil, tampilkan nomor final.
- **Indikator status sinkron** + daftar `needs_review` di UI.

### Catatan penyimpangan dari blueprint
Sisi klien direncanakan pakai **outbox IndexedDB ringan** (bukan RxDB penuh):
prinsip sama (server otoritatif, `clientOpId` idempoten, delta stok, nomor
final, ter-scope tenant), tanpa dependensi berat. RxDB bisa diadopsi nanti bila
butuh replikasi dua arah yang lebih kaya.
