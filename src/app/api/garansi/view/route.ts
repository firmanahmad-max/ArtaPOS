import { NextResponse } from "next/server";
import { isWarrantyToken } from "@/lib/warranty-card";
import { recordWarrantyCardView } from "@/server/warranty/service";

/**
 * Endpoint PUBLIK (tanpa auth): catat kartu garansi digital dibuka { token }.
 * Hanya menambah penghitung — tanpa data pengunjung. Dipanggil via sendBeacon.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
    if (!body || typeof body.token !== "string" || !isWarrantyToken(body.token)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await recordWarrantyCardView(body.token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
