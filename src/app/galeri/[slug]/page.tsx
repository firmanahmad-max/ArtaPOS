import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatRupiah } from "@/lib/utils";
import { parseGalleryQuery } from "@/lib/gallery-filter";
import { APP_NAME } from "@/lib/brand";
import { getGalleryStoreBySlug, listGalleryPublic } from "@/server/gallery/service";
import { galleryRefKind } from "@/lib/track-link";
import { waLink } from "@/lib/whatsapp";
import { storeOgImageUrl } from "@/server/public/track-info";
import { VisitBeacon } from "@/components/public/visit-beacon";
import { ViewBeacon } from "./gallery-tracker";
import { GalleryBrowser } from "./gallery-browser";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getGalleryStoreBySlug(slug).catch(() => null);
  const name = store?.name ?? "Galeri";
  const desc = `Produk & promo pilihan dari ${name}. Lihat spesifikasi, harga, dan hubungi via WhatsApp.`;
  // Pratinjau tautan WA = logo TOKO (route OG per toko); toko tak ditemukan → gambar galeri umum.
  const ogUrl = store?.isActive ? storeOgImageUrl(store.slug, store.updatedAt) : "/og-galeri.png";
  const img = [{ url: ogUrl, width: 1200, height: 630, alt: `Galeri ${name}` }];
  return {
    title: `Galeri — ${name}`,
    description: desc,
    openGraph: {
      title: `Galeri Produk — ${name}`,
      description: desc,
      siteName: name,
      type: "website",
      images: img,
    },
    twitter: {
      card: "summary_large_image",
      title: `Galeri Produk — ${name}`,
      description: desc,
      images: [ogUrl],
    },
  };
}

/** Normalisasi nomor HP toko → WhatsApp id (62…). */
function waId(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (!d.startsWith("62")) d = "62" + d;
  return d;
}

export default async function GaleriPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const ref = typeof sp.ref === "string" ? sp.ref : undefined;
  // `?ref=` = asal tautan (lacak/struk/titip) → dicatat sebagai metrik kunjungan.
  const refKind = galleryRefKind(ref);
  const store = await getGalleryStoreBySlug(slug).catch(() => null);
  if (!store || !store.isActive) notFound();

  const items = await listGalleryPublic(store.id).catch(() => []);
  const wid = waId(store.phone);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {store.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo} alt={store.name} className="h-10 w-auto max-w-24 rounded-lg bg-white object-contain" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold">{store.name}</p>
            <p className="text-xs text-muted-foreground">Galeri Produk &amp; Promo</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ViewBeacon slug={slug} ids={items.map((i) => i.id)} />
        {refKind && <VisitBeacon slug={store.slug} kind={refKind} />}
        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            Belum ada produk yang dipajang. Silakan cek kembali nanti.
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold tracking-tight">Produk Pilihan</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {items.length >= 4 ? "Cari & saring berdasarkan kategori, brand, kondisi atau harga. " : ""}
              Tertarik dengan salah satu produk? Hubungi kami langsung via WhatsApp.
            </p>
            <GalleryBrowser
              keepRef={refKind ? (ref ?? null) : null}
              initial={parseGalleryQuery(sp)}
              items={items.map((it) => ({
                ...it,
                waHref: wid
                  ? waLink(
                      `Halo ${store.name}, saya tertarik dengan *${it.title}*${
                        it.price > 0 ? ` (${formatRupiah(it.price)})` : ""
                      }. Apakah masih tersedia?`,
                      wid,
                    )
                  : null,
              }))}
            />
          </>
        )}

        <footer className="mt-10 border-t pt-5 text-center text-xs text-muted-foreground">
          Galeri oleh <span className="font-medium text-foreground">{store.name}</span> · ditenagai {APP_NAME}
        </footer>
      </main>
    </div>
  );
}
