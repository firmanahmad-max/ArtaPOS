import {
  LogIn,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Coins,
  Clock,
  Boxes,
  ClipboardCheck,
  QrCode,
  Truck,
  Users,
  Wrench,
  Cpu,
  Calculator,
  ShieldCheck,
  PackageOpen,
  Wallet,
  FileBarChart,
  Settings,
  Sparkles,
  ChevronDown,
  Printer,
  Search,
  Images,
  Handshake,
  Recycle,
  BellRing,
  UserRound,
  type LucideIcon,
} from "lucide-react";

interface Section {
  icon: LucideIcon;
  title: string;
  desc: string;
  steps: string[];
  example?: string;
}

const SECTIONS: Section[] = [
  {
    icon: LogIn,
    title: "Memulai — Login & Peran Pengguna",
    desc: "Setiap pengguna masuk dengan email & password. Hak akses menyesuaikan peran.",
    steps: [
      "Buka aplikasi, masukkan email & password pada halaman Masuk.",
      "Peran: Pemilik (akses penuh), Admin (operasional), Kasir (penjualan), Teknisi (servis & rakit PC).",
      "Menu di sidebar otomatis menyesuaikan izin peran Anda.",
    ],
    example: "Kasir hanya melihat menu Penjualan, Shift, Pelanggan, dan Laporan — tidak melihat Keuangan atau Pengaturan.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Ringkasan aktivitas toko hari ini: penjualan, produk, servis aktif, stok habis, tren, dan penjualan terbaru.",
    steps: [
      "Kartu statistik: Penjualan Hari Ini (dengan mini-grafik & perubahan vs kemarin), Produk Aktif (bar cakupan stok), Servis Aktif (rincian per status), dan Stok Habis (pintasan 'Buat pesanan pembelian').",
      "Panel Tren: pilih periode 14 hari / 30 hari / 3 bulan untuk melihat tren Penjualan (ungu) & Jasa Servis (amber) beserta total, rata-rata, dan hari tertinggi.",
      "Panel Tanya Arta & Penjualan Terbaru tampil di kolom kanan; klik kartu atau 'Lihat semua' untuk masuk ke modul terkait.",
    ],
  },
  {
    icon: Sparkles,
    title: "Tanya Arta (Insight Otomatis)",
    desc: "Arta menganalisis data toko dan memberi saran/peringatan otomatis lintas modul — tanpa mengirim data ke luar.",
    steps: [
      "Buka menu Tanya Arta untuk melihat semua insight.",
      "Insight dikelompokkan: Penjualan, Servis, Inventaris, Pembelian, Keuangan, Anomali. Gunakan chip untuk memfilter.",
      "Tiap insight punya tautan aksi (mis. 'Saran pembelian', 'Bayar utang').",
    ],
    example: "Arta memperingatkan: 'Penjualan turun 15% minggu ini', '3 produk kehabisan stok', atau 'Klaim RMA >30 hari di distributor'.",
  },
  {
    icon: ShoppingCart,
    title: "Penjualan (Kasir / POS)",
    desc: "Terminal kasir untuk transaksi penjualan dengan scan barcode, diskon, dan berbagai metode bayar.",
    steps: [
      "Buka menu Penjualan (POS). Cari produk lewat ketik nama/SKU atau scan barcode (kamera/USB scanner).",
      "Klik produk untuk menambah ke keranjang; atur qty dan diskon per item bila perlu.",
      "Pilih pelanggan (opsional, untuk poin & kredit), tambahkan diskon transaksi bila ada.",
      "Pelanggan punya poin? Saldo & nilainya tampil di bawah pilihan pelanggan — tekan \"Pakai poin\" untuk menukarnya sebagai potongan (bisa diubah jumlahnya). Hanya saat online.",
      "Pilih metode bayar: Tunai, Transfer, QRIS, atau Kredit/Tempo. Masukkan jumlah bayar → sistem hitung kembalian.",
      "Klik Bayar → stok terpotong otomatis, struk (INV-xxxxx) siap dicetak/dibagikan.",
    ],
    example: "Jual 'SSD 1TB' + 'RAM 8GB', pelanggan Dewi, tunai Rp 1.600.000 → kembalian Rp 0, Dewi dapat poin, struk tercetak.",
  },
  {
    icon: ShoppingCart,
    title: "Tahan Transaksi & Struk",
    desc: "Simpan sementara keranjang, dan bagikan struk lewat cetak atau WhatsApp.",
    steps: [
      "Tekan 'Tahan' untuk menyimpan keranjang bila pelanggan menunda; buka lagi kapan pun via 'Transaksi Ditahan'.",
      "Setelah bayar, buka struk untuk Cetak (termasuk printer Bluetooth ESC/POS) atau Kirim via WhatsApp.",
    ],
  },
  {
    icon: Receipt,
    title: "Riwayat Penjualan, Void & Retur",
    desc: "Lihat semua transaksi, batalkan (void), atau proses retur sebagian.",
    steps: [
      "Buka Riwayat Jual untuk daftar transaksi + KPI (omzet, jumlah, void).",
      "Klik Detail sebuah transaksi untuk melihat item & pembayaran.",
      "Void: membatalkan transaksi & mengembalikan stok (izin inventaris).",
      "Retur sebagian: pilih item & qty yang dikembalikan → stok bertambah, dana dikembalikan (RTN-xxxxx).",
    ],
  },
  {
    icon: Coins,
    title: "Piutang (Penjualan Kredit)",
    desc: "Jual dengan tempo; catat pelunasan bertahap.",
    steps: [
      "Di kasir, pilih metode Kredit/Tempo (wajib pilih pelanggan), isi DP & tanggal jatuh tempo.",
      "Buka menu Piutang untuk melihat tagihan berjalan & yang lewat tempo.",
      "Buka detail penjualan → 'Terima Pembayaran' untuk mencatat pelunasan.",
    ],
    example: "Jual laptop kredit DP 40%, tempo 30 hari → muncul di Piutang; saat pelanggan bayar sisa, catat hingga lunas.",
  },
  {
    icon: Clock,
    title: "Shift Kasir",
    desc: "Buka & tutup kas per shift, dengan rekonsiliasi tunai.",
    steps: [
      "Awal jaga: 'Buka Shift', isi modal kas awal di laci.",
      "Semua penjualan otomatis tertaut ke shift aktif Anda.",
      "Akhir jaga: 'Tutup Shift', masukkan kas fisik terhitung → sistem tampilkan kas seharusnya & selisih.",
    ],
  },
  {
    icon: Boxes,
    title: "Inventory — Produk, Kategori, Satuan",
    desc: "Kelola katalog produk beserta harga modal/jual, stok, dan garansi.",
    steps: [
      "Buka Inventory → Tambah Produk: isi nama, SKU, barcode, kategori, satuan, harga modal & jual, stok awal, stok minimum, masa garansi.",
      "KPI menampilkan produk aktif, nilai stok, stok menipis & habis.",
      "Kelola Kategori & Satuan lewat menu terkait. Edit/hapus produk kapan pun.",
    ],
    example: "Set 'RAM 8GB' stok minimum 8 → saat stok ≤ 8, muncul peringatan 'Stok Menipis' di dashboard & Tanya Arta.",
  },
  {
    icon: ClipboardCheck,
    title: "Stok Opname & Import Produk (CSV)",
    desc: "Sesuaikan stok fisik dan tambah produk massal.",
    steps: [
      "Stok Opname: buat sesi → hitung stok fisik per produk → Terapkan. Selisih tercatat sebagai penyesuaian.",
      "Import CSV: unggah berkas berisi banyak produk sekaligus; kategori & satuan dibuat otomatis, error dilaporkan per baris.",
    ],
  },
  {
    icon: QrCode,
    title: "Barcode — Scan & Cetak Label",
    desc: "Percepat input dengan barcode dan cetak label sendiri.",
    steps: [
      "Scan: pakai kamera perangkat atau USB scanner (keyboard-wedge) di kasir/pencarian.",
      "Cetak label: buka produk → Label barcode (Code128) untuk ditempel pada barang.",
    ],
  },
  {
    icon: Images,
    title: "Galeri Publik (Etalase Produk Online)",
    desc: "Pajang produk/promo pilihan di halaman publik yang bisa dibagikan — pelanggan lihat foto, spesifikasi & harga, lalu klik WhatsApp bila berminat.",
    steps: [
      "Buka Inventaris → Galeri Publik → Tambah Item. Pilih produk dari katalog (judul & harga terisi otomatis) atau isi manual.",
      "Bisa juga memajang barang Titip Jual: pilih di \"tautkan barang titipan\". Harganya mengikuti Titip Jual dan otomatis disembunyikan saat barang laku/diambil pemilik.",
      "Lengkapi foto (otomatis dikompres), spesifikasi singkat, dan label opsional (Promo/Baru/Unggulan/Diskon/Terlaris).",
      "Simpan — item aktif langsung tampil di galeri publik toko Anda. Sembunyikan/Ubah/Hapus kapan pun.",
      "Bagikan tautan galeri (/galeri/<toko>) ke WhatsApp/sosmed; tombolnya juga muncul di halaman Lacak. Pastikan No. HP toko terisi di Pengaturan agar tombol 'Chat WA' aktif.",
      "Pelanggan menekan 'Saya Berminat (Chat WA)' → langsung chat WhatsApp berisi nama produk; atau 'Bagikan' untuk meneruskan ke orang lain.",
      "Selama ada pajangan aktif, struk penjualan & Tanda Titip Jual yang dikirim via WhatsApp otomatis menyertakan tautan galeri.",
      "Pantau kartu 'Kunjungan dari Tautan WhatsApp' (30 hari) di halaman Galeri: berapa kali halaman lacak dibuka dari WA, berapa yang lanjut ke galeri, dan kunjungan galeri dari struk/tanda titip.",
    ],
    example: "Pajang 'SSD 1TB NVMe' dengan label Promo + foto → bagikan tautan galeri ke status WA → pelanggan klik Chat WA dan transaksi dimulai.",
  },
  {
    icon: Handshake,
    title: "Titip Jual (Barang Titipan Pelanggan)",
    desc: "Catat barang/komponen milik pelanggan yang dititipkan untuk ditawarkan di toko, lalu kirim tanda titip jual ke WhatsApp mereka.",
    steps: [
      "Buka Inventaris → Titip Jual → Titipan Baru. Pilih pelanggan terdaftar (nama & No. WA terisi otomatis) atau isi manual.",
      "Atur Komisi Toko: persen dari harga laku atau nominal tetap per barang. Pratinjau langsung menunjukkan komisi & hak pemilik.",
      "Tambah barang: jenis komponen (mis. VGA, RAM), merk/tipe, no. seri (opsional, bukti identitas barang), keterangan kondisi, dan harga jual yang diinginkan.",
      "Simpan → tanda titip jual (TJ-xxxxx) tampil: kirim ke WhatsApp pemilik (gambar/teks) atau cetak.",
      "Jual dari Kasir: buka tab \"Titipan\" di POS (atau scan no. seri), tambahkan ke keranjang seperti produk biasa, lalu bayar. Hanya bisa saat online.",
      "Setelah laku: komisi otomatis jadi laba toko di laporan Keuangan, sisanya tercatat sebagai Hak Pemilik (belum dibayar). Bayar ke pemilik lalu tekan \"Bayar hak pemilik\" di detail titipan.",
      "Kirim ulang tanda titip ke pemilik sebagai laporan: berisi rincian laku, komisi, hak pemilik, dan status pembayarannya.",
      "Pajang di Galeri Publik: tekan \"Tampilkan di Galeri\" pada barang yang masih dititipkan (atau pilih barang titipan di form Galeri untuk menambahkan foto). Harga mengikuti Titip Jual, dan barang otomatis hilang dari galeri saat laku atau diambil kembali.",
      "Void/retur penjualan mengembalikan barang ke \"Dititipkan\". Bila hak pemilik sudah dibayar, batalkan pembayarannya dulu.",
    ],
    example: "Pak Fajar menitip VGA Rp 3.500.000 dengan komisi 10% → laku di kasir (diskon Rp 100.000) seharga Rp 3.400.000 → komisi toko Rp 340.000, hak Pak Fajar Rp 3.060.000 → bayar & tandai dibayar.",
  },
  {
    icon: Recycle,
    title: "Barang Bekas (Second Milik Toko)",
    desc: "Kelola laptop/komponen bekas milik toko per unit — kondisi, harga beli & jual, garansi — lalu jual lewat kasir dan pajang di Galeri.",
    steps: [
      "Buka Inventaris → Barang Bekas → Tambah Barang Bekas. Isi jenis, nama/tipe, no. seri (opsional), spesifikasi ringkas.",
      "Pilih Grade kondisi (A Seperti baru · B Baik · C Cukup · D Ada minus), tulis keterangan kondisi/minus dan kelengkapan (charger, dus, dll.).",
      "Isi harga beli (modal) & harga jual — margin tampil langsung. Pilih garansi toko (tanpa/7 hari/1 bulan/3 bulan atau isi sendiri).",
      "Catat asal barang (beli dari pelanggan, tukar tambah, supplier, unit servis tak diambil) & tanggal masuk. Nomor BK-xxxxx dibuat otomatis.",
      "Cetak label (tombol Label) — barcode berisi no. BK yang bisa di-scan langsung di kasir.",
      "Jual dari Kasir: buka tab \"Bekas\" di POS (atau scan no. BK/no. seri). Struk mencantumkan \"Bekas, Grade …, garansi …\". Hanya bisa saat online.",
      "Laba otomatis masuk Keuangan: HPP = harga beli, jadi laba kotor = harga jual − harga beli. Harga beli ikut tercatat di ringkasan pembelian.",
      "Pajang di Galeri Publik: tekan \"Tampilkan di Galeri\" di detail barang (deskripsi grade, kondisi & garansi terisi otomatis; tambah foto di menu Galeri). Barang otomatis hilang dari galeri saat laku atau ditarik.",
      "Pantau chip \"Lama >60 hari\" untuk barang yang perlu dipromosikan/turun harga. \"Tarik dari penjualan\" bila barang rusak atau dipakai sendiri.",
      "Void/retur penjualan mengembalikan barang ke \"Tersedia\" (dan muncul lagi di galeri).",
    ],
    example: "Beli ThinkPad T480 dari pelanggan Rp 3.000.000 → catat Grade B, baterai 82%, garansi 1 bulan, jual Rp 3.600.000 → pajang di Galeri → laku di kasir → laba kotor Rp 600.000 tercatat otomatis.",
  },
  {
    icon: Truck,
    title: "Pembelian & Utang",
    desc: "Catat barang masuk dari supplier; kelola utang pembelian.",
    steps: [
      "Buka Pembelian → Pembelian Baru: pilih supplier, tambah produk & qty beli, harga modal → stok bertambah & harga modal ter-update (PB-xxxxx).",
      "Pilih status bayar: Lunas, Sebagian, atau Belum bayar (menimbulkan utang).",
      "Menu Utang menampilkan tagihan supplier & yang lewat tempo; catat pembayaran di detail pembelian.",
      "Saran Pembelian: sistem menyarankan produk yang perlu di-restock (stok ≤ minimum) — bisa langsung jadi pembelian.",
    ],
  },
  {
    icon: Users,
    title: "Supplier & Pelanggan (Poin Loyalitas)",
    desc: "Kelola kontak supplier dan data pelanggan beserta poin.",
    steps: [
      "Tambah/edit Supplier & Pelanggan lewat menu masing-masing.",
      "Pelanggan mengumpulkan poin otomatis dari belanja (1 poin per Rp 1.000 yang dibayar).",
      "Atur nilai poin di Pengaturan → Program Poin Member (mis. 1 poin = Rp 10 = cashback 1%) & minimal tukar (mis. 100 poin). Nilai 0 = penukaran nonaktif.",
      "Sumber poin: belanja di kasir ×1, rakit PC ×1, Jasa Servis — biaya jasa ×2 (bisa diatur 1–3 di Pengaturan) & sparepart ×1. Barang titip jual tidak menghasilkan poin. Poin servis, rakit PC & penjualan kredit diberikan saat pembayaran diterima (DP dulu, sisanya saat pelunasan).",
      "Poin ditukar sebagai potongan di kasir, atau di kartu Biaya tiket servis/rakit PC (tombol \"Pakai poin\", bisa dibatalkan). Struk & nota mencantumkan poin ditukar, poin didapat, saldo & nilainya.",
      "Halaman Pelanggan menampilkan total poin beserta nilai rupiahnya (kewajiban potongan toko) & pemegang poin terbanyak.",
      "Mau mulai program di tanggal tertentu (mis. awal bulan depan) dari nol? Pengaturan → Program Poin Member → Jadwal Mulai & Reset: pilih tanggal, centang \"Nolkan poin semua pelanggan\", Simpan. Sampai tanggal itu belanja belum menghasilkan poin & struk pelanggan terdaftar menampilkan pengumuman tanggal mulainya; program aktif otomatis di tanggal tersebut (atau tekan \"Mulai sekarang\").",
      "Di halaman edit pelanggan: lihat saldo, nilai & riwayat poin; tukar manual (mis. hadiah) atau sesuaikan poin. Void penjualan otomatis mengembalikan poin yang ditukar & menarik poin yang didapat.",
    ],
  },
  {
    icon: Wrench,
    title: "Jasa Servis",
    desc: "Kelola tiket servis dari terima sampai diserahkan, lengkap sparepart, foto, dan notifikasi.",
    steps: [
      "Tiket Baru: isi pelanggan (+No. HP untuk lacak), perangkat, keluhan. No. HP yang sudah terdaftar otomatis ditautkan ke member; bila belum, centang \"Daftarkan sebagai member\" (dapat poin & pengingat servis).",
      "Ubah status alur: Diterima → Dikerjakan → Tunggu Sparepart → Selesai → Diserahkan.",
      "Tambah sparepart (memotong stok) & biaya jasa; unggah foto kondisi; catat pembayaran (tunai/transfer/QRIS/kredit).",
      "Tombol 'Beri tahu via WhatsApp' mengirim update status + tautan lacak ke pelanggan.",
    ],
    example: "Servis 'Laptop overheat' → ganti pasta (jasa Rp 100.000) → status Selesai → kirim WA ke pelanggan agar diambil.",
  },
  {
    icon: BellRing,
    title: "Katalog Jasa & Pengingat Servis Berkala",
    desc: "Ingatkan pelanggan untuk perawatan rutin (mis. cleaning & repaste tiap 6 bulan) — peluang servis berulang.",
    steps: [
      "Buka Jasa Servis → Katalog Jasa. Tekan \"Tambah contoh jasa\" atau buat sendiri: nama jasa, harga standar, dan interval pengingat (3/6/12 bulan, atau tidak berkala).",
      "Di detail tiket, saat menambah jasa pilih dari Katalog Jasa (nama & harga terisi otomatis) — inilah yang dicatat sebagai riwayat perawatan perangkat.",
      "Setelah tiket Selesai/Diserahkan, pelanggan otomatis masuk Layanan → Pengingat Servis ketika jatuh tempo (tanggal servis + interval).",
      "Tekan \"Ingatkan via WA\": pesan siap kirim (menyebut perangkat, jasa & bonus poin bila aktif) lalu otomatis ditandai sudah diingatkan. \"Lewati\" bila tak perlu.",
      "Pelanggan yang datang lagi untuk jasa yang sama tercatat sebagai \"Kembali servis\" — ukur keberhasilan pengingat. Tanya Arta juga memberi tahu bila ada yang jatuh tempo.",
      "Hormati privasi: di data pelanggan, hapus centang \"Bersedia dihubungi via WhatsApp\" bila pelanggan menolak — tombol WA tak akan muncul.",
      "Pelanggan → \"Tautkan riwayat lama\" menautkan tiket servis lama ke member berdasarkan No. HP yang sama.",
    ],
    example: "Dewi cleaning laptop 28 Maret (jasa katalog 6 bulan) → 28 September muncul di Pengingat → klik Ingatkan via WA → Dewi datang 17 Oktober → tercatat Kembali servis.",
  },
  {
    icon: Search,
    title: "Lacak Servis & Garansi (untuk Pelanggan)",
    desc: "Halaman publik agar pelanggan memantau status sendiri tanpa login.",
    steps: [
      "Bagikan tautan /lacak ke pelanggan (atau lewat tombol WhatsApp).",
      "Halaman lacak juga menampilkan promo (diatur di Pengaturan) & tombol Galeri Publik toko Anda. Pesan WhatsApp status/nota servis & klaim RMA otomatis mengajak pelanggan melihatnya — hanya bila memang ada promo/galeri.",
      "Pelanggan pilih tab Servis atau Klaim Garansi, masukkan nomor + No. HP → lihat status & estimasi/total biaya.",
    ],
  },
  {
    icon: UserRound,
    title: "Portal Member (Poin & Rekam Servis Pelanggan)",
    desc: "Link pribadi untuk pelanggan terdaftar: cek poin, riwayat servis per perangkat, jadwal perawatan berikutnya, garansi & belanja — tanpa password.",
    steps: [
      "Buka Pelanggan → edit pelanggan → kartu Portal Pelanggan → \"Buat link portal\" atau \"Buat & kirim via WA\".",
      "Link juga otomatis ikut di struk, nota servis & pesan Pengingat Servis yang dikirim via WhatsApp ke member (baris \"Cek poin & riwayat servis Anda\").",
      "Pelanggan membuka link → melihat saldo & nilai poin, servis yang sedang diproses, rekam servis per perangkat (keluhan, diagnosa, jasa/part) + perkiraan perawatan berikutnya, garansi & klaim, riwayat belanja, rakit PC, dan titip jual.",
      "Tidak menampilkan harga modal atau data internal toko. Halaman tidak diindeks mesin pencari.",
      "Link bocor ke orang lain? Tekan \"Buat ulang\" — link lama langsung tidak berlaku. \"Nonaktifkan\" untuk menutup akses.",
    ],
    example: "Dewi menerima struk via WA → klik link member → melihat 9.727 poin (senilai Rp 97.270) & jadwal cleaning laptop berikutnya 17 April 2027.",
  },
  {
    icon: Calculator,
    title: "Simulasi Rakitan (Penawaran)",
    desc: "Susun penawaran rakitan PC lengkap dengan bujet & margin — tanpa memotong stok.",
    steps: [
      "Simulasi Baru: beri nama & pelanggan, tetapkan bujet (opsional), tambah komponen dari katalog (autofill harga) atau ketik bebas.",
      "Sisa bujet, total jual, modal, dan margin (Rp & %) dihitung otomatis saat Anda menambah/mengubah komponen.",
      "Kirim penawaran ke pelanggan via WhatsApp — hanya daftar komponen & TOTAL rakitan (harga per komponen disembunyikan).",
      "Bila disetujui: 'Impor ke Rakit PC' — komponen berstok cukup langsung dialokasikan (potong stok), sisanya jadi baris non-stok.",
    ],
    example: "Tawarkan 'PC Gaming 10jt': tambah CPU, GPU, RAM… sisa bujet turun tiap komponen; kirim WA berisi daftar + total Rp 9.800.000.",
  },
  {
    icon: Cpu,
    title: "Rakit PC (PC Builder)",
    desc: "Buat rakitan dari komponen katalog + jasa rakit, dengan diskon & nota.",
    steps: [
      "Rakitan Baru: beri nama & pelanggan, tambah komponen (memotong stok), tetapkan jasa rakit.",
      "Ubah status: Draft → Dirakit → Selesai → Diserahkan; beri diskon bila perlu; catat pembayaran.",
      "Cetak Nota: rincian komponen tanpa harga per item, hanya total rakitan — bagikan via WhatsApp (gambar/teks) atau cetak.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Garansi & Nomor Seri",
    desc: "Daftarkan unit ber-nomor seri dan lacak masa garansinya.",
    steps: [
      "Daftarkan Garansi: pilih produk, isi nomor seri, pelanggan, dan masa garansi.",
      "Daftar unit menampilkan status Aktif/Kedaluwarsa/Diklaim; cari via nomor seri/produk/pelanggan.",
      "Tombol Klaim untuk menandai unit diklaim; tombol RMA untuk mengirim unit ke distributor.",
    ],
  },
  {
    icon: PackageOpen,
    title: "Klaim RMA (Garansi ke Distributor)",
    desc: "Kirim barang rusak ke distributor untuk klaim garansi, dengan tiket lacak pelanggan.",
    steps: [
      "Klaim Baru: isi produk/SN/kerusakan, distributor & resi, No. HP pelanggan; unggah foto saat dikirim.",
      "Saat barang kembali: tandai hasil (Diservis / Ganti unit / Refund) & tanggal terima.",
      "Kirim update ke pelanggan via WhatsApp; pelanggan bisa lacak di /lacak (tab Klaim Garansi).",
    ],
  },
  {
    icon: Wallet,
    title: "Keuangan — Biaya, Laba-Rugi & Kirim Laporan",
    desc: "Catat biaya operasional dan lihat ringkasan keuangan yang bisa dibandingkan & dikirim.",
    steps: [
      "Catat Biaya: kategori (Sewa/Listrik/Gaji/…), keterangan, jumlah, tanggal.",
      "Pilih periode: Hari Ini / Bulan Ini / Bulan Lalu / Tahun Ini — lihat pendapatan, laba kotor, laba bersih, biaya.",
      "Kartu Perbandingan menampilkan perubahan terhadap periode sebelumnya (naik/turun).",
      "Kirim ringkasan ke WhatsApp (pemilik/grup) atau salin teksnya.",
    ],
    example: "Akhir bulan muncul pengingat di Dashboard untuk kirim laporan bulanan via WhatsApp.",
  },
  {
    icon: FileBarChart,
    title: "Laporan & Analitik",
    desc: "Analisis performa: tren, produk terlaris, stok menipis & stok mati.",
    steps: [
      "Buka Laporan untuk KPI + grafik tren penjualan 14 hari.",
      "Lihat Produk Terlaris (30 hari), Stok Menipis/Habis, dan Stok Mati (tak terjual 60 hari).",
    ],
  },
  {
    icon: Settings,
    title: "Pengaturan — Profil, Tema, Logo & Lisensi",
    desc: "Sesuaikan identitas toko, tampilan, dan aktivasi lisensi.",
    steps: [
      "Profil Toko: nama, alamat, telepon, catatan kaki struk, logo, foto promo halaman lacak.",
      "Tema Warna: pilih nuansa (Violet bawaan, Terakota, Mint, Lavender, Sky, Ocean) + mode terang/gelap.",
      "Lisensi: lihat status paket. Punya kode aktivasi dari admin? Masukkan di 'Tukar Kode' untuk mengaktifkan/memperpanjang.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Dashboard Admin (Operator Platform)",
    desc: "Khusus admin platform (lintas semua toko) — kelola lisensi, promo, dan akses.",
    steps: [
      "Buka Dashboard Admin dari tautan di sidebar (hanya muncul untuk super-admin).",
      "Toko & Lisensi: ubah paket/status/masa berlaku lisensi tiap toko, aktif/nonaktifkan toko.",
      "Kode Promo: buat kode aktivasi lisensi (paket + durasi + kuota) untuk diberikan ke toko.",
      "Akses Admin: beri/cabut akses admin platform ke pengguna tepercaya.",
    ],
  },
  {
    icon: Printer,
    title: "Cetak Struk Bluetooth & Mode Offline",
    desc: "Cetak ke printer termal dan tetap jalan saat internet bermasalah.",
    steps: [
      "Cetak Bluetooth: pada struk, pilih Cetak → sambungkan printer ESC/POS via Web Bluetooth.",
      "PWA/Offline: pasang aplikasi ke layar utama; indikator akan memberitahu bila Anda sedang offline.",
    ],
  },
];

/** Panduan penggunaan lengkap (accordion native <details>, tanpa JS). */
export function Manual() {
  return (
    <div className="space-y-2">
      {SECTIONS.map((s, i) => {
        const Icon = s.icon;
        return (
          <details key={i} className="group rounded-lg border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <span className="flex-1 font-medium">{s.title}</span>
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t p-4 text-sm">
              <p className="text-muted-foreground">{s.desc}</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground marker:text-primary">
                {s.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
              {s.example && (
                <p className="rounded-md bg-primary/5 p-3 text-muted-foreground">
                  <span className="font-semibold text-foreground">Contoh: </span>
                  {s.example}
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
