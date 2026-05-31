@AGENTS.md

# Arta — Dibangun untuk Toko Komputer Indonesia

Nama produk/brand aplikasi = **Arta** (konstanta di `src/lib/brand.ts`: `APP_NAME`, `APP_TAGLINE`).
Brand ini BERBEDA dari nama toko (tenant) milik pengguna yang dinamis.

Aplikasi manajemen toko komputer: POS/penjualan, pembelian, inventory, utang/piutang,
jasa servis, rakit PC, laporan keuangan. **Multi-tenant** (siap jadi SaaS), **offline-first**,
responsive (desktop + tablet), tema terang/gelap, scan barcode, print Bluetooth (ESC/POS),
kirim laporan ke WhatsApp, lisensi/demo.

## Stack
- **Next.js 16** (App Router) + **TypeScript** + **React 19** + **Turbopack** (default)
- **Tailwind CSS v4** (+ shadcn/ui — ditambah di Fase 1)
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Zod** untuk validasi (env, input)
- Auth.js (NextAuth) + RBAC — Fase 1
- Offline: PWA + RxDB (IndexedDB) + sync — Fase 1+

## Perintah
- `npm run dev` — dev server (http://localhost:3000). Next 16 hanya izinkan 1 instance.
- `npm run build` / `npm run start` — produksi
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (flat config; `next lint` sudah dihapus di Next 16)
- `npm run db:migrate` — buat & terapkan migration (dev)
- `npm run db:deploy` — terapkan migration (produksi)
- `npm run db:generate` — generate Prisma Client
- `npm run db:studio` — Prisma Studio
- Health check: `GET /api/health`

## Konvensi penting (JANGAN keliru)
### Next.js 16 (breaking vs Next 15/training data)
- `cookies()`, `headers()`, `draftMode()`, serta `params`/`searchParams` di page/layout/route **ASYNC** — wajib `await`.
- Middleware: gunakan **`proxy.ts`** (bukan `middleware.ts`); runtime `nodejs`, edge tidak didukung di proxy.
- `revalidateTag(tag, profile)` butuh argumen ke-2; ada `updateTag`/`refresh` baru.
- PPR via config `cacheComponents: true` (bukan `experimental.ppr`).
- Baca docs bundel di `node_modules/next/dist/docs/` bila ragu (lihat AGENTS.md).

### Prisma 7 (breaking vs Prisma 5/6)
- Generator `prisma-client` → client di **`src/generated/prisma`**. Impor: `import { PrismaClient } from "@/generated/prisma/client"`.
- `url`/`directUrl` **TIDAK** boleh di `schema.prisma`. URL Migrate ada di `prisma.config.ts` (pakai `DIRECT_URL`).
- Runtime **wajib driver adapter**: lihat `src/lib/db.ts` (singleton + `@prisma/adapter-pg`, pakai `DATABASE_URL`).
- Jangan impor dari `@prisma/client` untuk model; pakai client generated.

## Arsitektur
- **Multi-tenant**: shared DB, `tenantId` di setiap tabel bisnis. Isolasi via Prisma extension (Fase 1) — semua query bisnis WAJIB ter-scope `tenantId`.
- **Database portability**: `DATABASE_URL` (runtime/pooled) + `DIRECT_URL` (migrate). Lokal = sama. Pindah ke Supabase cukup ganti 2 env, nol refactor.
- **Lisensi**: model `License` per tenant (DEMO_DAILY/MONTHLY/TRANSACTIONS/UNLIMITED) + enforcement (Fase 7).
- Struktur kode modular per domain (master-data, inventory, pos, purchasing, service, dll) — dibangun bertahap.

## Auth & multi-tenant (Fase 1 — pola WAJIB diikuti)
- **Auth kustom** (pola resmi Next 16), BUKAN next-auth: `jose` (JWT) + cookie httpOnly + argon2.
  - `src/lib/auth/password.ts` — hash/verify argon2id (`@node-rs/argon2`).
  - `src/lib/auth/session.ts` — encrypt/decrypt JWT, set/get/delete cookie `toko_session`.
  - `src/lib/auth/dal.ts` — **DAL**: `verifySession()`, `getSession()`, `getCurrentUser()` (pakai `cache`). Panggil ini di Server Component/Action/Route untuk enforce auth.
  - `src/proxy.ts` — optimistic redirect saja (baca cookie, TANPA DB). Rute publik: `/login`, `/setup`.
- Server Actions di `src/server/**` (`auth/actions.ts`, `onboarding/actions.ts`). Form pakai `useActionState`.
- **RBAC**: `src/lib/rbac.ts` — `can(role, permission)`, `hasRoleAtLeast`, `ROLE_LABELS`. Nav disaring per izin.
- **Multi-tenant**: session memuat `{userId, tenantId, role}`. Query bisnis WAJIB ter-scope `tenantId` (helper scoping menyusul saat ada model bisnis).
- UI: shadcn-style primitif di `src/components/ui/*`, `cn()` di `src/lib/utils.ts`, tema via `next-themes` (`ThemeToggle`, class `.dark`).
- **Preview/dev**: `.claude/launch.json` memakai path absolut `node.exe` + `node_modules/next/dist/bin/next` (PATH preview tak punya node).

## Inventory & service pattern (Fase 2 — pola WAJIB diikuti)
- **Service layer** = satu-satunya akses ke tabel bisnis: `src/server/<domain>/service.ts`. SEMUA fungsi menerima `tenantId` sebagai argumen & menyertakannya di SETIAP query (isolasi tenant). Contoh: `src/server/inventory/service.ts`.
- **Server Actions** (`src/server/<domain>/actions.ts`): ambil `getAuthContext()` → cek `can(role, perm)` → validasi Zod → panggil service → `revalidatePath`/`redirect`. Map error Prisma P2002 ke pesan ramah.
- **Auth guard**: `src/lib/auth/guard.ts` — `getAuthContext()`, `requirePermission(perm)`.
- **Uang**: disimpan `Int` rupiah penuh (tanpa desimal). Format tampilan: `formatRupiah()` di `src/lib/utils.ts`.
- **Stok**: `product.stock` = cache; sumber kebenaran = akumulasi `StockMovement`. Ubah stok HANYA via mutasi transaksional (`db.$transaction`) yang menulis movement + update cache (lihat `createProduct`/`adjustStock`). Cegah stok negatif.
- **Barcode**: scan kamera `src/components/barcode/barcode-scanner.tsx` (@zxing/browser); USB scanner = keyboard-wedge (tak perlu komponen). Label cetak `src/components/barcode/barcode-label.tsx` (bwip-js, Code128).
- **UI**: Select/Textarea/Badge native di `src/components/ui`. Form pakai `useActionState`; tombol-link pakai `buttonVariants()` (BUKAN `asChild`, tak ada Radix Slot). `useSearchParams` di client → halaman list pakai `searchParams: Promise<...>` (await, Next 16).
- **PENTING dev**: setelah `prisma migrate`/`generate`, **restart dev server** — instance PrismaClient ter-cache di `globalThis` tak memuat model baru sampai proses di-restart.

## Status & Roadmap
- ✅ **Fase 0** — scaffold, Postgres lokal (`toko_komputer`, user `toko_app`), Prisma core (Tenant/User/License), health check.
- ✅ **Fase 1** — Auth (jose+argon2)+RBAC, isolasi multi-tenant (session-based), tema terang/gelap, onboarding wizard, dashboard shell responsif, PWA manifest. Terverifikasi end-to-end (setup→login→logout). *Engine* sinkronisasi offline (RxDB) DITUNDA ke Fase 2/3 (butuh model data nyata).
- ✅ **Fase 2** — Master data + Inventory + Barcode. Produk (CRUD+search+stok), Kategori & Satuan, Supplier & Customer (CRUD, komponen `src/components/contacts/*`), Stok Opname (sesi→hitung→terapkan transaksional, `src/server/opname/*`), barcode scan kamera + cetak label. Semua tenant-scoped & terverifikasi end-to-end. Fondasi offline: blueprint di `docs/OFFLINE_ARCHITECTURE.md` (engine RxDB diimplementasi di Fase 3 bersama POS).
- 🟡 **Fase 3 (sebagian besar)** — POS inti (terminal kasir, keranjang+scan+diskon+bayar, checkout transaksional: potong stok + movement SALE + invoice `INV-xxxxx` + kembalian, `src/server/pos/`), struk printable. **Print Bluetooth ESC/POS** (`src/lib/escpos.ts` encoder + `src/lib/bluetooth-printer.ts` Web Bluetooth; tombol di struk; butuh hardware utk uji nyata). **Riwayat penjualan + detail + VOID** (`src/app/(dashboard)/sales/`; void = kembalikan stok via movement RETURN_IN, hanya inventory.manage). **Shift kasir** (`src/server/shift/*`, `src/app/(dashboard)/shift/`): buka/tutup kas, penjualan auto-tertaut shift (Sale.shiftId), rekap + rekonsiliasi tunai (expectedCash, difference). Dashboard live. **Fondasi offline/PWA**: indikator online/offline (`src/hooks/use-online-status.ts` + banner di app-shell), service worker (`public/sw.js`: cache-first aset statis, network-first navigasi + fallback `public/offline.html`) didaftarkan via `src/components/pwa/sw-registrar.tsx` (produksi saja). **Build produksi terverifikasi** (`next build` sukses, 22 route). Semua (kecuali print BT & runtime SW offline yg perlu hardware/`next start`) terverifikasi end-to-end. **Sisa Fase 3**: engine sinkronisasi data offline penuh (RxDB outbox + endpoint /api/sync sesuai `docs/OFFLINE_ARCHITECTURE.md`) — perlu pengujian perangkat/jaringan nyata.
- ✅ **Fase 4** — Pembelian + Utang + Piutang. **Pembelian**: schema Purchase/PurchaseItem/PurchasePayment, service `src/server/purchasing/` (createPurchase transaksional: +stok + movement PURCHASE + update costPrice + nomor `PB-xxxxx`; recordPurchasePayment; listPayables+overdue), UI `purchasing/` + `payables/`. **Piutang**: Sale diperluas (paymentMethod CREDIT, paymentStatus, dueDate, model SalePayment); POS dukung jual kredit (DP+tempo, wajib pelanggan); `listReceivables`/`recordSalePayment` di `src/server/pos/`; UI `receivables/` + form pelunasan di detail penjualan. Nav Pembelian/Utang/Piutang aktif. Terverifikasi end-to-end (PB-00001 utang cicil; INV-00003 kredit DP→lunas).
- ✅ **Fase 5** — Jasa Servis + Rakit PC. **Servis** `src/server/service-jobs/` + `src/app/(dashboard)/service/` (tiket `SV-xxxxx`, workflow status, sparepart potong stok via movement SERVICE_OUT, biaya jasa, bayar). **Rakit PC** `src/server/pcbuild/` + `src/app/(dashboard)/pc-build/` (rakitan `RKT-xxxxx`, komponen potong stok via movement BUILD_OUT, jasa rakit, status, bayar). Pola detail interaktif (client + direct-call actions + router.refresh) sama untuk keduanya. Nav Servis & Rakit PC aktif. Terverifikasi (SV-00001, RKT-00001). GOTCHA: field opsional form tanpa input → `formData.get()||undefined` (null gagal Zod `.optional()`).
- ✅ **Fase 6** — Keuangan + Laporan + WhatsApp. **Biaya** (model Expense; `src/server/finance/` service+actions; UI `finance/expenses`). **Laporan laba-rugi** ringkas per periode (hari/bulan/tahun) di `finance/page.tsx` — agregasi lintas modul: penjualan+HPP+laba kotor, servis, rakit PC, pembelian, biaya, estimasi laba bersih (`getFinanceReport`). **WhatsApp** pluggable (`src/lib/whatsapp.ts`): default `wa.me` link (nol biaya) + salin teks; gateway/Cloud API tinggal ditambah. Nav Keuangan aktif. Terverifikasi (laba bersih Rp 3.050.000 dari data demo).
- ✅ **Fase 7** — Lisensi/Demo + Pengguna + Pengaturan + Hardening. **Lisensi**: `src/server/license/` (checkLicense enforcement di POS checkout, increment transactionsUsed; updateLicense). **Pengguna**: `src/server/users/` + `src/app/(dashboard)/users/` (CRUD peran, guard OWNER terakhir, argon2). **Pengaturan**: `settings/` (nama toko + form lisensi, izin license.manage). **Hardening**: security headers di `next.config.ts`, rate-limit login in-memory di `auth/actions.ts`. Nav Pengguna/Pengaturan aktif. Terverifikasi (limit 0 memblokir POS; Kasir baru dibuat). **Build produksi sukses: 36 route.**
- 🔜 **Lintas-fase tersisa**: engine sinkronisasi offline RxDB penuh (blueprint `docs/OFFLINE_ARCHITECTURE.md`) — perlu pengujian perangkat/jaringan nyata. Opsional: kas/bank detail, gateway WhatsApp berbayar.

## Fitur tambahan (pasca-MVP)
- ✅ **Garansi & Nomor Seri** — `Product.warrantyMonths` + model `WarrantyUnit` (SN unik per tenant, status ACTIVE/CLAIMED/VOID, EXPIRED dihitung dari `warrantyUntil`); `src/server/warranty/` (register/list/claim) + UI `warranty/` (daftar+cari+klaim). Nav Garansi (inventory.manage). Terverifikasi.
- ✅ **#2 Lacak Servis Online + Notif WhatsApp** — halaman PUBLIK `/lacak` (rute terbuka di `proxy.ts` OPEN_ROUTES, tanpa login; verifikasi no.tiket+no.HP, info aman saja) via `src/server/public/track.ts`; tombol "Beri tahu via WhatsApp" di detail tiket (wa.me ke HP pelanggan + link lacak); helper `buildServiceStatusText`/`normalizePhoneId` di `src/lib/whatsapp.ts`. Terverifikasi (HP benar→status, HP salah→tidak ditemukan).
- ✅ **#3 Dashboard Analitik** — `src/server/analytics/service.ts` (salesTrend 14 hari, topProducts via saleItem.groupBy, deadStock=produk berstok tanpa penjualan 60 hari, lowStock stok≤minStock) + `src/components/charts/bar-chart.tsx` (CSS, tanpa dep) + halaman `/reports`. Nav Laporan (reports.view). Terverifikasi (tren Rp 2.3jt, terlaris SSD).
- ✅ Tiga fitur pasca-MVP (Garansi, Lacak Servis+WA, Analitik) + **Import Produk Massal CSV** (`src/lib/csv.ts` parser + `importProducts` di inventory service: auto-buat kategori/satuan, stok awal+movement, lapor error per baris; UI `/inventory/import`). Build produksi sukses.
- ✅ **Saran Pembelian (Reorder)** — `reorderSuggestions` (produk stok≤min + saran qty); `/purchasing/reorder` + "Buat Pembelian Semua" → `/purchasing/new?items=id:qty` (PurchaseForm `initialItems` prefill).
- ✅ **Membership & Poin Loyalitas** — `Customer.points` + model `PointEntry` (EARN/REDEEM/ADJUST); earn otomatis di createSale (1 poin/Rp1.000, dalam tx); `adjustPoints`/`listPointEntries` di customers service; UI `PointsManager` di halaman edit pelanggan (saldo+riwayat+tukar/sesuaikan, cegah saldo negatif).
- ✅ **Retur Penjualan Sebagian** — `SaleItem.returnedQty` + model `SaleReturn`/`SaleReturnItem`; `createReturn` di pos service (validasi sisa, restock + movement RETURN_IN, nomor `RTN-xxxxx`, refundAmount); UI ReturnForm + riwayat retur di detail penjualan (izin inventory.manage).
- ✅ **Diskon per item** (POS) — `SaleItem.discount`; createSale hitung net per baris; input diskon tiap baris keranjang. ✅ **Tahan/Park Transaksi** — client-side localStorage (`pos_held_v1`) di PosTerminal (park/restore/hapus), tanpa skema.
- ✅ **Foto Kondisi Servis** — model `ServicePhoto` (dataUrl JPEG terkompres di DB); upload di-resize+kompres di browser (canvas, maks 1000px, JPEG 0.7) di `src/app/(dashboard)/service/photos.tsx`; `addServicePhoto`/`removeServicePhoto` + actions (service.manage, validasi `data:image/`, cap ~900KB); galeri di detail tiket. Terverifikasi (foto tersimpan utk SV-00001).
- ✅ **Halaman Tentang & Disclaimer** — `/about` & `/disclaimer` (rute publik via proxy OPEN_ROUTES). About: profil+fitur+kredit. Disclaimer: 9 section legal + kalimat as-is. Konstanta di `src/lib/brand.ts` (APP_PUBLISHER/DEVELOPER: Max Computer maxcomputer.id, Firman Ahmad @boysnocry firmanahmad.id). Tautan "Tentang · Disclaimer" di footer sidebar & layout auth; saling tertaut.
- 🔜 Belum dikerjakan (opsional, lebih besar): multi-gudang (invasif—sentuh semua logika stok); laporan WhatsApp terjadwal (butuh cron/scheduler); kas/bank detail; gateway WA berbayar; engine offline RxDB penuh.

## Catatan lingkungan (dev lokal)
- DB: `postgresql://toko_app:***@localhost:5432/toko_komputer` (lihat `.env`).
- Superuser Postgres: `postgres` / `postgres` (port 5432).
- Windows + PowerShell. Node LTS 24, npm 11.
