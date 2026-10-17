import { NextResponse } from "next/server";
import { isPortalToken } from "@/lib/portal";
import { recordPortalVisit } from "@/server/portal/service";

/**
 * Endpoint PUBLIK (tanpa auth) untuk mencatat kunjungan Portal Member:
 *   { token: string, ref?: "struk" | "nota" | "pengingat" | "undangan" }
 * Hanya menambah penghitung (jumlah & waktu terakhir dibuka) — tanpa data pengunjung.
 * Dipanggil fire-and-forget via navigator.sendBeacon; /api dikecualikan dari proxy.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown; ref?: unknown } | null;
    if (!body || typeof body.token !== "string" || !isPortalToken(body.token)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await recordPortalVisit(body.token, body.ref);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
