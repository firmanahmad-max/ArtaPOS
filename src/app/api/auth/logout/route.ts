import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/session";

/**
 * Logout via Route Handler — menghapus cookie sesi lalu mengarahkan ke /login.
 *
 * Dipakai DAL saat sesi tak valid (user dihapus/dinonaktifkan tapi JWT masih
 * berlaku). Tanpa menghapus cookie, proxy (optimistic, baca cookie saja)
 * menganggap user masih login → /login dialihkan ke /dashboard, sementara DAL
 * (cek DB) mengalihkan /dashboard ke /login → loop redirect tak berujung.
 * Route Handler boleh memodifikasi cookie (Server Component tidak), dan rute
 * /api dikecualikan dari proxy sehingga tak ikut loop.
 */
export async function GET() {
  await deleteSession();
  redirect("/login");
}
