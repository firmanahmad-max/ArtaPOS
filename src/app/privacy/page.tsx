import type { Metadata } from "next";
import {
  APP_NAME,
  APP_PUBLISHER,
  APP_PUBLISHER_URL,
  APP_DEVELOPER,
  APP_DEVELOPER_PORTFOLIO,
} from "@/lib/brand";
import { LegalShell, LegalSection, LegalBullets } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: `Kebijakan Privasi ${APP_NAME} — bagaimana data Anda dikumpulkan, digunakan, dan dilindungi.`,
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Kebijakan Privasi"
      lastUpdated="Juni 2026"
      intro={
        <p>
          Kebijakan Privasi ini menjelaskan bagaimana {APP_NAME} mengumpulkan, menggunakan, menyimpan, dan
          melindungi data Anda saat menggunakan aplikasi. Dengan menggunakan {APP_NAME}, Anda menyetujui
          praktik yang dijelaskan di halaman ini.
        </p>
      }
    >
      <LegalSection title="1. Data yang Kami Kumpulkan">
        <p>Kami mengumpulkan data yang diperlukan agar aplikasi berfungsi:</p>
        <LegalBullets
          items={[
            "Data akun: nama, email, peran (role), dan kata sandi (disimpan dalam bentuk hash, bukan teks asli).",
            "Data bisnis yang Anda masukkan: produk, stok, transaksi penjualan/pembelian, pelanggan, supplier, servis, dan keuangan.",
            "Data teknis: log aktivitas dasar dan informasi sesi untuk keamanan & operasional.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Cara Kami Menggunakan Data">
        <LegalBullets
          items={[
            "Menjalankan fungsi inti aplikasi (POS, inventory, servis, laporan, dll).",
            "Autentikasi dan menjaga keamanan akun Anda.",
            "Menghasilkan laporan & analitik untuk toko Anda.",
            "Memperbaiki kualitas, keandalan, dan keamanan layanan.",
          ]}
        />
        <p>Kami tidak menjual atau menyewakan data Anda kepada pihak mana pun.</p>
      </LegalSection>

      <LegalSection title="3. Penyimpanan & Keamanan">
        <p>
          Kami menerapkan langkah keamanan yang wajar: kata sandi di-hash (argon2), sesi login terenkripsi
          melalui cookie httpOnly, dan isolasi data antar toko (multi-tenant) sehingga data satu toko tidak
          dapat diakses toko lain. Meski demikian, tidak ada sistem yang 100% aman; pencadangan (backup)
          berkala tetap menjadi tanggung jawab pengguna sesuai kebijakan bisnis masing-masing.
        </p>
      </LegalSection>

      <LegalSection title="4. Berbagi Data & Layanan Pihak Ketiga">
        <p>Beberapa fitur memanfaatkan layanan pihak ketiga, antara lain:</p>
        <LegalBullets
          items={[
            "WhatsApp (untuk mengirim laporan/notifikasi atas inisiatif Anda).",
            "Penyedia hosting & basis data (untuk menjalankan aplikasi).",
            "Perangkat & layanan pendukung: printer Bluetooth, pemindai barcode.",
          ]}
        />
        <p>
          Penggunaan layanan tersebut tunduk pada kebijakan privasi masing-masing penyedia. {APP_NAME} tidak
          bertanggung jawab atas praktik privasi pihak ketiga.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookie & Sesi">
        <p>
          {APP_NAME} hanya menggunakan cookie yang diperlukan untuk fungsi login & keamanan sesi (httpOnly).
          Kami tidak menggunakan cookie untuk iklan atau pelacakan lintas situs.
        </p>
      </LegalSection>

      <LegalSection title="6. Peran & Tanggung Jawab atas Data Pelanggan Toko">
        <p>
          Untuk data pelanggan/akhir yang Anda masukkan ke dalam sistem (mis. nama & nomor pelanggan toko),
          pemilik toko bertindak sebagai pengendali data, dan {APP_NAME} bertindak sebagai pemroses data atas
          instruksi Anda. Anda bertanggung jawab memastikan pengumpulan data tersebut sah sesuai ketentuan
          yang berlaku.
        </p>
      </LegalSection>

      <LegalSection title="7. Hak Anda atas Data">
        <p>
          Anda memiliki kendali penuh atas data toko Anda dan dapat menambah, mengubah, atau menghapusnya
          melalui aplikasi. Untuk permintaan terkait data yang tidak dapat dilakukan sendiri lewat aplikasi,
          silakan hubungi kami.
        </p>
      </LegalSection>

      <LegalSection title="8. Retensi Data">
        <p>
          Data disimpan selama akun/toko Anda aktif atau selama diperlukan untuk menyediakan layanan. Anda
          dapat menghapus data tertentu kapan saja melalui aplikasi.
        </p>
      </LegalSection>

      <LegalSection title="9. Perubahan Kebijakan">
        <p>
          Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Versi terbaru akan tersedia melalui
          aplikasi atau situs resmi {APP_NAME}.
        </p>
      </LegalSection>

      <LegalSection title="10. Kontak">
        <p>Pertanyaan terkait privasi dapat diajukan ke:</p>
        <div className="rounded-lg border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">{APP_NAME}</p>
          <p className="mt-1">
            Powered by {APP_PUBLISHER} ·{" "}
            <a href={APP_PUBLISHER_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {APP_PUBLISHER_URL.replace(/^https?:\/\//, "")}
            </a>
          </p>
          <p>
            Developer: {APP_DEVELOPER} ·{" "}
            <a href={APP_DEVELOPER_PORTFOLIO} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {APP_DEVELOPER_PORTFOLIO.replace(/^https?:\/\//, "")}
            </a>
          </p>
        </div>
      </LegalSection>
    </LegalShell>
  );
}
