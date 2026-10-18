/**
 * Konten Harian Dashboard — kutipan motivasi bisnis, tips teknologi & fakta IT yang
 * bisa dibagikan ke Status WA / Story IG sebagai gambar bermerek toko.
 * Semua konten ditulis/dikurasi di sini (orisinal, tanpa mengambil berita pihak lain)
 * dan bergilir otomatis per hari WIB. Murni (tanpa I/O), unit-tested.
 */

export type DailyKind = "motivasi" | "tips" | "fakta" | "gaming" | "promo";
/** Jenis yang punya pustaka bawaan (promo hanya dari toko). */
export type BuiltinKind = Exclude<DailyKind, "promo">;

export interface DailyItem {
  /** Judul pendek untuk gambar story. `emphasis` = bagian judul yang diberi warna aksen. */
  title: string;
  emphasis?: string;
  /** Kalimat lengkap (kartu dashboard + teks salin). */
  body: string;
  /** Tips: 3 langkah singkat. */
  steps?: [string, string, string];
  /** Fakta: perbandingan dua angka (persentase panjang batang 0–100). */
  compare?: { a: { label: string; value: string; pct: number }; b: { label: string; value: string; pct: number } };
  /** Ajakan di kaki gambar (jasa/produk toko yang relevan). */
  cta: string;
  /** PROMO bertaut produk inventory: harga & stok tampil di gambar. */
  product?: PromoProduct;
}

export interface PromoProduct {
  name: string;
  /** Harga jual normal. */
  price: number;
  /** Harga promo (null/kosong = tanpa potongan). */
  promoPrice?: number | null;
  stock: number;
  /** Foto produk dari Galeri Publik (data URL), bila ada. */
  photo?: string | null;
}

/** Harga yang dibayar pelanggan: harga promo bila lebih murah dari harga normal. */
export function effectivePrice(p: PromoProduct): number {
  return p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.price ? p.promoPrice : p.price;
}

/** Persen hemat (dibulatkan), 0 bila tanpa potongan. */
export function discountPct(p: PromoProduct): number {
  const eff = effectivePrice(p);
  return p.price > 0 && eff < p.price ? Math.round(((p.price - eff) / p.price) * 100) : 0;
}

/** Label stok untuk gambar promo. */
export function stockLabel(stock: number): string {
  if (stock <= 0) return "Stok habis";
  if (stock <= 5) return `Sisa ${stock} unit — stok terbatas`;
  return "Stok tersedia";
}

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export const DAILY_KIND_META: Record<DailyKind, { label: string; kicker: string }> = {
  motivasi: { label: "Motivasi", kicker: "MOTIVASI BISNIS" },
  tips: { label: "Tips IT", kicker: "TIPS TEKNOLOGI" },
  fakta: { label: "Fakta IT", kicker: "TAHUKAH ANDA?" },
  gaming: { label: "PC Gaming", kicker: "PC GAMING" },
  promo: { label: "Promo", kicker: "PROMO TOKO" },
};

const CTA_GENERAL = "Butuh servis atau upgrade?";

export const DAILY_CONTENT: Record<BuiltinKind, DailyItem[]> = {
  motivasi: [
    { title: "Pelanggan yang puas adalah iklan terbaik.", emphasis: "iklan terbaik.", body: "Pelanggan yang puas adalah iklan terbaik — dan satu-satunya iklan yang tidak perlu dibayar.", cta: CTA_GENERAL },
    { title: "Kepercayaan dibangun dari janji kecil yang ditepati.", emphasis: "ditepati.", body: "Kepercayaan pelanggan tidak lahir dari promosi besar, tapi dari janji kecil yang selalu ditepati: estimasi yang jujur, servis tepat waktu.", cta: CTA_GENERAL },
    { title: "Jual solusi, bukan sekadar barang.", emphasis: "solusi,", body: "Pelanggan tidak membeli laptop — mereka membeli kelancaran kerja. Jual solusi, bukan sekadar barang.", cta: "Konsultasi kebutuhan laptop/PC Anda" },
    { title: "Konsisten mengalahkan sempurna.", emphasis: "Konsisten", body: "Usaha yang konsisten setiap hari lebih kuat daripada menunggu waktu yang sempurna untuk mulai.", cta: CTA_GENERAL },
    { title: "Pelayanan ramah itu gratis, dampaknya mahal.", emphasis: "dampaknya mahal.", body: "Senyum, salam, dan penjelasan yang sabar tidak memakan biaya — tapi membuat pelanggan kembali lagi dan lagi.", cta: CTA_GENERAL },
    { title: "Satu pelanggan setia bernilai seribu kunjungan.", emphasis: "setia", body: "Merawat satu pelanggan setia jauh lebih berharga daripada mengejar seribu pengunjung yang hanya lewat.", cta: "Gabung jadi member, kumpulkan poinnya" },
    { title: "Masalah pelanggan adalah peluang kita.", emphasis: "peluang", body: "Setiap keluhan adalah kesempatan menunjukkan bahwa kita benar-benar peduli dan bisa diandalkan.", cta: CTA_GENERAL },
    { title: "Kualitas diingat lama setelah harga dilupakan.", emphasis: "Kualitas", body: "Harga murah cepat terlupakan, tapi kualitas pengerjaan akan diingat lama oleh pelanggan.", cta: "Servis bergaransi, sparepart berkualitas" },
    { title: "Tumbuh pelan tetap tumbuh.", emphasis: "tetap tumbuh.", body: "Tidak apa-apa tumbuh pelan, asal tidak berhenti. Setiap transaksi kecil adalah langkah maju.", cta: CTA_GENERAL },
    { title: "Jujur itu strategi bisnis jangka panjang.", emphasis: "jangka panjang.", body: "Diagnosa yang jujur mungkin mengurangi untung hari ini, tapi menambah kepercayaan untuk bertahun-tahun.", cta: "Cek kondisi perangkat Anda, gratis konsultasi" },
    { title: "Cepat merespons, cepat dipercaya.", emphasis: "dipercaya.", body: "Balasan chat yang cepat dan jelas membuat pelanggan merasa dihargai sejak pesan pertama.", cta: "Chat kami, kami balas secepatnya" },
    { title: "Rapi di belakang, lancar di depan.", emphasis: "lancar", body: "Stok tercatat rapi dan kas jelas membuat pelayanan di meja kasir jauh lebih lancar.", cta: CTA_GENERAL },
    { title: "Dengarkan dulu, baru tawarkan.", emphasis: "Dengarkan", body: "Pahami kebutuhan pelanggan sebelum menawarkan produk — rekomendasi yang tepat lebih mudah diterima.", cta: "Ceritakan kebutuhan Anda, kami bantu pilihkan" },
    { title: "Garansi adalah janji yang bisa dipegang.", emphasis: "bisa dipegang.", body: "Garansi bukan sekadar stiker — itu janji tanggung jawab kami atas setiap barang dan pengerjaan.", cta: "Produk & servis bergaransi resmi toko" },
    { title: "Hari ini lebih baik dari kemarin.", emphasis: "lebih baik", body: "Tidak perlu lompatan besar. Cukup jadi sedikit lebih baik dari kemarin, setiap hari.", cta: CTA_GENERAL },
    { title: "Pelanggan kembali karena merasa diingat.", emphasis: "diingat.", body: "Mengingat nama dan riwayat servis pelanggan membuat mereka merasa istimewa — dan ingin kembali.", cta: "Cek riwayat servis Anda di portal member" },
    { title: "Untung kecil yang sering mengalahkan untung besar yang jarang.", emphasis: "sering", body: "Perputaran yang sehat lebih penting daripada margin besar yang membuat barang lama terjual.", cta: CTA_GENERAL },
    { title: "Reputasi dibangun bertahun, rusak sehari.", emphasis: "bertahun,", body: "Jaga setiap detail pelayanan, karena reputasi adalah aset toko yang paling mahal.", cta: CTA_GENERAL },
    { title: "Belajar teknologi baru, layani lebih baik.", emphasis: "layani lebih baik.", body: "Teknologi terus berubah. Toko yang terus belajar akan selalu bisa memberi saran terbaik.", cta: "Update perangkat Anda bersama kami" },
    { title: "Kerja tim membuat toko kecil terasa besar.", emphasis: "terasa besar.", body: "Kasir, teknisi, dan admin yang kompak membuat pelanggan merasakan pelayanan kelas atas.", cta: CTA_GENERAL },
    { title: "Catat semua, putuskan dengan data.", emphasis: "dengan data.", body: "Keputusan terbaik lahir dari catatan yang rapi, bukan dari tebakan.", cta: CTA_GENERAL },
    { title: "Pelanggan tidak butuh sempurna, mereka butuh peduli.", emphasis: "peduli.", body: "Kesalahan bisa terjadi. Yang membedakan adalah seberapa peduli kita memperbaikinya.", cta: CTA_GENERAL },
    { title: "Waktu pelanggan itu berharga.", emphasis: "berharga.", body: "Servis tepat waktu dan kabar status yang jelas adalah bentuk menghargai waktu pelanggan.", cta: "Lacak status servis Anda kapan saja" },
    { title: "Mulai dari yang ada, lakukan yang bisa.", emphasis: "lakukan yang bisa.", body: "Tidak perlu menunggu modal besar. Maksimalkan apa yang ada hari ini.", cta: CTA_GENERAL },
    { title: "Rekomendasi teman lebih kuat dari iklan.", emphasis: "lebih kuat", body: "Pelanggan yang puas akan bercerita ke teman. Itulah pemasaran paling dipercaya.", cta: "Ajak teman, sama-sama untung" },
    { title: "Disiplin kecil, hasil besar.", emphasis: "hasil besar.", body: "Tutup kas tepat, cek stok rutin, balas chat cepat — disiplin kecil yang membesarkan usaha.", cta: CTA_GENERAL },
    { title: "Pelayanan purna jual adalah penjualan berikutnya.", emphasis: "penjualan berikutnya.", body: "Perhatian setelah transaksi membuat pelanggan memilih kita lagi untuk pembelian berikutnya.", cta: CTA_GENERAL },
    { title: "Fokus pada yang bisa dikendalikan.", emphasis: "dikendalikan.", body: "Pasar bisa naik turun, tapi kualitas pelayanan sepenuhnya ada di tangan kita.", cta: CTA_GENERAL },
    { title: "Setiap transaksi adalah awal hubungan.", emphasis: "awal hubungan.", body: "Jangan anggap transaksi sebagai akhir — itu awal hubungan panjang dengan pelanggan.", cta: "Jadi member, nikmati poin setiap belanja" },
    { title: "Syukuri hari ini, siapkan hari esok.", emphasis: "hari esok.", body: "Rayakan pencapaian hari ini, lalu siapkan strategi untuk hari esok yang lebih baik.", cta: CTA_GENERAL },
  ],
  tips: [
    { title: "Laptop cepat panas?", emphasis: "panas?", body: "Laptop cepat panas biasanya tanda kipas berdebu & thermal paste mengering. Rawat rutin agar performa stabil.", steps: ["Bersihkan kipas & ventilasi", "Ganti thermal paste", "Ulangi tiap 6–12 bulan"], cta: "Jasa cleaning & repaste" },
    { title: "Baterai laptop lebih awet.", emphasis: "lebih awet.", body: "Baterai lithium paling awet bila tidak sering dibiarkan 0% atau terus-menerus panas.", steps: ["Hindari sering sampai 0%", "Jauhkan dari panas berlebih", "Aktifkan mode hemat baterai"], cta: "Cek kesehatan baterai laptop Anda" },
    { title: "PC terasa lambat?", emphasis: "lambat?", body: "Kecepatan PC sering tertahan oleh HDD lama atau RAM yang pas-pasan.", steps: ["Cek penggunaan disk & RAM", "Ganti HDD ke SSD", "Tambah RAM bila perlu"], cta: "Upgrade SSD & RAM di sini" },
    { title: "Backup data itu wajib.", emphasis: "wajib.", body: "Kerusakan penyimpanan bisa terjadi tanpa tanda. Simpan data penting di lebih dari satu tempat.", steps: ["Simpan di 2 media berbeda", "Satu salinan di cloud", "Jadwalkan backup rutin"], cta: "Butuh hard disk / SSD eksternal?" },
    { title: "Amankan akun dengan 2FA.", emphasis: "2FA.", body: "Verifikasi dua langkah membuat akun jauh lebih sulit dibobol walau kata sandi bocor.", steps: ["Aktifkan 2FA di akun penting", "Pakai aplikasi autentikator", "Simpan kode cadangan"], cta: CTA_GENERAL },
    { title: "Kata sandi kuat, data aman.", emphasis: "data aman.", body: "Kata sandi panjang & berbeda untuk setiap akun adalah pertahanan pertama.", steps: ["Minimal 12 karakter", "Beda untuk tiap akun", "Pakai password manager"], cta: CTA_GENERAL },
    { title: "Jangan abaikan update.", emphasis: "update.", body: "Pembaruan sistem & aplikasi menutup celah keamanan yang sering dimanfaatkan penjahat siber.", steps: ["Aktifkan update otomatis", "Restart setelah update", "Perbarui driver penting"], cta: CTA_GENERAL },
    { title: "Printer tinta macet?", emphasis: "macet?", body: "Head printer tinta mudah tersumbat bila jarang dipakai.", steps: ["Cetak minimal seminggu sekali", "Jalankan head cleaning", "Pakai tinta berkualitas"], cta: "Servis & isi ulang printer" },
    { title: "WiFi lemot di rumah?", emphasis: "lemot", body: "Posisi router sangat menentukan kekuatan sinyal di seluruh ruangan.", steps: ["Taruh router di tengah & tinggi", "Jauhkan dari tembok tebal", "Pertimbangkan router WiFi 6"], cta: "Cari router yang pas? Tanya kami" },
    { title: "Rawat keyboard laptop.", emphasis: "keyboard", body: "Remah makanan & tumpahan minuman adalah penyebab utama tombol keyboard rusak.", steps: ["Jauhkan minuman", "Bersihkan dengan kuas lembut", "Pakai pelindung keyboard"], cta: "Ganti keyboard laptop di sini" },
    { title: "Layar laptop lebih awet.", emphasis: "lebih awet.", body: "Tekanan pada panel saat menutup laptop bisa merusak layar perlahan.", steps: ["Tutup dari tengah, bukan pojok", "Jangan taruh benda di keyboard", "Bersihkan dengan kain mikrofiber"], cta: "Servis & ganti layar laptop" },
    { title: "Hati-hati link phishing.", emphasis: "phishing.", body: "Pesan berhadiah atau mendesak sering berisi link palsu untuk mencuri data.", steps: ["Cek alamat situs dengan teliti", "Jangan isi OTP ke siapa pun", "Laporkan pesan mencurigakan"], cta: CTA_GENERAL },
    { title: "Pilih SSD yang tepat.", emphasis: "tepat.", body: "Pastikan slot di laptop/PC mendukung jenis SSD sebelum membeli.", steps: ["Cek slot: SATA atau NVMe", "Pilih kapasitas sesuai kebutuhan", "Pasang & migrasi data"], cta: "Konsultasi upgrade SSD gratis" },
    { title: "Upgrade RAM dengan benar.", emphasis: "dengan benar.", body: "RAM yang cocok dengan motherboard memberi peningkatan performa tanpa masalah.", steps: ["Cek tipe & kecepatan RAM", "Gunakan pasangan dual channel", "Pastikan slot tersedia"], cta: "Upgrade RAM laptop & PC" },
    { title: "Charger asli itu penting.", emphasis: "penting.", body: "Charger palsu atau tidak sesuai daya bisa merusak baterai dan motherboard.", steps: ["Pakai charger sesuai watt", "Hindari kabel rusak", "Cabut saat petir"], cta: "Charger laptop original tersedia" },
    { title: "PC rakitan tetap dingin.", emphasis: "tetap dingin.", body: "Aliran udara casing yang baik menjaga komponen awet dan performa stabil.", steps: ["Atur kipas masuk & keluar", "Rapikan kabel", "Bersihkan debu tiap 3–6 bulan"], cta: "Rakit PC bersama kami" },
    { title: "Laptop kena air?", emphasis: "kena air?", body: "Tindakan cepat menentukan peluang perangkat bisa diselamatkan.", steps: ["Matikan & cabut daya segera", "Jangan dinyalakan dulu", "Bawa ke teknisi secepatnya"], cta: "Servis laptop kena cairan" },
    { title: "Bersihkan storage rutin.", emphasis: "rutin.", body: "Penyimpanan yang hampir penuh membuat sistem lambat dan update gagal.", steps: ["Hapus file sementara", "Copot aplikasi tak terpakai", "Sisakan ruang ±20%"], cta: CTA_GENERAL },
    { title: "Aktifkan antivirus bawaan.", emphasis: "antivirus", body: "Perlindungan bawaan sistem operasi sudah cukup kuat bila selalu aktif & diperbarui.", steps: ["Pastikan proteksi aktif", "Scan berkala", "Hindari software bajakan"], cta: CTA_GENERAL },
    { title: "Monitor nyaman di mata.", emphasis: "nyaman di mata.", body: "Posisi dan pencahayaan layar memengaruhi kelelahan mata saat bekerja lama.", steps: ["Atas layar sejajar mata", "Jarak ±50–70 cm", "Istirahat tiap 20 menit"], cta: "Cari monitor yang nyaman?" },
    { title: "Siapkan laptop untuk kuliah.", emphasis: "kuliah.", body: "Spesifikasi yang tepat membuat laptop awet dipakai sampai lulus.", steps: ["Utamakan SSD", "RAM minimal 8 GB", "Baterai tahan lama"], cta: "Konsultasi laptop kuliah" },
    { title: "Pakai stabilizer / UPS.", emphasis: "UPS.", body: "Listrik yang naik turun bisa merusak PSU dan data saat padam mendadak.", steps: ["Pakai UPS untuk PC kerja", "Simpan pekerjaan sering", "Cabut saat petir"], cta: "UPS & stabilizer tersedia" },
    { title: "Laptop berisik?", emphasis: "berisik?", body: "Suara kipas keras sering karena debu atau kipas yang mulai aus.", steps: ["Cek suhu dengan aplikasi", "Bersihkan kipas", "Ganti kipas bila aus"], cta: "Jasa cleaning laptop" },
    { title: "Beli laptop bekas aman.", emphasis: "aman.", body: "Periksa kondisi menyeluruh sebelum membeli laptop bekas.", steps: ["Cek fisik, layar & engsel", "Tes baterai & port", "Minta garansi toko"], cta: "Laptop second bergaransi toko" },
    { title: "Rawat smartphone & laptop.", emphasis: "Rawat", body: "Panas berlebih adalah musuh utama baterai semua perangkat.", steps: ["Jangan charge sambil main berat", "Hindari panas matahari", "Lepas casing saat panas"], cta: CTA_GENERAL },
    { title: "Gunakan kabel data yang tepat.", emphasis: "tepat.", body: "Tidak semua kabel USB-C mendukung pengisian cepat dan transfer data cepat.", steps: ["Cek spesifikasi kabel", "Pilih yang bersertifikat", "Ganti kabel yang rusak"], cta: "Aksesoris & kabel berkualitas" },
    { title: "Instal ulang dengan aman.", emphasis: "aman.", body: "Instal ulang sistem bisa menyegarkan laptop, asal data sudah dicadangkan.", steps: ["Backup data penting", "Catat lisensi software", "Instal driver resmi"], cta: "Jasa instal ulang & backup data" },
    { title: "Kenali tanda HDD mau rusak.", emphasis: "mau rusak.", body: "Bunyi klik, file korup, dan lambat ekstrem adalah tanda bahaya hard disk.", steps: ["Segera backup data", "Cek kesehatan disk", "Ganti ke SSD"], cta: "Cek kesehatan HDD gratis" },
    { title: "Mouse & keyboard ergonomis.", emphasis: "ergonomis.", body: "Perangkat ergonomis mengurangi pegal di tangan saat bekerja seharian.", steps: ["Posisi pergelangan lurus", "Pilih mouse sesuai genggaman", "Atur tinggi meja"], cta: "Mouse & keyboard ergonomis tersedia" },
    { title: "Jaga privasi di WiFi publik.", emphasis: "WiFi publik.", body: "Jaringan WiFi umum rawan disadap bila tidak berhati-hati.", steps: ["Hindari transaksi bank", "Pastikan situs HTTPS", "Matikan berbagi file"], cta: CTA_GENERAL },
  ],
  fakta: [
    { title: "SSD NVMe Gen4 ±12× lebih cepat dari SSD SATA.", emphasis: "±12× lebih cepat", body: "SSD NVMe Gen4 bisa membaca data hingga ±7.000 MB/s, sekitar 12× lebih cepat dari SSD SATA (±550 MB/s).", compare: { a: { label: "SSD SATA", value: "±550 MB/s", pct: 8 }, b: { label: "SSD NVMe Gen4", value: "±7.000 MB/s", pct: 100 } }, cta: "Upgrade SSD NVMe di sini" },
    { title: "SSD SATA ±5× lebih cepat dari hard disk.", emphasis: "±5× lebih cepat", body: "Hard disk 7.200 RPM membaca sekitar 100–160 MB/s, sedangkan SSD SATA hingga ±550 MB/s — booting jauh lebih singkat.", compare: { a: { label: "Hard disk", value: "±120 MB/s", pct: 22 }, b: { label: "SSD SATA", value: "±550 MB/s", pct: 100 } }, cta: "Ganti HDD ke SSD" },
    { title: "RAM dual channel melipatgandakan jalur data.", emphasis: "dual channel", body: "Dua keping RAM yang berpasangan bekerja di dua jalur sekaligus, menggandakan bandwidth memori dibanding satu keping.", cta: "Upgrade RAM dual channel" },
    { title: "WiFi 6 dirancang untuk banyak perangkat sekaligus.", emphasis: "banyak perangkat", body: "Teknologi WiFi 6 (802.11ax) membuat router lebih efisien melayani banyak perangkat di rumah yang ramai.", cta: "Router WiFi 6 tersedia" },
    { title: "USB 3.2 Gen 2 ±20× lebih cepat dari USB 2.0.", emphasis: "±20× lebih cepat", body: "USB 2.0 maksimal 480 Mbps, sementara USB 3.2 Gen 2 hingga 10 Gbps.", compare: { a: { label: "USB 2.0", value: "480 Mbps", pct: 5 }, b: { label: "USB 3.2 Gen 2", value: "10 Gbps", pct: 100 } }, cta: "Flashdisk & SSD eksternal cepat" },
    { title: "Debu bisa menaikkan suhu prosesor.", emphasis: "menaikkan suhu", body: "Lapisan debu pada heatsink menghambat aliran udara sehingga prosesor bekerja lebih panas dan bisa melambat.", cta: "Jasa cleaning & repaste" },
    { title: "Thermal paste bisa mengering seiring waktu.", emphasis: "mengering", body: "Thermal paste yang kering menurunkan perpindahan panas dari prosesor ke heatsink — itulah kenapa perlu diganti berkala.", cta: "Jasa repaste laptop & PC" },
    { title: "Baterai laptop punya batas siklus isi ulang.", emphasis: "batas siklus", body: "Baterai lithium umumnya mulai berkurang kapasitasnya setelah ratusan siklus pengisian penuh.", cta: "Cek & ganti baterai laptop" },
    { title: "Layar 144 Hz ±2,4× lebih mulus dari 60 Hz.", emphasis: "lebih mulus", body: "Monitor 144 Hz menampilkan 144 gambar per detik, dibanding 60 pada layar biasa — gerakan terasa jauh lebih halus.", compare: { a: { label: "60 Hz", value: "60 fps", pct: 42 }, b: { label: "144 Hz", value: "144 fps", pct: 100 } }, cta: "Monitor gaming tersedia" },
    { title: "Satu byte terdiri dari 8 bit.", emphasis: "8 bit.", body: "Itulah kenapa internet 100 Mbps (megabit) setara sekitar 12,5 MB (megabyte) per detik.", cta: CTA_GENERAL },
    { title: "Kapasitas disk tampil lebih kecil di Windows.", emphasis: "lebih kecil", body: "Produsen menghitung 1 GB = 1.000.000.000 byte, Windows menghitung dengan basis 1.024 — SSD 1 TB tampil sekitar 931 GB.", cta: CTA_GENERAL },
    { title: "Prosesor modern punya banyak inti.", emphasis: "banyak inti.", body: "Beberapa inti prosesor bisa mengerjakan tugas bersamaan — sangat terasa untuk multitasking & render.", cta: "Konsultasi rakit PC" },
    { title: "PSU berkualitas melindungi semua komponen.", emphasis: "melindungi", body: "Power supply yang stabil dan bersertifikat efisiensi membantu menjaga komponen PC dari lonjakan daya.", cta: "Rakit PC dengan PSU berkualitas" },
    { title: "Mechanical keyboard diuji jutaan ketukan.", emphasis: "jutaan ketukan.", body: "Banyak switch mechanical dirancang tahan puluhan juta penekanan per tombol.", cta: "Keyboard mechanical tersedia" },
    { title: "NVMe terhubung langsung lewat jalur PCIe.", emphasis: "PCIe.", body: "Berbeda dari SATA, SSD NVMe memakai jalur PCIe yang lebar sehingga latensinya sangat rendah.", cta: "Upgrade SSD NVMe" },
    { title: "Printer tinta pertama dipasarkan tahun 1980-an.", emphasis: "1980-an.", body: "Teknologi printer tinta berkembang pesat sejak dipasarkan luas di era 1980-an dan kini jadi andalan rumah & kantor.", cta: "Printer & tinta tersedia" },
    { title: "Kata 'bug' komputer punya kisah unik.", emphasis: "'bug'", body: "Tahun 1947, tim komputer Harvard Mark II mencatat seekor ngengat yang tersangkut di relai — 'bug' pertama yang terdokumentasi.", cta: CTA_GENERAL },
    { title: "Komputer elektronik awal seberat puluhan ton.", emphasis: "puluhan ton.", body: "ENIAC (1946) memenuhi satu ruangan dan beratnya sekitar 27 ton — kini daya komputasinya kalah dari ponsel.", cta: CTA_GENERAL },
    { title: "Hard disk pertama berkapasitas ±5 MB.", emphasis: "±5 MB.", body: "IBM 350 (1956) hanya menyimpan sekitar 5 MB dan sebesar lemari — kini microSD sebesar kuku bisa ratusan GB.", cta: "Penyimpanan modern tersedia" },
    { title: "GPU punya ribuan inti kecil.", emphasis: "ribuan inti", body: "Kartu grafis modern berisi ribuan inti yang bekerja paralel — ideal untuk game, desain, dan AI.", cta: "VGA untuk gaming & desain" },
    { title: "Mouse komputer diperkenalkan tahun 1968.", emphasis: "1968.", body: "Douglas Engelbart mendemokan mouse pertama — terbuat dari kayu — pada presentasi legendaris tahun 1968.", cta: "Mouse ergonomis & gaming" },
    { title: "Email pertama dikirim tahun 1971.", emphasis: "1971.", body: "Ray Tomlinson mengirim email pertama di jaringan ARPANET dan memopulerkan tanda @.", cta: CTA_GENERAL },
    { title: "Wi-Fi bukan singkatan resmi apa pun.", emphasis: "bukan singkatan", body: "Nama Wi-Fi dibuat sebagai merek dagang yang mudah diingat, bukan kependekan dari 'wireless fidelity'.", cta: "Router & WiFi adapter tersedia" },
    { title: "Laptop tipis bisa menahan performa saat panas.", emphasis: "menahan performa", body: "Saat suhu terlalu tinggi, prosesor menurunkan kecepatannya (thermal throttling) untuk melindungi diri.", cta: "Cooling pad & jasa cleaning" },
    { title: "RAM menyimpan data sementara.", emphasis: "sementara.", body: "Isi RAM hilang saat perangkat dimatikan — itulah kenapa pekerjaan perlu disimpan ke SSD/HDD.", cta: "Upgrade RAM laptop & PC" },
    { title: "Lebih dari 5 miliar orang memakai internet.", emphasis: "5 miliar", body: "Lebih dari separuh penduduk dunia kini terhubung ke internet — kebutuhan perangkat yang andal makin tinggi.", cta: CTA_GENERAL },
    { title: "Port USB-C bisa dipasang bolak-balik.", emphasis: "bolak-balik.", body: "Bentuk USB-C simetris, sehingga kabel bisa dicolok dari dua arah tanpa salah.", cta: "Kabel & adaptor USB-C" },
    { title: "Monitor IPS warnanya konsisten dari samping.", emphasis: "konsisten", body: "Panel IPS menjaga warna tetap akurat walau dilihat dari sudut lebar — cocok untuk desain & foto.", cta: "Monitor IPS tersedia" },
    { title: "SSD tidak punya bagian yang berputar.", emphasis: "tidak punya bagian", body: "Tanpa piringan dan motor, SSD lebih tahan guncangan, hening, dan hemat daya dibanding hard disk.", cta: "Upgrade ke SSD sekarang" },
    { title: "Debu & panas memperpendek umur komponen.", emphasis: "memperpendek umur", body: "Suhu kerja yang terlalu tinggi dalam jangka panjang mempercepat penuaan komponen elektronik.", cta: "Perawatan berkala laptop & PC" },
  ],
  gaming: [
    { title: "FPS tiba-tiba drop?", emphasis: "drop?", body: "Penurunan FPS sering bukan karena hardware kurang kuat, tapi suhu tinggi, driver lama, atau aplikasi latar.", steps: ["Cek suhu CPU & GPU", "Update driver kartu grafis", "Tutup aplikasi latar"], cta: "Tune-up PC gaming di sini" },
    { title: "RAM 3200 MHz tapi jalan 2133?", emphasis: "jalan 2133?", body: "Tanpa XMP/EXPO, RAM biasanya berjalan di kecepatan standar yang lebih rendah dari yang tertera di kemasan.", steps: ["Masuk ke BIOS", "Aktifkan XMP / EXPO", "Simpan & restart"], cta: "Bantu setting BIOS PC gaming" },
    { title: "Monitor 144 Hz terasa 60 Hz?", emphasis: "terasa 60 Hz?", body: "Refresh rate monitor gaming sering masih terkunci 60 Hz karena pengaturan atau kabel yang kurang tepat.", steps: ["Atur refresh rate di Display", "Pakai kabel DisplayPort/HDMI sesuai", "Colok ke port kartu grafis"], cta: "Monitor & kabel gaming tersedia" },
    { title: "Jangan pelit soal PSU.", emphasis: "PSU.", body: "Power supply yang stabil menjaga semua komponen PC gaming tetap aman, terutama kartu grafis yang haus daya.", steps: ["Hitung kebutuhan daya", "Sisakan cadangan ±30%", "Pilih bersertifikat 80 Plus"], cta: "Konsultasi PSU untuk PC gaming" },
    { title: "Airflow casing menentukan suhu.", emphasis: "Airflow", body: "Aliran udara yang terarah membuat CPU & GPU lebih dingin, sehingga clock tetap tinggi saat main lama.", steps: ["Kipas depan menghisap masuk", "Kipas belakang/atas membuang", "Rapikan kabel di dalam"], cta: "Upgrade casing & kipas" },
    { title: "Main game baru? Update driver dulu.", emphasis: "Update driver", body: "Pabrikan kartu grafis rutin merilis driver yang dioptimalkan untuk game-game terbaru.", steps: ["Unduh dari situs resmi", "Pilih instalasi bersih (clean)", "Restart sebelum bermain"], cta: "Bantu instal & optimasi PC gaming" },
    { title: "Windows siap tempur.", emphasis: "siap tempur.", body: "Beberapa pengaturan sederhana di Windows bisa membuat game berjalan lebih lancar.", steps: ["Aktifkan Game Mode", "Mode daya: performa terbaik", "Kurangi aplikasi startup"], cta: "Optimasi Windows untuk gaming" },
    { title: "Kartu grafis berisik & panas?", emphasis: "berisik & panas?", body: "Debu yang menumpuk di heatsink dan kipas GPU membuat suhu naik dan kipas berputar lebih kencang.", steps: ["Matikan & cabut daya", "Bersihkan debu heatsink", "Cek semua kipas berputar"], cta: "Jasa cleaning PC gaming" },
    { title: "Pasang game di SSD.", emphasis: "di SSD.", body: "Game yang dipasang di SSD memuat map & tekstur jauh lebih cepat dibanding di hard disk.", steps: ["Pasang SSD khusus game", "Pindahkan library game", "Sisakan ruang kosong ±20%"], cta: "Upgrade SSD NVMe untuk game" },
    { title: "Ping tinggi saat main online?", emphasis: "Ping tinggi", body: "Koneksi kabel jauh lebih stabil daripada WiFi untuk game kompetitif.", steps: ["Pakai kabel LAN", "Hentikan unduhan latar", "Pilih server terdekat"], cta: "Kabel LAN & router gaming tersedia" },
    { title: "Atur grafis dengan cerdas.", emphasis: "dengan cerdas.", body: "Tidak semua pengaturan grafis sama beratnya — turunkan yang paling boros dulu sebelum menurunkan resolusi.", steps: ["Turunkan kualitas bayangan", "Atur anti-aliasing", "Aktifkan DLSS/FSR bila ada"], cta: "Konsultasi setting game" },
    { title: "Rakit PC gaming sesuai bujet.", emphasis: "sesuai bujet.", body: "Kunci PC gaming yang pas: tentukan target game & resolusi dulu, baru pilih komponen.", steps: ["Tentukan game & resolusi", "Porsi bujet terbesar ke GPU", "Jangan korbankan PSU"], cta: "Simulasi rakit PC gaming gratis" },
    { title: "Overclock? Pelan-pelan saja.", emphasis: "Pelan-pelan", body: "Overclock bisa menambah performa, asal dilakukan bertahap dan suhu tetap terkendali.", steps: ["Naikkan clock bertahap", "Uji stabilitas tiap langkah", "Pantau suhu selalu"], cta: "Pendingin CPU & GPU tersedia" },
    { title: "Stutter saat main?", emphasis: "Stutter", body: "Patah-patah sesaat sering dipicu RAM penuh, penyimpanan lambat, atau shader yang sedang dikompilasi.", steps: ["Tutup browser & aplikasi berat", "Pasang game di SSD", "Biarkan shader selesai dimuat"], cta: "Upgrade RAM & SSD gaming" },
    { title: "Jaga suhu saat main lama.", emphasis: "Jaga suhu", body: "Sesi gaming panjang membuat panas menumpuk — pendinginan yang baik menjaga FPS tetap stabil.", steps: ["Ruangan berventilasi baik", "Bersihkan filter debu", "Ganti thermal paste berkala"], cta: "Jasa repaste CPU & GPU" },
    { title: "240 Hz: 4× lebih banyak gambar per detik.", emphasis: "4× lebih banyak", body: "Monitor 240 Hz menampilkan 240 gambar per detik dibanding 60 pada monitor biasa — gerakan cepat jauh lebih jelas.", compare: { a: { label: "Monitor 60 Hz", value: "60 fps", pct: 25 }, b: { label: "Monitor 240 Hz", value: "240 fps", pct: 100 } }, cta: "Monitor gaming high refresh" },
    { title: "DLSS & FSR: FPS naik tanpa ganti GPU.", emphasis: "FPS naik", body: "Teknologi upscaling merender game di resolusi lebih rendah lalu memperbesarnya dengan cerdas, sehingga FPS naik signifikan.", cta: "Upgrade kartu grafis terbaru" },
    { title: "VRAM makin penting di game modern.", emphasis: "VRAM", body: "Tekstur resolusi tinggi butuh memori kartu grafis besar — VRAM yang lega membuat game tetap mulus di setting tinggi.", cta: "Konsultasi pilih kartu grafis" },
    { title: "16 GB RAM: titik nyaman untuk gaming.", emphasis: "16 GB RAM", body: "Untuk gaming sekaligus streaming atau membuka banyak aplikasi, 32 GB memberi ruang lebih lega.", cta: "Upgrade RAM PC gaming" },
    { title: "Ray tracing: cahaya serealistis film.", emphasis: "serealistis film.", body: "Ray tracing mensimulasikan pantulan & bayangan cahaya secara nyata — indah, tapi berat, jadi paling pas dipadukan dengan upscaling.", cta: "Kartu grafis siap ray tracing" },
    { title: "Bottleneck: komponen saling menunggu.", emphasis: "saling menunggu.", body: "CPU yang terlalu lemah bisa membuat GPU kencang tak bekerja maksimal, begitu pula sebaliknya. Kuncinya: seimbang.", cta: "Cek keseimbangan rakitan Anda" },
    { title: "FPS stabil lebih nikmat daripada FPS tinggi.", emphasis: "FPS stabil", body: "Frame rate yang naik-turun terasa patah-patah. Membatasi FPS sedikit di bawah refresh rate sering membuat permainan lebih halus.", cta: "Optimasi PC gaming" },
    { title: "Response time 1 ms = gerakan lebih tajam.", emphasis: "1 ms", body: "Monitor dengan response time rendah mengurangi bayangan kabur (ghosting) saat objek bergerak cepat.", cta: "Monitor gaming tersedia" },
    { title: "SSD NVMe mempercepat loading game.", emphasis: "loading game.", body: "Game modern makin bergantung pada penyimpanan cepat untuk memuat dunia permainan yang luas tanpa jeda.", compare: { a: { label: "Hard disk", value: "±120 MB/s", pct: 2 }, b: { label: "SSD NVMe Gen4", value: "±7.000 MB/s", pct: 100 } }, cta: "Upgrade SSD NVMe" },
    { title: "6 inti CPU: titik nyaman gaming.", emphasis: "6 inti", body: "Banyak game modern berjalan nyaman dengan prosesor 6 inti ke atas, terutama bila sambil streaming atau voice chat.", cta: "Konsultasi prosesor gaming" },
    { title: "80 Plus Gold: listrik lebih efisien.", emphasis: "80 Plus Gold", body: "PSU bersertifikat 80 Plus Gold mengubah sekitar 90% listrik dari stopkontak menjadi daya untuk komponen — lebih sedikit panas terbuang.", cta: "PSU bersertifikat tersedia" },
    { title: "Thermal throttling diam-diam memakan FPS.", emphasis: "memakan FPS.", body: "Saat terlalu panas, CPU & GPU otomatis menurunkan kecepatan untuk melindungi diri — FPS ikut turun.", cta: "Jasa cleaning & repaste" },
    { title: "1080p atau 1440p?", emphasis: "1440p?", body: "1080p dengan refresh tinggi favorit gamer kompetitif, sementara 1440p menawarkan gambar lebih tajam untuk game petualangan.", cta: "Konsultasi monitor gaming" },
    { title: "DPI tinggi bukan segalanya.", emphasis: "bukan segalanya.", body: "Banyak gamer FPS memakai DPI rendah hingga menengah agar bidikan lebih presisi — kenyamanan genggaman sama pentingnya.", cta: "Mouse gaming tersedia" },
    { title: "Air cooler atau AIO? Dua-duanya bisa juara.", emphasis: "Dua-duanya", body: "Air cooler tower berkualitas sanggup menjaga suhu CPU gaming dengan baik; AIO unggul di tampilan & ruang di sekitar socket.", cta: "Pendingin CPU tersedia" },
  ],
};

const BASE_KINDS: DailyKind[] = ["motivasi", "tips", "fakta", "gaming"];

/** Nomor hari WIB sejak epoch (berganti tiap 00:00 WIB). */
export function wibDayNumber(now: number): number {
  return Math.floor((now + 7 * 3_600_000) / 86_400_000);
}

/** Tanggal WIB "YYYY-MM-DD" untuk sebuah instant. */
export function wibDateKey(now: number): string {
  return new Date(now + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Konten kustom toko (dari DB; tanggal periode "YYYY-MM-DD" WIB, inklusif). */
export interface CustomDailyItem extends DailyItem {
  id: string;
  kind: DailyKind;
  startsOn?: string | null;
  endsOn?: string | null;
}

/**
 * Konten kustom yang tampil pada hari `now`: dalam periode (bila ada) dan — untuk promo
 * bertaut produk — stok masih ada (promo berhenti otomatis saat stok habis).
 */
export function activeCustom<T extends CustomDailyItem>(items: T[], now: number): T[] {
  const today = wibDateKey(now);
  return items.filter(
    (i) =>
      (!i.startsOn || i.startsOn <= today) && (!i.endsOn || i.endsOn >= today) && !(i.product && i.product.stock <= 0),
  );
}

/** Tab jenis konten: Promo hanya muncul bila toko punya promo aktif hari ini. */
export function dailyKinds(hasPromo: boolean): DailyKind[] {
  return hasPromo ? ["promo", ...BASE_KINDS] : BASE_KINDS;
}

/** Jenis default hari ini — bergilir motivasi → tips → fakta → PC gaming (→ promo bila ada promo aktif). */
export function dailyKind(now: number, hasPromo = false): DailyKind {
  const kinds: DailyKind[] = hasPromo ? [...BASE_KINDS, "promo"] : BASE_KINDS;
  return kinds[wibDayNumber(now) % kinds.length];
}

/**
 * Konten hari ini untuk satu jenis. Bila toko punya konten kustom aktif untuk jenis itu,
 * konten toko tampil di hari GENAP & bawaan di hari ganjil (bergilir, tak tenggelam di
 * antara 30 konten bawaan). Promo hanya dari toko.
 */
export function pickDaily(
  kind: DailyKind,
  now: number,
  custom: CustomDailyItem[] = [],
): { item: DailyItem; customId: string | null; key: string } | null {
  const day = wibDayNumber(now);
  const mine = activeCustom(custom, now).filter((c) => c.kind === kind);
  const builtin = kind === "promo" ? [] : DAILY_CONTENT[kind];
  const fromBuiltin = (i: number) => ({ item: builtin[i], customId: null, key: `builtin:${kind}:${i}` });
  if (mine.length === 0) return builtin.length ? fromBuiltin(day % builtin.length) : null;
  if (builtin.length === 0 || day % 2 === 0) {
    const c = mine[(builtin.length === 0 ? day : Math.floor(day / 2)) % mine.length];
    return { item: c, customId: c.id, key: `custom:${c.id}` };
  }
  return fromBuiltin(Math.floor(day / 2) % builtin.length);
}

/** Konten bawaan dari kunci statistik "builtin:<jenis>:<indeks>" (validasi server). */
export function builtinByKey(key: string): { kind: BuiltinKind; item: DailyItem } | null {
  const m = /^builtin:(motivasi|tips|fakta|gaming):(\d{1,3})$/.exec(key);
  if (!m) return null;
  const kind = m[1] as BuiltinKind;
  const item = DAILY_CONTENT[kind][Number(m[2])];
  return item ? { kind, item } : null;
}

/** Konten bawaan hari ini (tanpa konten toko). */
export function dailyItem(kind: BuiltinKind, now: number): DailyItem {
  return pickDaily(kind, now)!.item;
}

/** Validasi konten kustom (dipakai form klien & server). Objek kosong = valid. */
export function validateDailyItem(v: {
  kind: DailyKind;
  title: string;
  emphasis?: string | null;
  body: string;
  steps?: string[];
  cta: string;
  startsOn?: string | null;
  endsOn?: string | null;
  productId?: string | null;
  promoPrice?: number | null;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.productId && v.kind !== "promo") e.productId = "Produk hanya bisa ditautkan ke konten Promo.";
  if (v.promoPrice !== null && v.promoPrice !== undefined && v.promoPrice !== 0) {
    if (!v.productId) e.promoPrice = "Harga promo butuh produk yang ditautkan.";
    else if (!Number.isInteger(v.promoPrice) || v.promoPrice < 1 || v.promoPrice > 10_000_000_000) e.promoPrice = "Harga promo tidak valid.";
  }
  const title = v.title.trim();
  if (title.length < 3) e.title = "Judul minimal 3 karakter.";
  else if (title.length > 70) e.title = "Judul maksimal 70 karakter.";
  const em = (v.emphasis ?? "").trim();
  if (em && !title.includes(em)) e.emphasis = "Kata yang diwarnai harus persis ada di judul.";
  const body = v.body.trim();
  if (body.length < 10) e.body = "Isi minimal 10 karakter.";
  else if (body.length > 240) e.body = "Isi maksimal 240 karakter.";
  // Tips: wajib 3 langkah. PC Gaming: opsional (kosong semua, atau isi lengkap 3).
  const steps = (v.steps ?? []).map((x) => x.trim());
  const anyStep = steps.some(Boolean);
  if (v.kind === "tips" || (v.kind === "gaming" && anyStep)) {
    if (steps.length !== 3 || steps.some((x) => !x)) e.steps = v.kind === "tips" ? "Tips wajib 3 langkah singkat." : "Isi ketiga langkah, atau kosongkan semua.";
    else if (steps.some((x) => x.length > 40)) e.steps = "Tiap langkah maksimal 40 karakter.";
  }
  const cta = v.cta.trim();
  if (cta.length < 3) e.cta = "Ajakan minimal 3 karakter.";
  else if (cta.length > 60) e.cta = "Ajakan maksimal 60 karakter.";
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (v.startsOn && !iso.test(v.startsOn)) e.startsOn = "Tanggal tidak valid.";
  if (v.endsOn && !iso.test(v.endsOn)) e.endsOn = "Tanggal tidak valid.";
  if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) e.endsOn = "Tanggal selesai harus setelah tanggal mulai.";
  return e;
}

/** Pecah judul jadi [sebelum, aksen, sesudah] untuk diwarnai. */
export function splitEmphasis(title: string, emphasis?: string): [string, string, string] {
  if (!emphasis) return [title, "", ""];
  const i = title.indexOf(emphasis);
  if (i < 0) return [title, "", ""];
  return [title.slice(0, i), emphasis, title.slice(i + emphasis.length)];
}

/** Teks siap salin/caption untuk Status WA / Story IG. */
export function dailyShareText(kind: DailyKind, item: DailyItem, storeName: string, phone?: string | null): string {
  const rows = [`*${DAILY_KIND_META[kind].kicker}*`, item.body];
  if (item.steps) rows.push(item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  if (item.product) {
    const p = item.product;
    const pct = discountPct(p);
    rows.push(
      "",
      `🏷️ *${p.name}*`,
      pct > 0 ? `Harga: ~${rp(p.price)}~ *${rp(effectivePrice(p))}* (hemat ${pct}%)` : `Harga: *${rp(p.price)}*`,
    );
    if (p.stock > 0 && p.stock <= 5) rows.push(`⏳ ${stockLabel(p.stock)}`);
  }
  rows.push("", `${item.cta} — *${storeName}*${phone ? `\nChat WA: ${phone}` : ""}`);
  return rows.join("\n");
}
