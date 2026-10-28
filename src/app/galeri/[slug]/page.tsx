import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatRupiah } from "@/lib/utils";
import { parseGalleryQuery } from "@/lib/gallery-filter";
import { formatRating, REVIEW_SOURCE_LABEL } from "@/lib/review";
import { formatLocalDate } from "@/lib/timezone";
import { getPublicReviews } from "@/server/reviews/service";
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

  const [items, reviews] = await Promise.all([
    listGalleryPublic(store.id).catch(() => []),
    getPublicReviews(store.id),
  ]);
  // Rata-rata bintang ditampilkan bila sudah cukup ulasan (agar tak menyesatkan).
  const showRating = reviews.average != null && reviews.count >= 3;
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
            <p className="text-xs text-muted-foreground">
              Galeri Produk &amp; Promo
              {showRating && (
                <a href="#testimoni" className="ml-1.5 font-semibold text-amber-600 hover:underline dark:text-amber-400">
                  ★ {formatRating(reviews.average!)} · {reviews.count} ulasan
                </a>
              )}
            </p>
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

        {reviews.testimonials.length > 0 && (
          <section id="testimoni" className="mt-12 scroll-mt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Kata Pelanggan</h2>
                <p className="text-sm text-muted-foreground">Ulasan asli dari pelanggan {store.name}.</p>
              </div>
              {showRating && (
                <p className="text-sm">
                  <span className="text-lg font-bold text-amber-500">★ {formatRating(reviews.average!)}</span>
                  <span className="text-muted-foreground"> / 5 dari {reviews.count} ulasan</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.testimonials.map((t) => (
                <figure key={t.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 elevate">
                  <div className="text-lg tracking-wider text-amber-500" aria-label={`${t.rating} dari 5 bintang`}>
                    {"★".repeat(t.rating)}
                    <span className="text-muted-foreground/30">{"★".repeat(5 - t.rating)}</span>
                  </div>
                  <blockquote className="flex-1 whitespace-pre-line text-sm leading-relaxed">&ldquo;{t.comment}&rdquo;</blockquote>
                  <figcaption className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{t.name}</span> · {REVIEW_SOURCE_LABEL[t.source]} ·{" "}
                    {formatLocalDate(new Date(t.at), { month: "short", year: "numeric" })}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t pt-5 text-center text-xs text-muted-foreground">
          Galeri oleh <span className="font-medium text-foreground">{store.name}</span> · ditenagai {APP_NAME}
        </footer>
      </main>
    </div>
  );
}
