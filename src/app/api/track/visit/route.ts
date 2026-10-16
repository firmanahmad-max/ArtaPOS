import { NextResponse } from "next/server";
import { isLinkVisitKind } from "@/lib/track-link";
import { recordLinkVisit } from "@/server/link-stats/service";

/**
 * Endpoint PUBLIK (tanpa auth) untuk mencatat kunjungan dari tautan yang dibagikan
 * toko: halaman lacak dibuka dari WA, galeri dibuka dari lacak/struk/tanda titip.
 *   { slug: string, kind: LinkVisitKind }
 * Hanya meng-increment penghitung agregat per toko per hari (tanpa data pengunjung).
 * Dipanggil fire-and-forget via navigator.sendBeacon; /api dikecualikan dari proxy.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { slug?: unknown; kind?: unknown } | null;
    if (!body || typeof body.slug !== "string" || !isLinkVisitKind(body.kind)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await recordLinkVisit(body.slug, body.kind);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
