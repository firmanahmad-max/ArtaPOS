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
  {
    // CSP konservatif: hanya direktif yang TIDAK mematahkan inline-script/style
    // Next (tanpa default-src/script-src). Mencegah clickjacking
    // (frame-ancestors), injeksi <base>, plugin <object>, & form lintas-origin.
    // Gambar/struk pakai data: URL → tak dibatasi karena img-src tak diset.
    key: "Content-Security-Policy",
    value: ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "form-action 'self'"].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
