import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { fitInside, imageSize, parseImageDataUrl } from "@/lib/image-size";
import { getStoreOgSource } from "@/server/public/track-info";

/**
 * Gambar pratinjau tautan (Open Graph) milik TOKO — dipakai saat tautan /lacak
 * atau /galeri dibagikan ke WhatsApp, agar yang tampil logo toko (bukan brosur ArtaPOS).
 * Logo ditaruh di tengah kanvas putih 1200×630; kotak logo ≤560 px lebar agar
 * tetap utuh saat WhatsApp memotong pratinjau jadi persegi di tengah.
 * Toko tanpa logo → kartu nama toko. Slug tak dikenal → gambar default ArtaPOS.
 */
const W = 1200;
const H = 630;
const CACHE = "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreOgSource(slug);
  if (!store) return NextResponse.redirect(new URL("/og-artapos.png", req.url));

  const parsed = store.logo ? parseImageDataUrl(store.logo) : null;
  const size = parsed ? imageSize(parsed.bytes) : null;
  const box = size ? fitInside(size, 560, 500, 2) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {store.logo && box ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={store.logo} width={box.width} height={box.height} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              display: "flex",
              maxWidth: 560,
              textAlign: "center",
              fontSize: store.name.length > 18 ? 64 : 84,
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#1c1530",
            }}
          >
            {store.name}
          </div>
        )}
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": CACHE } },
  );
}
