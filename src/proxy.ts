import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";
import { buildCsp } from "@/lib/security/csp";

/**
 * Proxy (pengganti middleware di Next 16). Dua tugas:
 * 1. OPTIMISTIC auth check (baca cookie saja, TANPA DB) — cepat di tiap rute.
 *    Pengecekan aman (ke DB) tetap di DAL/Server Action/Route Handler.
 * 2. Set Content-Security-Policy berbasis NONCE per-request. Root layout membaca
 *    `x-nonce` via headers() → seluruh halaman ter-render dinamis sehingga Next
 *    menyuntikkan nonce ke semua skrip framework/bundle (tak ada halaman statis
 *    yang skripnya kehilangan nonce lalu terblokir).
 */

// Rute publik (auth) — boleh tanpa login; user yg sudah login dialihkan ke dashboard.
const PUBLIC_ROUTES = ["/login", "/setup"];
// Rute terbuka — selalu bisa diakses siapa pun (lacak servis, halaman Tentang).
const OPEN_ROUTES = ["/lacak", "/about", "/disclaimer", "/privacy", "/terms"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nonce unik per-request → CSP ketat (script-src nonce + strict-dynamic).
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next membaca nonce dari header CSP request saat SSR untuk menyuntikkannya.
  requestHeaders.set("content-security-policy", csp);

  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  const allow = () => withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  const redirectTo = (url: URL) => withCsp(NextResponse.redirect(url));

  // Rute terbuka: lewati pengecekan auth (tapi tetap kirim CSP + nonce).
  if (OPEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return allow();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  const isAuthed = Boolean(session?.userId);
  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  // Belum login & rute terproteksi → ke /login
  if (!isAuthed && !isPublic) {
    return redirectTo(new URL("/login", req.nextUrl));
  }

  // Sudah login tapi buka halaman publik (login/setup) → ke /dashboard
  if (isAuthed && isPublic) {
    return redirectTo(new URL("/dashboard", req.nextUrl));
  }

  return allow();
}

export const config = {
  // Jalankan di semua rute kecuali aset statis & endpoint internal.
  // /api dikecualikan: route handler memverifikasi sendiri via DAL (dan JSON
  // tak butuh CSP).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|sw.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
