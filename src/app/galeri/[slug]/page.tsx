import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatRupiah } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { getGalleryStoreBySlug, listGalleryPublic } from "@/server/gallery/service";
import { ShareButton } from "./share-button";
import { ViewBeacon, ChatWaButton } from "./gallery-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getGalleryStoreBySlug(slug).catch(() => null);
  const name = store?.name ?? "Galeri";
  const desc = `Produk & promo pilihan dari ${name}. Lihat spesifikasi, harga, dan hubungi via WhatsApp.`;
  const img = [{ url: "/og-galeri.png", width: 1200, height: 630, alt: `Galeri ${name}` }];
  return {
    title: `Galeri — ${name}`,
    description: desc,
    openGraph: {
      title: `Galeri Produk — ${name}`,
      description: desc,
      type: "website",
      images: img,
    },
    twitter: {
      card: "summary_large_image",
      title: `Galeri Produk — ${name}`,
      description: desc,
      images: ["/og-galeri.png"],
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

export default async function GaleriPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
            <img src={store.logo} alt={store.name} className="size-10 rounded-lg object-cover" />
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
        {items.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            Belum ada produk yang dipajang. Silakan cek kembali nanti.
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold tracking-tight">Produk Pilihan</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Tertarik dengan salah satu produk? Hubungi kami langsung via WhatsApp.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => {
                const msg = `Halo ${store.name}, saya tertarik dengan *${it.title}*${
                  it.price > 0 ? ` (${formatRupiah(it.price)})` : ""
                }. Apakah masih tersedia?`;
                const waHref = wid ? `https://wa.me/${wid}?text=${encodeURIComponent(msg)}` : null;
                return (
                  <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card elevate">
                    <div className="relative aspect-[4/3] bg-muted/40">
                      {it.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.photo} alt={it.title} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Tanpa foto</div>
                      )}
                      {it.label && (
                        <span className="absolute left-3 top-3 rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
                          {it.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h2 className="font-semibold leading-snug">{it.title}</h2>
                      {it.spec && <p className="whitespace-pre-line text-sm text-muted-foreground">{it.spec}</p>}
                      <p className="mt-auto pt-1 font-mono text-lg font-bold tabular-nums text-primary">
                        {it.price > 0 ? formatRupiah(it.price) : "Hubungi untuk harga"}
                      </p>
                      <div className="mt-1 flex flex-col gap-2">
                        {waHref && <ChatWaButton itemId={it.id} href={waHref} />}
                        <ShareButton title={it.title} price={it.price} spec={it.spec} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <footer className="mt-10 border-t pt-5 text-center text-xs text-muted-foreground">
          Galeri oleh <span className="font-medium text-foreground">{store.name}</span> · ditenagai {APP_NAME}
        </footer>
      </main>
    </div>
  );
}
