import { NextResponse } from "next/server";
import { recordGalleryViews, recordGalleryClick } from "@/server/gallery/service";

/**
 * Endpoint PUBLIK (tanpa auth) untuk mencatat metrik Galeri Publik dari sisi
 * konsumen. Dipanggil fire-and-forget via navigator.sendBeacon / fetch keepalive.
 *   - { type: "view",  ids: string[] }  → +1 view tiap item (sekali per sesi browser)
 *   - { type: "click", id: string }     → +1 klik tombol "Chat WA" pada item
 * Hanya meng-increment penghitung (tak membocorkan data) → aman tanpa auth.
 * /api dikecualikan dari proxy (lihat src/proxy.ts matcher).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { type?: string; ids?: unknown; id?: unknown }
      | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    if (body.type === "view" && Array.isArray(body.ids)) {
      const ids = body.ids.filter((x): x is string => typeof x === "string");
      await recordGalleryViews(ids);
      return NextResponse.json({ ok: true });
    }
    if (body.type === "click" && typeof body.id === "string") {
      await recordGalleryClick(body.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
