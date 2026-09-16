import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa/sw-registrar";
import { SplashScreen } from "@/components/pwa/splash-screen";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

// Redesign: Archivo untuk teks & judul, JetBrains Mono untuk angka/nomor dokumen.
const fontSans = Archivo({ variable: "--font-archivo", subsets: ["latin"], display: "swap" });
const fontMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description: `${APP_NAME}: aplikasi manajemen toko komputer — penjualan, inventory, servis, rakit PC, keuangan. ${APP_TAGLINE}.`,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0a1f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Membaca nonce (diset proxy) juga MEMAKSA render dinamis untuk seluruh app →
  // Next menyuntikkan nonce ke semua skrip framework, jadi CSP ketat tak
  // memblokir hidrasi di halaman mana pun.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="id" suppressHydrationWarning className="h-full">
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('color-theme');if(t&&t!=='violet')document.documentElement.dataset.theme=t;}catch(e){}" +
              "try{if(sessionStorage.getItem('artapos-splash'))document.documentElement.classList.add('splash-seen');else sessionStorage.setItem('artapos-splash','1');}catch(e){}",
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
          <Toaster />
          <ServiceWorkerRegistrar />
          <SplashScreen />
        </ThemeProvider>
      </body>
    </html>
  );
}
