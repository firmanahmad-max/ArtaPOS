import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Proxy (pengganti middleware di Next 16) — OPTIMISTIC auth check.
 * Hanya membaca session dari cookie (TIDAK menyentuh DB) agar cepat di setiap rute.
 * Pengecekan aman (ke DB) tetap dilakukan di DAL/Server Action/Route Handler.
 */

// Rute publik (auth) — boleh tanpa login; user yg sudah login dialihkan ke dashboard.
const PUBLIC_ROUTES = ["/login", "/setup"];
// Rute terbuka — selalu bisa diakses siapa pun (mis. lacak servis pelanggan).
const OPEN_ROUTES = ["/lacak"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rute terbuka: lewati semua pengecekan auth.
  if (OPEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  const isAuthed = Boolean(session?.userId);
  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  // Belum login & rute terproteksi → ke /login
  if (!isAuthed && !isPublic) {
    const url = new URL("/login", req.nextUrl);
    return NextResponse.redirect(url);
  }

  // Sudah login tapi buka halaman publik (login/setup) → ke /dashboard
  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan di semua rute kecuali aset statis & endpoint internal.
  // /api dikecualikan: route handler memverifikasi sendiri via DAL.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|sw.js|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
