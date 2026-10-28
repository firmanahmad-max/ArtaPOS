import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, MessageSquareWarning, MousePointerClick, Star, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getReviewSettings, listReviewCandidates, listReviews } from "@/server/reviews/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { formatRating, isGoogleReviewUrl, summarizeReviews, type ReviewSourceKey } from "@/lib/review";
import { formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { ReviewList, type ReviewItem } from "./review-list";
import { CandidateList, GoogleReviewSettings } from "./review-extras";

export const metadata: Metadata = { title: "Ulasan Pelanggan" };

const D = (d: Date) => formatLocalDate(d, { day: "numeric", month: "short", year: "numeric" });

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { filter = "ulasan" } = await searchParams;

  let rows: Awaited<ReturnType<typeof listReviews>> = [];
  let candidates: Awaited<ReturnType<typeof listReviewCandidates>> = [];
  let settings = { googleReviewUrl: null as string | null, slug: null as string | null };
  let migrated = true;
  try {
    [rows, candidates, settings] = await Promise.all([
      listReviews(user.tenantId),
      listReviewCandidates(user.tenantId),
      getReviewSettings(user.tenantId),
    ]);
  } catch {
    migrated = false; // tabel/kolom belum ada di database
  }
  const store = await getReceiptStoreInfo(user.tenantId);
  const sum = summarizeReviews(rows);

  const items: ReviewItem[] = rows.map((r) => ({
    id: r.id,
    source: r.source as ReviewSourceKey,
    docId: r.serviceTicketId ?? r.pcBuildId ?? r.saleId,
    docNumber: r.docNumber,
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    rating: r.submittedAt ? r.rating : null,
    comment: r.comment,
    allowPublic: r.allowPublic,
    testimonial: r.testimonial,
    googleClicked: !!r.googleClickedAt,
    followUpDone: !!r.followUpDoneAt,
    followUpText: r.followUpDoneAt ? D(r.followUpDoneAt) : null,
    followUpNote: r.followUpNote,
    requestedText: r.requestedAt ? D(r.requestedAt) : null,
    submittedText: r.submittedAt ? D(r.submittedAt) : null,
  }));
  const submitted = items.filter((i) => i.rating != null);
  const lists: Record<string, { list: ReviewItem[]; empty: string }> = {
    ulasan: { list: submitted, empty: "Belum ada ulasan masuk. Kirim permintaan dari tab “Siap diminta”." },
    tindak: {
      list: submitted.filter((i) => i.rating! < 4 && !i.followUpDone),
      empty: "Tidak ada ulasan rendah yang menunggu tindak lanjut. 🎉",
    },
    testimoni: {
      list: submitted.filter((i) => i.allowPublic && !!i.comment),
      empty: "Belum ada pelanggan yang mengizinkan ulasannya tampil sebagai testimoni.",
    },
    menunggu: { list: items.filter((i) => i.rating == null), empty: "Tidak ada permintaan yang menunggu diisi." },
  };
  const hasGoogle = isGoogleReviewUrl(settings.googleReviewUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ulasan Pelanggan</h1>
          <p className="text-muted-foreground">
            Minta ulasan via WhatsApp setelah servis, rakitan atau belanja. Yang puas diajak mengulas di Google; yang kurang
            puas langsung masuk ke Anda untuk ditindaklanjuti.
          </p>
        </div>
        {settings.slug && (
          <Link href={`/galeri/${settings.slug}#testimoni`} target="_blank" className={buttonVariants({ variant: "outline" })}>
            <ExternalLink className="size-4" /> Testimoni di Galeri
          </Link>
        )}
      </div>

      {!migrated && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          Fitur ulasan belum aktif di database — jalankan migrasi <code>20261029090000_customer_reviews</code> terlebih dahulu.
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Star}
          tone="amber"
          label="Rata-rata bintang"
          value={sum.average != null ? `${formatRating(sum.average)} / 5` : "—"}
          hint={`${sum.submitted} ulasan`}
          chart={
            sum.submitted > 0 ? (
              <div className="mt-1 space-y-0.5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-2.5 font-mono">{n}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(sum.distribution[n] / sum.submitted) * 100}%` }} />
                    </div>
                    <span className="w-4 text-right font-mono">{sum.distribution[n]}</span>
                  </div>
                ))}
              </div>
            ) : undefined
          }
        />
        <StatCard
          icon={Send}
          tone="violet"
          label="Respons"
          value={`${sum.responseRate}%`}
          hint={`${sum.submitted} dari ${sum.requested} permintaan`}
          progress={sum.responseRate}
        />
        <StatCard
          icon={MousePointerClick}
          tone="emerald"
          label="Diarahkan ke Google"
          value={sum.google}
          hint={hasGoogle ? "klik tombol ulas di Google" : "link Google belum diisi"}
        />
        <StatCard
          icon={MessageSquareWarning}
          tone="rose"
          label="Perlu tindak lanjut"
          value={sum.openFollowUps}
          hint="ulasan 1–3 bintang"
          accent={sum.openFollowUps > 0}
          href="/reviews?filter=tindak"
        />
      </div>

      <FilterChips
        defaultValue="ulasan"
        chips={[
          { value: "ulasan", label: "Ulasan masuk", count: submitted.length },
          { value: "tindak", label: "Perlu tindak lanjut", count: lists.tindak.list.length, tone: "danger" },
          { value: "testimoni", label: "Testimoni", count: lists.testimoni.list.length, tone: sum.pendingTestimonials ? "warning" : "default" },
          { value: "menunggu", label: "Menunggu diisi", count: lists.menunggu.list.length },
          { value: "minta", label: "Siap diminta", count: candidates.length, tone: candidates.length ? "success" : "default" },
        ]}
      />

      {filter === "minta" ? (
        <CandidateList
          storeName={user.tenant.name}
          items={candidates.map((c) => ({
            source: c.source as ReviewSourceKey,
            id: c.id,
            number: c.number,
            title: c.title,
            customerName: c.customerName,
            hasPhone: !!c.phone,
            atText: D(c.at),
          }))}
        />
      ) : (
        <ReviewList
          items={(lists[filter] ?? lists.ulasan).list}
          empty={(lists[filter] ?? lists.ulasan).empty}
          storeName={user.tenant.name}
          store={{ name: user.tenant.name, logo: store.logo, phone: store.phone }}
        />
      )}

      <Card id="google">
        <CardHeader>
          <CardTitle>Link Ulasan Google</CardTitle>
          <CardDescription>
            Pelanggan yang memberi 4–5 bintang diajak menulis ulasan yang sama di Google Maps. Pelanggan lain tetap melihat tautan
            kecil ke Google — sesuai kebijakan Google yang melarang hanya mengajak pelanggan yang puas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleReviewSettings initial={settings.googleReviewUrl} canManage={can(user.role, "settings.manage")} />
        </CardContent>
      </Card>
    </div>
  );
}
