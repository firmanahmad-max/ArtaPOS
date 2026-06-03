import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_PUBLISHER,
  APP_PUBLISHER_URL,
  APP_DEVELOPER,
  APP_DEVELOPER_HANDLE,
  APP_DEVELOPER_PORTFOLIO,
} from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `Disclaimer & ketentuan penggunaan ${APP_NAME}.`,
};

const LAST_UPDATED = "Juni 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <Link href="/about" className="flex items-center gap-2">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="font-semibold">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Buka Aplikasi <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Disclaimer</h1>
          <p className="text-sm text-muted-foreground">Terakhir diperbarui: {LAST_UPDATED}</p>
        </div>

        <p className="leading-relaxed text-muted-foreground">
          Selamat datang di {APP_NAME}. Dengan menggunakan aplikasi {APP_NAME}, Anda menyetujui seluruh
          ketentuan dan penafian (disclaimer) yang tercantum pada halaman ini. Jika Anda tidak menyetujui
          salah satu bagian dari disclaimer ini, disarankan untuk tidak menggunakan layanan {APP_NAME}.
        </p>

        <Section title="1. Informasi Umum">
          <p>
            {APP_NAME} adalah aplikasi manajemen toko komputer yang dirancang untuk membantu pengelolaan
            operasional bisnis, termasuk namun tidak terbatas pada penjualan, pembelian, inventaris, jasa
            servis, utang-piutang, laporan keuangan, dan fitur pendukung lainnya.
          </p>
          <p>
            Informasi, data, laporan, dan analisis yang dihasilkan oleh sistem disediakan sebagai alat bantu
            pengelolaan bisnis dan tidak dimaksudkan sebagai nasihat hukum, perpajakan, akuntansi, investasi,
            maupun konsultasi profesional lainnya.
          </p>
        </Section>

        <Section title="2. Akurasi Data">
          <p>
            {APP_NAME} berupaya menyediakan sistem yang andal dan akurat. Namun, keakuratan laporan dan
            informasi yang dihasilkan sangat bergantung pada data yang dimasukkan oleh pengguna.
          </p>
          <p>Pengembang tidak bertanggung jawab atas kesalahan, ketidaksesuaian, kehilangan, atau kerugian yang timbul akibat:</p>
          <Bullets
            items={[
              "Kesalahan input data oleh pengguna.",
              "Penghapusan data yang dilakukan pengguna.",
              "Penggunaan sistem yang tidak sesuai dengan prosedur.",
              "Informasi yang tidak diperbarui secara berkala oleh pengguna.",
            ]}
          />
        </Section>

        <Section title="3. Ketersediaan Layanan">
          <p>Kami berupaya menjaga layanan tetap tersedia dan berfungsi dengan baik. Namun, {APP_NAME} tidak menjamin bahwa layanan akan selalu bebas dari:</p>
          <Bullets
            items={[
              "Gangguan jaringan internet.",
              "Kegagalan perangkat keras atau perangkat lunak.",
              "Pemeliharaan sistem.",
              "Gangguan pihak ketiga.",
              "Keadaan kahar (force majeure).",
            ]}
          />
          <p>
            Layanan dapat mengalami pembaruan, perubahan fitur, atau penghentian sementara tanpa pemberitahuan
            sebelumnya apabila diperlukan untuk peningkatan kualitas dan keamanan sistem.
          </p>
        </Section>

        <Section title="4. Tanggung Jawab Pengguna">
          <p>Pengguna bertanggung jawab penuh atas:</p>
          <Bullets
            items={[
              "Keamanan akun dan kredensial login.",
              "Kerahasiaan data bisnis yang dimasukkan ke dalam sistem.",
              "Kebenaran data transaksi, stok, pelanggan, supplier, dan laporan yang dibuat.",
              "Pencadangan (backup) data apabila diperlukan sesuai kebijakan bisnis masing-masing.",
            ]}
          />
        </Section>

        <Section title="5. Integrasi Pihak Ketiga">
          <p>Beberapa fitur {APP_NAME} dapat memanfaatkan layanan pihak ketiga, termasuk namun tidak terbatas pada:</p>
          <Bullets items={["WhatsApp", "Printer Bluetooth", "Pemindai barcode", "Layanan cloud", "API eksternal lainnya"]} />
          <p>
            {APP_NAME} tidak bertanggung jawab atas perubahan kebijakan, gangguan layanan, keterbatasan, biaya
            tambahan, atau kegagalan yang berasal dari penyedia layanan pihak ketiga tersebut.
          </p>
        </Section>

        <Section title="6. Batasan Tanggung Jawab">
          <p>Sejauh diizinkan oleh hukum yang berlaku, pengembang {APP_NAME} tidak bertanggung jawab atas:</p>
          <Bullets
            items={[
              "Kehilangan keuntungan bisnis.",
              "Kehilangan data.",
              "Kehilangan pelanggan.",
              "Gangguan operasional usaha.",
              "Kerugian langsung maupun tidak langsung yang timbul akibat penggunaan atau ketidakmampuan menggunakan aplikasi.",
            ]}
          />
          <p>Pengguna memahami bahwa penggunaan aplikasi dilakukan atas risiko masing-masing.</p>
        </Section>

        <Section title="7. Hak Kekayaan Intelektual">
          <p>
            Seluruh nama, logo, desain, kode program, dokumentasi, dan fitur yang terdapat dalam {APP_NAME}
            merupakan hak kekayaan intelektual yang dilindungi hukum dan tidak boleh disalin, dimodifikasi,
            didistribusikan, atau diperjualbelikan tanpa izin tertulis dari pemilik hak.
          </p>
        </Section>

        <Section title="8. Perubahan Disclaimer">
          <p>
            Pengembang berhak memperbarui atau mengubah isi disclaimer ini sewaktu-waktu untuk menyesuaikan
            perkembangan layanan, teknologi, maupun ketentuan hukum yang berlaku. Versi terbaru akan tersedia
            melalui aplikasi atau situs resmi {APP_NAME}.
          </p>
        </Section>

        <Section title="9. Kontak">
          <p>Apabila terdapat pertanyaan terkait disclaimer ini, silakan menghubungi:</p>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="font-semibold text-foreground">{APP_NAME} — {APP_TAGLINE}</p>
            <p className="mt-2">
              Powered by {APP_PUBLISHER} · Website:{" "}
              <a href={APP_PUBLISHER_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {APP_PUBLISHER_URL.replace(/^https?:\/\//, "")}
              </a>
            </p>
            <p>
              Developer: {APP_DEVELOPER} ({APP_DEVELOPER_HANDLE}) · Website:{" "}
              <a href={APP_DEVELOPER_PORTFOLIO} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {APP_DEVELOPER_PORTFOLIO.replace(/^https?:\/\//, "")}
              </a>
            </p>
          </div>
        </Section>

        <blockquote className="rounded-xl border-l-4 border-primary bg-primary/5 p-4 text-sm italic text-muted-foreground">
          {APP_NAME} disediakan sebagaimana adanya (as-is) tanpa jaminan tersurat maupun tersirat. Pengguna
          bertanggung jawab atas penggunaan aplikasi dan pengelolaan data bisnisnya masing-masing.
        </blockquote>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t pt-6 text-sm">
          <Link href="/about" className="text-primary hover:underline">Tentang {APP_NAME}</Link>
          <Link href="/privacy" className="text-primary hover:underline">Kebijakan Privasi</Link>
          <Link href="/terms" className="text-primary hover:underline">Syarat & Ketentuan</Link>
        </div>
      </main>
    </div>
  );
}
