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
  ShieldCheck,
  PackageOpen,
  Wallet,
  FileBarChart,
  Settings,
  Sparkles,
  ChevronDown,
  Printer,
  Search,
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
      "Kartu statistik menampilkan penjualan hari ini, produk aktif, servis aktif, dan stok habis.",
      "Grafik Tren Penjualan & Tren Jasa Servis menampilkan performa 14 hari terakhir.",
      "Klik kartu atau 'Lihat semua' untuk masuk ke modul terkait.",
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
      "Pelanggan mengumpulkan poin otomatis dari belanja (1 poin per Rp 1.000).",
      "Di halaman edit pelanggan: lihat saldo & riwayat poin, tukar/sesuaikan poin manual.",
    ],
  },
  {
    icon: Wrench,
    title: "Jasa Servis",
    desc: "Kelola tiket servis dari terima sampai diserahkan, lengkap sparepart, foto, dan notifikasi.",
    steps: [
      "Tiket Baru: isi pelanggan (+No. HP untuk lacak), perangkat, keluhan.",
      "Ubah status alur: Diterima → Dikerjakan → Tunggu Sparepart → Selesai → Diserahkan.",
      "Tambah sparepart (memotong stok) & biaya jasa; unggah foto kondisi; catat pembayaran (tunai/transfer/QRIS/kredit).",
      "Tombol 'Beri tahu via WhatsApp' mengirim update status + tautan lacak ke pelanggan.",
    ],
    example: "Servis 'Laptop overheat' → ganti pasta (jasa Rp 100.000) → status Selesai → kirim WA ke pelanggan agar diambil.",
  },
  {
    icon: Search,
    title: "Lacak Servis & Garansi (untuk Pelanggan)",
    desc: "Halaman publik agar pelanggan memantau status sendiri tanpa login.",
    steps: [
      "Bagikan tautan /lacak ke pelanggan (atau lewat tombol WhatsApp).",
      "Pelanggan pilih tab Servis atau Klaim Garansi, masukkan nomor + No. HP → lihat status & estimasi/total biaya.",
    ],
  },
  {
    icon: Cpu,
    title: "Rakit PC (PC Builder)",
    desc: "Buat rakitan dari komponen katalog + jasa rakit.",
    steps: [
      "Rakitan Baru: beri nama & pelanggan, tambah komponen (memotong stok), tetapkan jasa rakit.",
      "Ubah status: Draft → Dirakit → Selesai → Diserahkan; catat pembayaran.",
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
      "Tema Warna: pilih nuansa (Terakota, Mint, Lavender, Sky, Ocean) + mode terang/gelap.",
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
