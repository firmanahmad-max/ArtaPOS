/**
 * Pembangun header Content-Security-Policy berbasis nonce (pure — dapat diuji).
 *
 * Direktif KRITIS anti-XSS = `script-src 'nonce-<n>' 'strict-dynamic'`: hanya
 * skrip yang membawa nonce per-request (atau yang dimuat olehnya) yang boleh
 * jalan; skrip yang di-inject penyerang tanpa nonce diblokir.
 *
 * `style-src` sengaja memakai 'unsafe-inline': React menyetel atribut `style`
 * inline secara luas dan nonce tak mencakup atribut style. Risiko CSS-injection
 * jauh lebih rendah daripada risiko mematahkan seluruh UI.
 */
export function buildCsp(nonce: string, opts: { dev?: boolean } = {}): string {
  const dev = opts.dev ?? false;
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", dev ? "'unsafe-eval'" : ""]
    .filter(Boolean)
    .join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:", // logo/foto/struk/barcode pakai data: & blob:
    "font-src 'self' data:",
    // HMR dev butuh websocket; produksi cukup same-origin.
    dev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    // Paksa upgrade subresource http→https hanya di produksi (dev pakai http lokal).
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}
