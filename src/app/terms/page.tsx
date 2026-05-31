import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_NAME,
  APP_PUBLISHER,
  APP_PUBLISHER_URL,
  APP_DEVELOPER,
  APP_DEVELOPER_PORTFOLIO,
} from "@/lib/brand";
import { LegalShell, LegalSection, LegalBullets } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: `Syarat & Ketentuan penggunaan ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Syarat & Ketentuan"
      lastUpdated="Juni 2026"
      intro={
        <p>
          Syarat & Ketentuan ini mengatur penggunaan aplikasi {APP_NAME}. Dengan mendaftar atau menggunakan
          {" "}{APP_NAME}, Anda dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan berikut.
        </p>
      }
    >
      <LegalSection title="1. Definisi">
        <LegalBullets
          items={[
            `"Aplikasi" berarti perangkat lunak ${APP_NAME} beserta seluruh fiturnya.`,
            `"Pengguna" berarti pemilik toko, admin, kasir, teknisi, atau pihak yang diberi akses oleh pemilik toko.`,
            `"Toko" berarti unit bisnis (tenant) yang dikelola dalam aplikasi.`,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Akun & Pendaftaran">
        <p>
          Pengguna wajib memberikan data yang benar saat mendaftar dan menjaga kerahasiaan kredensial login.
          Seluruh aktivitas yang terjadi pada akun menjadi tanggung jawab pemilik akun. Pemilik toko
          bertanggung jawab mengatur peran (role) dan akses penggunanya.
        </p>
      </LegalSection>

      <LegalSection title="3. Lisensi Penggunaan">
        <p>
          Kami memberikan hak yang terbatas, non-eksklusif, dan tidak dapat dipindahtangankan untuk menggunakan
          {" "}{APP_NAME} sesuai paket yang berlaku. Hak ini tidak mencakup hak menyalin, memodifikasi,
          merekayasa-balik (reverse engineering), menjual kembali, atau mendistribusikan aplikasi.
        </p>
      </LegalSection>

      <LegalSection title="4. Paket & Lisensi/Demo">
        <p>
          {APP_NAME} dapat menyediakan beberapa jenis paket, termasuk masa demo (harian/bulanan/batas jumlah
          transaksi) dan paket penuh (unlimited). Pembatasan demo dapat diberlakukan otomatis oleh sistem.
          Detail, harga, dan ketentuan paket dapat berubah sewaktu-waktu.
        </p>
      </LegalSection>

      <LegalSection title="5. Kewajiban Pengguna">
        <LegalBullets
          items={[
            "Menggunakan aplikasi sesuai hukum yang berlaku dan untuk tujuan bisnis yang sah.",
            "Menjaga keakuratan data yang dimasukkan.",
            "Menjaga keamanan akun & perangkat.",
            "Melakukan pencadangan data sesuai kebutuhan bisnis.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Penggunaan yang Dilarang">
        <LegalBullets
          items={[
            "Mengakses akun/toko milik pihak lain tanpa izin.",
            "Mengganggu, membebani, atau merusak sistem & keamanan aplikasi.",
            "Menggunakan aplikasi untuk aktivitas melanggar hukum.",
            "Menyalin atau mendistribusikan aplikasi tanpa izin tertulis.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Hak Kekayaan Intelektual">
        <p>
          Seluruh nama, logo, desain, kode program, dan dokumentasi {APP_NAME} dilindungi hak kekayaan
          intelektual dan tetap menjadi milik pemilik hak. Tidak ada bagian dari ketentuan ini yang
          mengalihkan kepemilikan tersebut kepada pengguna.
        </p>
      </LegalSection>

      <LegalSection title="8. Pembayaran & Langganan">
        <p>
          Apabila paket berbayar diberlakukan, ketentuan harga, siklus penagihan, dan pembayaran akan
          diinformasikan secara terpisah. Kegagalan pembayaran dapat menyebabkan penangguhan layanan.
        </p>
      </LegalSection>

      <LegalSection title="9. Penangguhan & Penghentian">
        <p>
          Kami dapat menangguhkan atau menghentikan akses apabila terjadi pelanggaran ketentuan ini,
          penyalahgunaan, atau alasan keamanan. Pengguna dapat berhenti menggunakan layanan kapan saja.
        </p>
      </LegalSection>

      <LegalSection title="10. Penafian & Batasan Tanggung Jawab">
        <p>
          {APP_NAME} disediakan sebagaimana adanya (as-is). Batasan tanggung jawab selengkapnya diatur dalam
          halaman <Link href="/disclaimer" className="text-primary hover:underline">Disclaimer</Link>, yang
          merupakan bagian tidak terpisahkan dari Syarat & Ketentuan ini.
        </p>
      </LegalSection>

      <LegalSection title="11. Perubahan Ketentuan">
        <p>
          Kami dapat memperbarui Syarat & Ketentuan ini sewaktu-waktu. Dengan terus menggunakan aplikasi
          setelah perubahan berlaku, Anda dianggap menyetujui ketentuan yang diperbarui.
        </p>
      </LegalSection>

      <LegalSection title="12. Hukum yang Berlaku">
        <p>
          Syarat & Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap
          perselisihan akan diselesaikan secara musyawarah terlebih dahulu sebelum menempuh jalur hukum.
        </p>
      </LegalSection>

      <LegalSection title="13. Kontak">
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
