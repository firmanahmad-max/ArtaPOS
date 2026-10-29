import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift, MapPin, Store } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getReferralLanding } from "@/server/referrals/service";
import { storeOgImageUrl } from "@/server/public/track-info";
import { referrerDisplayName } from "@/lib/referral";
import { formatRupiah } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { FriendSignupForm } from "./signup-form";

type Params = Promise<{ slug: string; code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, code } = await params;
  const d = await getReferralLanding(slug, code).catch(() => null);
  // Halaman ajakan boleh dibagikan, tapi tak perlu diindeks mesin pencari.
  const base: Metadata = { robots: { index: false, follow: false } };
  if (!d) return { ...base, title: "Ajak Teman" };
  const title = `${referrerDisplayName(d.referrer.name)} mengajak Anda ke ${d.tenant.name}`;
  const description = `Daftar gratis & dapatkan bonus ${d.tenant.referralFriendPoints.toLocaleString("id-ID")} poin member untuk transaksi pertama Anda.`;
  return {
    ...base,
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: d.tenant.name,
      type: "website",
      locale: "id_ID",
      images: [{ url: storeOgImageUrl(d.tenant.slug, d.tenant.updatedAt), width: 1200, height: 630 }],
    },
  };
}

export default async function ReferralLandingPage({ params }: { params: Params }) {
  const { slug, code } = await params;
  const d = await getReferralLanding(slug, code).catch(() => null);
  if (!d) notFound();
  const { tenant } = d;
  const worth = tenant.referralFriendPoints * Math.max(0, tenant.pointValue);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {tenant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo} alt={tenant.name} className="h-10 w-auto max-w-24 rounded-lg bg-white object-contain" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">Program Ajak Teman</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="gradient-arta relative overflow-hidden rounded-3xl p-6 text-white shadow-xl">
          <Gift className="size-9 text-amber-300" />
          <p className="mt-3 text-sm opacity-80">{referrerDisplayName(d.referrer.name)} mengajak Anda belanja & servis di</p>
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <div className="mt-4 rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wider opacity-80">Hadiah untuk Anda</p>
            <p className="mt-1 text-3xl font-bold">
              +{tenant.referralFriendPoints.toLocaleString("id-ID")} <span className="text-lg">poin</span>
            </p>
            {worth > 0 && <p className="text-sm opacity-90">senilai {formatRupiah(worth)} potongan belanja berikutnya</p>}
            <p className="mt-2 text-xs opacity-80">
              Berlaku untuk transaksi pertama
              {tenant.referralMinPurchase > 0 ? ` minimal ${formatRupiah(tenant.referralMinPurchase)}` : ""} dalam{" "}
              {tenant.referralValidDays} hari setelah daftar.
            </p>
          </div>
        </div>

        <FriendSignupForm
          slug={tenant.slug}
          code={d.code}
          storeName={tenant.name}
          storePhone={tenant.phone}
        />

        {tenant.address && (
          <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="whitespace-pre-line">{tenant.address}</span>
          </p>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Khusus pelanggan baru · ditenagai {APP_NAME}
        </p>
      </main>
    </div>
  );
}
