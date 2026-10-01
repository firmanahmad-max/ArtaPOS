import type { NextConfig } from "next";

/** Header keamanan dasar untuk seluruh respons. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Paksa HTTPS (host ini saja; tanpa includeSubDomains agar tak memengaruhi
  // subdomain lain di firmanahmad.id).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Permissions-Policy",
    // Izinkan kamera (scan barcode) & bluetooth (print) untuk origin sendiri.
    value: "camera=(self), bluetooth=(self), geolocation=()",
  },
  // Content-Security-Policy diset PER-REQUEST di src/proxy.ts (berbasis nonce,
  // script-src 'strict-dynamic') — tak bisa statis di sini karena butuh nonce.
];

const nextConfig: NextConfig = {
  experimental: {
    // Unggahan foto (galeri, foto servis/RMA, logo, promo) dikirim sebagai data
    // URL base64 via Server Action. Default limit Server Action = 1 MB; naikkan
    // agar foto mendekati batas aplikasi (~0.9–1.4 MB) tak gagal diam-diam.
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
