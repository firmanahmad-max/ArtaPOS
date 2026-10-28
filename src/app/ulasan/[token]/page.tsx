import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getReviewByToken } from "@/server/reviews/service";
import { storeOgImageUrl } from "@/server/public/track-info";
import { APP_NAME } from "@/lib/brand";
import { isGoogleReviewUrl, REVIEW_SOURCE_LABEL } from "@/lib/review";
import { ReviewForm } from "./review-form";

/** Link pribadi: jangan diindeks & jangan bocorkan token lewat Referer. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const r = await getReviewByToken(token).catch(() => null);
  const base: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
  if (!r) return { ...base, title: "Ulasan Pelanggan" };
  const title = `Beri ulasan untuk ${r.tenant.name}`;
  const description = "Bagaimana pengalaman Anda? Cukup pilih bintang — hanya 30 detik.";
  return {
    ...base,
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: r.tenant.name,
      type: "website",
      locale: "id_ID",
      images: [{ url: storeOgImageUrl(r.tenant.slug, r.tenant.updatedAt), width: 1200, height: 630 }],
    },
  };
}

const WHAT: Record<string, string> = { SERVICE: "servis", BUILD: "rakitan PC", SALE: "belanja" };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await getReviewByToken(token).catch(() => null);
  if (!r) notFound();
  const firstName = r.customerName?.trim().split(/\s+/)[0] ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {r.tenant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.tenant.logo} alt={r.tenant.name} className="h-10 w-auto max-w-24 rounded-lg bg-white object-contain" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold">{r.tenant.name}</p>
            <p className="text-xs text-muted-foreground">Ulasan Pelanggan</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight">
          {firstName ? `Halo ${firstName}, ` : ""}bagaimana pengalaman {WHAT[r.source]} Anda?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {REVIEW_SOURCE_LABEL[r.source]} <span className="font-mono">{r.docNumber}</span> di {r.tenant.name}
        </p>
        <ReviewForm
          token={token}
          storeName={r.tenant.name}
          initial={{ rating: r.rating, comment: r.comment ?? "", allowPublic: r.allowPublic, submitted: !!r.submittedAt }}
          googleUrl={isGoogleReviewUrl(r.tenant.googleReviewUrl) ? r.tenant.googleReviewUrl : null}
        />
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Ulasan dikirim langsung ke {r.tenant.name} · ditenagai {APP_NAME}
        </p>
      </main>
    </div>
  );
}
