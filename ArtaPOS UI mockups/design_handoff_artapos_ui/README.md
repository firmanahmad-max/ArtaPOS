# Handoff: Redesign UI ArtaPOS

## Overview
Redesign visual dan UX untuk **ArtaPOS** — aplikasi manajemen toko komputer (Next.js 16 · React 19 · Tailwind v4 · Prisma 7). Mencakup 24 layar/state: Dashboard, Kasir (POS), Inventory, Jasa Servis, Simulasi Rakitan, Keuangan, Piutang, Rakit PC, Pengaturan, Login, Setup wizard, Struk cetak, serta versi mobile Dashboard & Kasir — masing-masing dalam mode terang dan gelap.

Brief dari pemilik produk: *"UI sekarang terlalu datar dan generik, font tidak menarik."* Redesign ini menjawabnya lewat tiga perubahan berakar, bukan penambahan hiasan:

1. **Tipografi berjenjang.** Sumber memakai Geist Sans untuk semua level, jadi judul, label, dan angka rupiah punya bobot visual sama. Redesign memisahkan: **Archivo** untuk teks dan judul (tracking negatif di ukuran besar), **JetBrains Mono** untuk semua angka uang, nomor dokumen, dan label periode. Di aplikasi kasir, angka adalah konten utama — ia sekarang terbaca sebagai angka.
2. **Warna selaras brand.** Logo ArtaPOS violet-krom, tapi tema default aplikasi terakota, sehingga identitas tidak terbaca di produk. Redesign memakai violet brand sebagai primary.
3. **Ritme bobot panel.** Semua kartu di sumber seragam `rounded-2xl + .elevate`, berjajar tanpa hierarki. Redesign membedakan: hero bergradien, kartu KPI ringan, panel gelap untuk Tanya Arta, tabel tanpa bayangan.

## About the Design Files
File dalam bundel ini adalah **referensi desain yang dibuat dengan HTML** — prototipe yang menunjukkan tampilan dan perilaku yang dituju, **bukan kode produksi untuk disalin langsung**.

Tugasnya adalah **membuat ulang desain ini di dalam codebase ArtaPOS yang sudah ada**, memakai pola dan pustaka yang sudah dipakai di sana: Tailwind v4 dengan token `oklch` di `src/app/globals.css`, komponen `src/components/ui/*` (Button, Card, StatCard, Badge, Input, Select, Textarea, Pagination, EmptyState), `AppShell` di `src/components/layout/app-shell.tsx`, dan ikon `lucide-react`. Jangan menyalin HTML-nya; ubah nilainya menjadi token dan varian komponen.

Semua markup di prototipe memakai **inline style** karena alasan teknis lingkungan pembuatannya, bukan sebagai rekomendasi. Di codebase, nilai-nilai ini harus jadi token CSS dan className Tailwind.

## Fidelity
**High-fidelity.** Warna, tipografi, spasi, radius, bayangan, dan copy sudah final dan diukur. Kontras teks sudah diverifikasi ≥4.5:1 di seluruh layar terang dan gelap. Semua ikon memakai path asli dari `lucide-react` v1.17.0 yang ada di `node_modules`, dan logo memakai aset asli `public/icon-512.png` serta `public/logo-wordmark.png`.

Data pada prototipe adalah data contoh yang **mengikuti bentuk asli dari kode** (agregat `db.sale.aggregate`, `salesTrend`/`serviceTrend` 14 hari, `getArtaInsights`, `simTotals`, `listReceivables`, penomoran `INV/SV/RKT/PB/RMA/SIM/RTN-00000`).

## Design Tokens

### Warna — mode terang
| Token | Hex | Pemakaian |
|---|---|---|
| page | `#f5f4f9` | latar halaman |
| card / bar | `#ffffff` | permukaan kartu, sidebar, header |
| border | `#e7e4ef` | border kartu dan pemisah utama |
| border-input | `#e3dff0` | border field dan kontrol |
| field | `#faf9fd` | latar field, header tabel |
| chip | `#f3f2f8` | latar chip, toggle, keypad |
| rule | `#f1eff7` | pemisah baris di dalam kartu |
| ink | `#1b1926` | teks utama, angka |
| ink-sub | `#2c2839` | teks sekunder kuat, item nav non-aktif |
| muted | `#6b667c` | teks muted, label, placeholder |
| muted-strong | `#635e74` | label KPI |
| primary | `#6d3ce0` | aksen, ikon, tautan |
| primary-accent | `#9b4df5` | ujung gradien tombol |
| primary-deep | `#5424c4` | nomor dokumen, teks di atas tint violet |
| primary-tint | `#f2edff` | latar chip/ikon violet |
| success | `#0f7a5f` / tint `#eafaf3` | delta positif, kembalian, status selesai |
| warning | `#8a5209` / tint `#fff4e2` | SLA, stok menipis, biaya naik |
| danger | `#c0344a` / tint `#fdecef` | stok habis, jatuh tempo, hapus |

### Warna — mode gelap
| Token | Hex |
|---|---|
| page | `#12111a` |
| card / bar | `#191723` |
| border | `#272338` · border-input `#2e2a40` |
| field | `#1d1a2a` · chip `#221f30` · rule `#231f31` |
| ink | `#efedf6` · ink-sub `#cfcade` |
| muted | `#948fa6` · muted-strong `#9a94ac` · muted-soft `#8a84a0` |
| primary | `#a78bfa` · primary-deep `#c4b5fd` · tint `rgba(139,92,246,.16)` |
| success | `#34d399` / `rgba(52,211,153,.14)` |
| warning | `#fbbf24` / `rgba(251,191,36,.14)` |
| danger | `#fb7185` / `rgba(251,113,133,.14)` |

**Catatan penting soal ramp muted.** Nilai muted terang diturunkan dari token sumber `--muted-foreground: oklch(0.52 0.025 48)` dengan hue digeser ke violet → `oklch(0.52 0.025 295)`. Jangan memakai nilai yang lebih terang: percobaan dengan `#9a95ad` (2.65:1), `#8b86a0` (3.17:1), dan `#746f85` (4.84:1 di putih tapi 4.41:1 di `#f5f4f9`) semuanya gagal 4.5:1. `#6b667c` lolos di ketiga latar yang dipakai desain ini: `#fff` 5.5:1, `#f5f4f9` 5.0:1, `#f3f2f8` 4.9:1.

### Gradien
```css
--gradient-brand: linear-gradient(135deg, #6d3ce0, #9b4df5);   /* tombol, nav aktif, chip aktif */
--gradient-hero:  linear-gradient(115deg, #3b1d7e 0%, #6d3ce0 52%, #a855f7 100%); /* hero sambutan */
--gradient-arta:  linear-gradient(160deg, #211043, #3b1d7e);   /* panel Tanya Arta */
```
Hero diberi lapisan titik dekoratif: `radial-gradient(#fff 1px, transparent 1px)` `background-size:18px 18px` opacity `.28`.

Wordmark memakai `background-clip:text` dengan pasangan gradien **berbeda per mode**: terang `#6d3ce0 → #a855f7`, gelap `#a78bfa → #c4b5fd`. Ini mengikuti perilaku `.text-gradient-brand` di `globals.css` yang tokennya diredefinisi di blok `.dark` — pasangan terang di latar gelap hanya mencapai 2.83:1.

### Tipografi
| Peran | Font | Ukuran / bobot |
|---|---|---|
| Judul halaman | Archivo 800 | 22px, `letter-spacing:-.02em` |
| Judul hero | Archivo 800 | 28px, `-.02em` |
| Judul kartu | Archivo 700 | 14.5px, `-.01em` |
| Teks isi | Archivo 400/500 | 12.5–13.5px |
| Label field | Archivo 600 | 12px |
| Label kolom / eyebrow | Archivo 700 | 9.5–10px, `letter-spacing:.07–.1em`, uppercase |
| Item nav | Archivo 500 (aktif 600) | 13px |
| **Angka besar (KPI)** | JetBrains Mono 700 | 19–26px, `-.03em` |
| **Angka tabel / total** | JetBrains Mono 600/700 | 12–13px |
| Nomor dokumen | JetBrains Mono 700 | 12px |
| Label tanggal chart | JetBrains Mono 500 | 9–10px |
| Struk | JetBrains Mono 400 | 11px, line-height 1.5 |

Di codebase, ganti `--font-geist-sans` → Archivo dan `--font-geist-mono` → JetBrains Mono di `src/app/layout.tsx`, lalu tambahkan `font-mono tabular-nums` pada semua sel angka (aturan `th, td, .tabular { font-variant-numeric: tabular-nums }` yang sudah ada tetap dipakai).

### Spasi, radius, bayangan
- Gap konten utama `18px`; gap grid kartu `13–16px`; padding konten `22px 24px 28px`.
- Radius: kartu utama `16px`, kartu kecil/KPI `14–15px`, kartu produk `13px`, tombol `10–12px`, field `10–11px`, chip `99px`, ikon-tile `8–12px`.
- Bayangan kartu terang: `0 1px 2px rgba(27,25,38,.05), 0 10px 24px -18px rgba(27,25,38,.25)`
- Bayangan kartu gelap: `0 1px 2px rgba(0,0,0,.4), 0 14px 30px -20px rgba(0,0,0,.7)`
- Bayangan tombol primary: `0 6px 16px -8px rgba(109,60,224,.9)`; tombol besar `0 10px 24px -10px rgba(109,60,224,.85)`

## Struktur Shell

Mengikuti `app-shell.tsx`, dengan dua perubahan.

**Sidebar** `250px`, `background: card`, `border-right: 1px solid border`. Header sidebar tinggi `66px`: logo 34px + nama toko (Archivo 600 13px) + wordmark "ARTAPOS" (Archivo 700 10.5px, `letter-spacing:.04em`, gradien text-clip).

Nav `padding:14px 12px`, `gap:16px` antar grup, `overflow-y:auto`. **Seluruh 7 grup dan 20 item dari `nav-config.ts` harus ada** — prototipe awalnya melewatkan grup PEMBELIAN dan ADMINISTRASI, dan itu bug: Supplier, Pembelian, dan Utang punya route nyata tapi tidak bisa dijangkau. Urutan: UTAMA · PENJUALAN · INVENTARIS · PEMBELIAN · LAYANAN · KEUANGAN & LAPORAN · ADMINISTRASI.

Label grup: Archivo 700 9.5px, `letter-spacing:.1em`, uppercase, warna muted, `padding:0 10px 4px`.

Item nav non-aktif: `padding:8px 11px`, `border-radius:9px`, teks ink-sub 500 13px, ikon 16px stroke muted, gap 11px.
Item nav aktif: `padding:9px 11px`, `background: gradient-brand`, teks `#fff` 600, ikon `currentColor`, `box-shadow:0 6px 16px -8px rgba(109,60,224,.9)`.

**Badge nav** wajib mengikuti aturan yang sudah tertulis di `app-shell.tsx`: `active ? "bg-white/25 text-white" : "bg-destructive text-destructive-foreground"`. Badge non-aktif memakai tint semantik (rose untuk stok, amber untuk servis); badge pada baris aktif **harus** `rgba(255,255,255,.25)` + `#fff` — tint rose di atas gradien violet hanya 1.87:1.

Footer sidebar: avatar inisial 32px + nama + "Pemilik · email" + ikon keluar.

**Header** tinggi `66px`: kolom cari `330px` (placeholder + kbd "Ctrl K"), lalu chip status sinkron, chip shift berjalan, dan toggle tema (ikon `sun` di terang, `moon` di gelap).

## Screens / Views

### 1. Dashboard (`/dashboard`) — ref 1a terang, 2a gelap
Urutan vertikal: hero sambutan → 4 kartu KPI → dua grafik tren + kolom kanan → 4 pintasan.

- **Hero** `border-radius:18px`, `padding:24px 26px`, gradient-hero + lapisan titik. Isi: eyebrow tanggal (`SENIN, 15 SEPTEMBER 2026 · WIB`), sapaan 28px, peran + nama toko + pill lisensi `rgba(255,255,255,.18)` border `rgba(255,255,255,.28)`. Kanan: tombol putih "Buka Kasir" (`#fff` bg, `#3b1d7e` teks) + tombol ghost "Transaksi baru".
- **KPI** grid 4 kolom: Penjualan Hari Ini (mini bar 7 hari, bar terakhir primary), Produk Aktif (progress bar 72%), Servis Aktif (tiga segmen amber 3/4/2), Stok Habis (border rose + tautan "Buat pesanan pembelian →"). Tiap kartu: label muted 11.5px, angka mono 25px, delta chip + hint.
- **Baris tren**: grid `minmax(0,1.62fr) minmax(0,1fr)`. Kolom kiri berisi header bersama "Tren 14 Hari" + toggle periode (14 hari / 30 hari / 3 bulan), lalu **dua kartu bertumpuk** — Penjualan (violet) di atas, Jasa Servis (amber) di bawah, masing-masing `grid-template-rows:repeat(2,minmax(0,1fr))`. Tiap kartu: ikon-tile + nama + total mono 16px + delta chip; 14 bar `gap:8px` `border-radius:5px 5px 2px 2px` dengan bar hari ini paling pekat; baris label tanggal mono 9px; kaki 3 metrik grid `repeat(3,minmax(0,1fr))` dengan `white-space:nowrap` wajib pada label dan nilai.
- **Kolom kanan**: panel Tanya Arta (gradient-arta, glow radial di pojok, 3 temuan dengan dot tone `#fb7185`/`#fbbf24`/`#34d399` + `box-shadow:0 0 0 3px` warna sama alpha .22, lalu field "Tanya…"), dan kartu Penjualan Terbaru (5 baris: nomor mono primary-deep, pelanggan + metode, total mono, jam).
- **Pintasan** grid 4: ikon-tile 38px + judul 13px + deskripsi 11px. Copy persis sumber: Buka Kasir / Tambah Produk / Tiket Servis / Laporan.

**Penting soal tinggi.** Kartu grafik harus `display:flex; flex-direction:column` dengan track bar `flex:1; min-height:190px` (desktop) agar bar menyerap sisa tinggi baris; kalau tidak, kolom kanan yang lebih tinggi men-stretch kartu kiri dan menyisakan ~235px ruang kosong di dalam kartu berbingkai.

### 2. Kasir / POS (`/pos`) — ref 3a terang, 3b gelap
Grid `minmax(0,1fr) 400px`, `align-items:start` (panel keranjang `h-fit` + sticky seperti di sumber).

Header: judul "Kasir" + "Shift #218 dibuka 06:41 · kas awal Rp 500.000 · 23 nota hari ini"; kanan tombol Riwayat nota + chip "Online · antrean kosong".

Kolom kiri: field cari 46px dengan kbd `F4` bernada violet + tombol scan 46px; baris chip kategori (**`flex-wrap:wrap`**, jangan `overflow:hidden` — 10 chip butuh 713px di track 525px); tray "DITAHAN (2)" `border:1px dashed` berisi pill transaksi tertahan; grid produk `repeat(3,minmax(0,1fr))` gap 10px.

Kartu produk: nama 2 baris (`-webkit-line-clamp:2`, `min-height:34px`), baris stok, harga mono 14px primary. **Untuk stok habis, badge "HABIS" harus menjadi sibling di baris stok, bukan `position:absolute`** — versi absolut menimpa nama, dan menambah `padding-right` malah memicu clamp memotong teks ("SSD Samsung 980 NVMe **1TB**" hilang). Kartu habis `opacity:.6`.

Panel keranjang: header (ikon-tile, "Keranjang", count chip, "Kosongkan" rose) → baris item (nama, harga/unit, stepper −/+ 26px, subtotal mono, ikon hapus, tautan "+ diskon item" `nowrap`) → Subtotal / Diskon transaksi / **Total dalam blok violet-tint, mono 22px** → pelanggan terpilih → **4 tombol metode bayar 56px** (Tunai aktif; ini menggantikan `<Select>` di sumber, menghemat satu interaksi) → field jumlah bayar 42px + 3 chip uang cepat + **keypad angka 3×4** (7-8-9 / 4-5-6 / 1-2-3 / 000-0-⌫, tombol 36px, ⌫ memakai ikon lucide `delete` bernada rose) → blok kembalian hijau → tombol Tahan + **Bayar Rp 6.500.000** 48px → hint pintasan F2/F3/F4.

Pintasan keyboard tetap seperti sumber: `F2` bayar, `F4` cari; `F3` tahan ditambahkan.

### 3. Inventory (`/inventory`) — ref 4a, 4b
Header + 5 tombol toolbar (Export CSV, Import, Stok Opname, Kategori & Satuan, Tambah Produk) → 4 KPI (Produk Aktif, Nilai Stok modal, Stok Menipis, Stok Habis) → baris cari 320px + 4 filter cepat (Semua / Menipis / Habis / Tanpa barcode) + hitungan "1.284 produk · hal. 1 dari 52" → tabel → paginasi.

Tabel `grid-template-columns: minmax(0,2.5fr) 1fr 1fr 1.05fr 108px`, urutan kolom persis `<thead>` sumber: PRODUK · KATEGORI · HARGA JUAL · STOK · AKSI. Header tabel `background: field`, label 700 10px `.09em`. Baris: nama + "SKU · barcode" mono 10.5px; stok sebagai pill rose "Habis" / pill amber "n pcs · menipis" / teks mono biasa; aksi ikon `qr-code`, `pencil`, `trash-2` 28px. Paginasi: prev disabled `opacity:.45`, halaman aktif gradient-brand, elipsis, next.

### 4. Jasa Servis (`/service`) — ref 5a, 5b
6 kotak status mengikuti `STATUS_ORDER` dan `SERVICE_STATUS_META` **termasuk emoji-nya** (⏳ Diterima · 🔧 Dikerjakan · 📦 Tunggu Sparepart · ✅ Selesai · 🎉 Diserahkan · 🚫 Batal) — emoji adalah kosakata produk yang sudah ada, jangan diganti. Tint kotak mengikuti `TINT_BY_VARIANT`.

Filter: Aktif (9) / Semua / Lewat SLA (2) / Siap diambil (5), plus "Diurutkan: tiket terlama dulu".

Kartu tiket grid 2 kolom: nomor mono + badge status + **badge "SLA LEWAT" solid rose bila lewat**; nama pelanggan 700 13.5px; "perangkat • keluhan" muted; baris chip teknisi + umur tiket; kanan total mono 14px + tanggal; chevron. **Teknisi dan umur tiket adalah tambahan** — status saja tidak memberi tahu siapa yang memegang dan sudah berapa lama.

### 5. Simulasi Rakitan (`/simulations`) — ref 6a, 6b
Filter per status (Semua 14 / Draf 3 / Terkirim 4 / Disetujui 5 / Ditolak 2) + "Nilai penawaran terkirim". Kartu 2 kolom: nomor + badge (`STATUS_META`: Draf secondary, Terkirim warning, Disetujui success, Diimpor default, Ditolak destructive); nama rakitan; "pelanggan · n komponen"; kanan nilai jual mono 15px + margin + tanggal.

**Tambahan: bar bujet per kartu.** `simTotals(items, buildFee, budget)` sudah menerima `budget`, jadi perbandingan total vs bujet layak ditampilkan — bar violet bila aman, rose + label "lebih Rp X" bila melebihi. Aksi "Kirim WA" dan "Impor ke Rakit PC" dinaikkan ke kartu karena itu alur utamanya.

### 6. Rakit PC (`/pc-build`) — ref 11a, 11b
5 kotak status dari `BUILD_STATUS_META` dengan emoji (📝 Draft · 🔧 Dirakit · ✅ Selesai · 🎉 Diserahkan · 🚫 Batal). Filter Berjalan / Semua / Siap diambil + nilai rakitan berjalan. Kartu 2 kolom seperti sumber, **plus bar progres rakitan dan nama teknisi/status ambil** — status diskrit tidak cukup memberi tahu posisi pekerjaan.

### 7. Keuangan (`/finance`) — ref 7a, 7b
4 tab periode persis `PERIODS` (Hari Ini / Bulan Ini / Bulan Lalu / Tahun Ini) → 4 KPI (Pendapatan, Laba Kotor + margin, Laba Bersih, Biaya) → grid `minmax(0,1.05fr) minmax(0,1fr)`:
- **Kartu perbandingan**: grid `minmax(0,1fr) 150px 110px`, header METRIK / bulan ini / vs bulan lalu, empat baris `compareRows`, masing-masing dengan `DeltaBadge` — ikon `arrow-up-right`/`arrow-down-right` + persen, hijau bila `up === higherIsBetter`. **Biaya operasional memakai `higherIsBetter:false`, jadi kenaikan tampil rose.** Kaki: ringkasan periode sebelumnya.
- **Kartu laba-rugi**: caption + laba bersih mono 30px (hijau bila ≥0, rose bila rugi), lalu baris `rows` persis urutan sumber termasuk hint jumlah transaksi/tiket/rakitan; nilai negatif diberi tanda − dan warna rose; "Laba kotor penjualan" `border-top` + bold.
- **Kartu Kirim Laporan**: tombol Kirim WhatsApp + Salin teks, dan `<pre>` pratinjau yang formatnya persis `buildReportText()` di `src/lib/whatsapp.ts` (emoji 🛒 🔧 🖥️ 📦 💸, indentasi `   • `, baris total `*Estimasi Laba Bersih: …*`).

### 8. Piutang (`/receivables`) — ref 8a, 8b
3 KPI (Total Piutang Berjalan rose, Jumlah Tagihan, Lewat Tempo amber) + filter (Semua 7 / Lewat tempo 4 / Jatuh tempo ≤7 hari 1) + "Lewat tempo senilai Rp 23.400.000".

Tabel `grid-template-columns: 120px minmax(0,1fr) minmax(0,1.4fr) 150px 185px`, kolom persis sumber: NO · PELANGGAN · JATUH TEMPO · SISA PIUTANG · AKSI. Sel Jatuh Tempo memuat tanggal + badge "LEWAT TEMPO" + umur, semuanya `nowrap` — **track ini butuh ≥204px**, bobot `1.5fr` yang hanya menghasilkan 193px membuat umur meluber ke kolom berikutnya. Sisa piutang rose bila lewat tempo. Aksi: "Tagih WA" + "Terima".

### 9. Pengaturan (`/settings`) — ref 12a, 12b
Tab: Toko & Struk (aktif) / Tampilan / Lisensi / Printer & Struk. Grid `minmax(0,1.25fr) minmax(0,1fr)`.

Kiri: panel **Identitas Toko** (Nama Toko, No. Telepon/HP (struk), Alamat Toko (struk), Catatan Kaki Struk — label, placeholder, dan hint persis `StoreSettingsForm`); panel **Info / Promo Halaman Lacak Servis** (textarea 3 baris + hint tentang `/lacak`); panel **Tema Warna** grid 5 dengan **hex asli dari konstanta `COLOR_THEMES`**: Terakota `#C0603E→#DE9572`, Mint `#3FAE8E→#7FCDB8`, Lavender `#7B6FD0→#B492E6`, Sky `#4F92D8→#93BEEA`, Ocean `#1E2A44→#3B82F6`. Swatch aktif: border primary + `box-shadow:0 0 0 3px rgba(109,60,224,.22)` + ikon `check`.

Kanan: panel **Logo Toko** (pratinjau 64px, "Pilih gambar", "Hapus logo", hint 240px/PNG latar putih); panel **Lisensi** (blok violet BULANAN + masa berlaku + chip AKTIF, lalu "Tukar Kode Promo" dengan field mono `ARTA-XXXX-XXXX` + tombol ikon `key-round`); panel **Panduan Cepat** (progres 6 dari 8 langkah + tombol buka).

### 10. Login (`/login`) — ref 9a, 9b
Shell `(auth)/layout.tsx`: latar `bg-muted/40`, kartu terpusat `max-w-md`, toggle tema absolut kanan-atas, footer "Tentang ArtaPOS · Panduan · Disclaimer".

Kartu `border-radius:18px`, `padding:22px`. Panel logo memakai gradien **persis dari sumber**: `radial-gradient(130% 150% at 50% 0%, #241653 0%, #0d0a1f 72%)`, `border-radius:13px`, `padding:18px 22px`, berisi `public/logo-wordmark.png` tinggi 44px. Lalu caption "Masuk untuk melanjutkan", field Email (placeholder `nama@toko.com`) dan Password, tombol "Masuk" 44px gradient-brand. Kaki: catatan "Bisa dipakai offline · data tersimpan di perangkat" dengan dot hijau.

### 11. Setup wizard (`/setup`) — ref 10a, 10b
Logo 52px (sesuai `<Logo size={52} />`), judul "Selamat datang! 👋", deskripsi persis sumber.

**Perubahan UX:** form tunggal berisi lima field di sumber dipecah menjadi dua langkah dengan indikator progres — langkah 1 "Toko" ditandai selesai (ikon check hijau) dan ditampilkan sebagai baris ringkasan "NAMA TOKO / Arta Komputer Jaya" dengan tautan "Ubah"; langkah 2 "Akun Pemilik" aktif berisi Nama Lengkap, Email, Password, Ulangi Password. Field, label, placeholder, dan copy tombol "Buat Toko & Mulai" tetap sama persis dengan `onboarding-form.tsx`.

### 12. Struk penjualan (`/pos/receipt/[id]`) — ref 15a, 15b
Layar dalam shell POS: header "Struk Penjualan" + nomor + chip "Penjualan berhasil disimpan". Grid `300px minmax(0,1fr)`.

Kiri: pratinjau struk 300px. **Kertas selalu putih dengan tinta hitam, juga di mode gelap** (`bg-white text-black` di sumber) — jangan ikutkan ke konversi tema. Isi persis `receipt-view.tsx`: logo toko (`max-height:58px`), nama toko 700, alamat (`white-space:pre-line`), "Telp: …", "Struk Penjualan"; garis putus-putus `1px dashed #9a9a9a`; blok No / Tanggal / Kasir / Pelanggan; daftar item dengan nama di baris sendiri lalu `qty x harga` kiri dan subtotal kanan; Subtotal / Diskon / **TOTAL** bold / Bayar (metode) / Kembali; catatan kaki terpusat dari pengaturan toko.

Kanan: panel **Kirim & Cetak** — tombol WhatsApp gambar (`#25D366`), Kirim sebagai Teks, Print Bluetooth + tombol ikon printer browser, status hasil cetak, Transaksi Baru. Lalu panel **Hasil cetak 80 mm**: kertas `302px` di atas latar meja `#dcd8e6` — ini penting karena `@media print` di sumber memaksa `#receipt { width: 80mm }` dan menyembunyikan semua elemen lain, jadi hasil cetak berbeda dari pratinjau layar.

### 13. Mobile — Dashboard & Kasir (390×844) — ref 13a/13b, 14a/14b
Tab bar bawah 62px dengan 5 tujuan: Dashboard · Kasir · Stok · Servis · Menu (ikon 21px + label 9.5px, aktif primary). Semua target sentuh ≥44px.

**Dashboard mobile**: app bar (logo 32px + nama toko + status sinkron + tombol cari 40px) → hero omzet dengan tombol "Buka Kasir" 46px **di dalam hero** → KPI grid 2×2 → panel Tanya Arta ringkas → kartu Penjualan Terbaru 3 baris.

**Kasir mobile**: app bar + cari 46px + tombol scan + chip kategori → grid produk 2 kolom → **bar keranjang menetap di bawah** (count pill, TOTAL mono 17px, tombol Bayar). Menekannya membuka **sheet** `border-radius:20px 20px 0 0` berisi baris keranjang dengan stepper 30px, blok total, 4 metode bayar 58px, field jumlah bayar 46px, keypad 3×4 tombol 42px, blok kembalian, dan tombol Bayar 52px.

**Penting soal constraint mobile.** Kolom konten harus `overflow-y:auto` dan anak yang tidak boleh menyusut (hero, field jumlah bayar, keypad) harus `flex:none`. Item flex kolom mempertahankan `min-height:auto`, **kecuali** yang punya `overflow:hidden` sendiri — akibatnya hero (yang butuh `overflow:hidden` untuk lapisan titiknya) menjadi satu-satunya item yang bisa menyusut dan menyerap seluruh kekurangan tinggi, memotong tombol CTA-nya sampai tinggi 0.

## Interactions & Behavior
- **Nav**: item aktif bila `pathname === href || pathname.startsWith(href + "/")` (sudah ada di `app-shell.tsx`).
- **Hover kartu**: `.card-hover` yang sudah ada — `translateY(-3px)` + bayangan naik, transisi `.18s ease`.
- **Hover tombol primary**: `brightness(1.1)`; active `brightness(.95)` (sudah ada di `buttonVariants`).
- **POS**: klik kartu produk menambah 1 ke keranjang dan ditolak bila melebihi `p.stock`; metode bayar mengubah blok di bawahnya (Tunai → jumlah bayar + uang cepat + kembalian; Kredit → DP + jatuh tempo + sisa piutang + peringatan bila pelanggan belum dipilih); `F2` checkout, `F4` fokus cari.
- **Keypad**: menambah digit ke field jumlah bayar; `000` menambah tiga nol; `⌫` menghapus satu digit. Ini murni tambahan UI untuk layar sentuh — tidak mengubah logika `CurrencyInput`.
- **Filter cepat** (Inventory, Servis, Simulasi, Rakit PC, Piutang): filter baru, implementasikan sebagai query param seperti `SearchBox` yang sudah ada (`?q=`, reset `page`).
- **Offline**: strip status sinkron hanya muncul bila `!online || pending > 0 || needsReview > 0 || syncing` (pertahankan perilaku `useOfflineSync`).
- **Tema warna**: instan via `data-theme` di `<html>` + localStorage, seperti `ColorThemePicker`.

## State Management
Tidak ada state baru yang dibutuhkan selain yang sudah ada di sumber. Tambahan dari redesign:
- `period` untuk toggle tren dashboard (14/30/90 hari) — perlu memperluas `salesTrend`/`serviceTrend` yang sekarang dipanggil dengan `14`.
- `filter` untuk chip filter cepat di layar daftar (query param).
- `keypadValue` untuk keypad POS — cukup dijembatani ke state `paid` yang sudah ada.
- `step` untuk setup wizard dua langkah.
- Progres rakitan (Rakit PC) dan umur tiket (Servis) diturunkan dari data yang sudah ada (`status`, `createdAt`) — tidak perlu kolom baru.

## Assets
- `public/icon-512.png` — ikon brand, dipakai di sidebar (34px), rail, topbar, setup (52px), logo toko di Pengaturan (64px), struk, app bar mobile (32px). Dipakai lewat komponen `<Logo size={n} />` yang sudah ada.
- `public/logo-wordmark.png` — lockup horizontal, dipakai di panel gradien Login lewat `<LogoWordmark />`.
- **Ikon**: seluruhnya `lucide-react` v1.17.0 yang sudah jadi dependency. Yang dipakai: LayoutDashboard, ShoppingCart, Receipt, Clock, Coins, UserRound, Boxes, ShieldCheck, PackageOpen, Building2, Truck, HandCoins, Wrench, Cpu, ClipboardList, Sparkles, Wallet, FileBarChart, Users, Settings, Search, LogOut, Sun, Moon, Plus, Minus, Trash2, Pause, X, ArrowRight, TrendingUp, TriangleAlert, PackagePlus, PackageX, ChartColumn, ChartLine, ArrowUpRight, ArrowDownRight, FileText, Pencil, QrCode, ClipboardCheck, Tags, Upload, Download, ChevronLeft, ChevronRight, ScanLine, CreditCard, Banknote, QrCode, RotateCcw, Delete, Save, KeyRound, ImagePlus, Printer, Bluetooth, MessageCircle, Image, Check, Send.
- **Font**: Archivo dan JetBrains Mono (Google Fonts) — menggantikan Geist Sans/Mono.

## Files
- `ArtaPOS Redesign.dc.html` — seluruh desain dalam satu halaman kanvas. Dibaca dari bawah ke atas: turn 0 berisi konteks dan diagnosis, lalu turn 1 → 10 berisi layar per kelompok, terbaru di atas. Setiap opsi punya id stabil (`1a`, `2a`, `3a`…) yang bisa dirujuk.

Peta id → layar: `1a/2a` Dashboard · `3a/3b` Kasir · `4a/4b` Inventory · `5a/5b` Jasa Servis · `6a/6b` Simulasi Rakitan · `7a/7b` Keuangan · `8a/8b` Piutang · `9a/9b` Login · `10a/10b` Setup · `11a/11b` Rakit PC · `12a/12b` Pengaturan · `13a/13b` Dashboard mobile · `14a/14b` Kasir mobile · `15a/15b` Struk. Akhiran `a` = terang, `b` = gelap.

## Urutan implementasi yang disarankan
1. **Token dan font** — ganti font di `layout.tsx`, tambahkan tema violet di `globals.css` (bisa sebagai `[data-theme="violet"]` baru agar lima tema lama tetap utuh), terapkan ramp muted yang lolos kontras.
2. **Shell** — lengkapi `NAV_GROUPS` yang hilang di render, perbaiki badge nav aktif sesuai aturan yang sudah tertulis, header dengan chip sinkron + shift.
3. **Primitif** — `StatCard` (varian dengan mini-chart dan progress), chip filter, komponen bar chart dengan bar hari-ini yang ditonjolkan.
4. **Kasir** — metode bayar sebagai tombol, keypad, tata letak keranjang. Ini layar dengan dampak terbesar bagi pengguna harian.
5. **Layar daftar** — Inventory, Servis, Simulasi, Rakit PC, Piutang (pola tabel dan kartu sudah seragam).
6. **Keuangan, Pengaturan, Login, Setup, Struk.**
7. **Mobile** — tab bar dan sheet keranjang.
