"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Save } from "lucide-react";
import { updateGoogleReviewUrlAction } from "@/server/reviews/actions";
import { REVIEW_SOURCE_LABEL, type ReviewSourceKey } from "@/lib/review";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RequestReviewButton } from "@/components/reviews/request-review-button";

export interface Candidate {
  source: ReviewSourceKey;
  id: string;
  number: string;
  title: string;
  customerName: string | null;
  hasPhone: boolean;
  atText: string;
}

const DOC_HREF: Record<ReviewSourceKey, string> = { SERVICE: "/service", BUILD: "/pc-build", SALE: "/sales" };

/** Dokumen yang siap dimintai ulasan (belum pernah diminta). */
export function CandidateList({ items, storeName }: { items: Candidate[]; storeName: string }) {
  const [sent, setSent] = useState<Set<string>>(new Set());
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Semua servis, rakitan & belanja member 30 hari terakhir sudah dimintai ulasan. 👍
      </Card>
    );
  }
  return (
    <Card className="divide-y">
      {items.map((c) => (
        <div key={`${c.source}-${c.id}`} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {c.customerName || "Pelanggan"}
              {!c.hasPhone && <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">tanpa No. HP</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {REVIEW_SOURCE_LABEL[c.source]} ·{" "}
              <Link href={`${DOC_HREF[c.source]}/${c.id}`} className="font-mono hover:underline">{c.number}</Link>
              {c.title ? ` · ${c.title}` : ""} · {c.atText}
            </p>
          </div>
          {sent.has(c.id) ? (
            <span className="text-xs font-medium text-success">✓ Permintaan dikirim</span>
          ) : (
            <RequestReviewButton
              source={c.source}
              id={c.id}
              storeName={storeName}
              onDone={() => setSent((s) => new Set(s).add(c.id))}
            />
          )}
        </div>
      ))}
    </Card>
  );
}

/** Pengaturan link ulasan Google (tujuan pelanggan yang puas). */
export function GoogleReviewSettings({ initial, canManage }: { initial: string | null; canManage: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const r = await updateGoogleReviewUrlAction(url);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan.");
        router.refresh();
      } else toast.error(r.message ?? "Gagal menyimpan.");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://g.page/r/…/review"
          disabled={!canManage}
          className="min-w-0 flex-[1_1_260px]"
          inputMode="url"
        />
        {canManage && (
          <Button onClick={save} disabled={pending || url.trim() === (initial ?? "")}>
            <Save /> Simpan
          </Button>
        )}
        {initial && (
          <a
            href={initial}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 px-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-4" /> Uji link
          </a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Cara mendapatkan: buka <b>Google Business Profile</b> toko (cari nama toko di Google saat login sebagai pemilik) →
        &ldquo;Minta ulasan&rdquo; / &ldquo;Ask for reviews&rdquo; → salin link. Tanpa link ini, pelanggan tetap bisa memberi
        ulasan di ArtaPOS, hanya tidak diarahkan ke Google.
      </p>
    </div>
  );
}
