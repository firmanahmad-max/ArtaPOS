"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { requestReviewAction } from "@/server/reviews/actions";
import { buildReviewRequestText, waLink } from "@/lib/whatsapp";
import { buildReviewUrl } from "@/lib/review";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WHAT: Record<string, string> = { SERVICE: "servis", BUILD: "rakitan PC", SALE: "belanja" };

/**
 * "Minta ulasan via WhatsApp": siapkan link pribadi /ulasan/<token> di server lalu
 * buka WA berisi pesan. Jendela dibuka SINKRON saat klik (anti popup-blocker) lalu
 * diarahkan setelah link siap.
 */
export function RequestReviewButton({
  source,
  id,
  storeName,
  status,
  size = "sm",
  className,
  onDone,
}: {
  source: "SERVICE" | "BUILD" | "SALE";
  id: string;
  storeName: string;
  /** Status ulasan dokumen ini (bila sudah pernah diminta/diisi). */
  status?: { rating: number | null; requested: boolean } | null;
  size?: "sm" | "default";
  className?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function run() {
    const w = typeof window !== "undefined" ? window.open("", "_blank") : null;
    start(async () => {
      const r = await requestReviewAction(source, id);
      if (!r.ok) {
        w?.close();
        toast.error(r.message);
        return;
      }
      const text = buildReviewRequestText({
        storeName,
        customerName: r.customerName,
        what: WHAT[source],
        docNumber: r.docNumber,
        url: buildReviewUrl(window.location.origin, r.token),
      });
      const url = waLink(text, r.phone ?? undefined);
      if (w) w.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      if (r.alreadySubmitted) toast.info("Pelanggan ini sudah pernah mengisi ulasan — link yang sama dikirim ulang.");
      else if (!r.phone) toast.info("No. HP pelanggan tidak tersimpan — pilih kontaknya di WhatsApp.");
      setSent(true);
      onDone?.();
      router.refresh();
    });
  }

  const rated = status?.rating != null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <Button variant="outline" size={size} onClick={run} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Star className="text-amber-500" />}
        {rated ? "Kirim ulang link ulasan" : status?.requested || sent ? "Kirim ulang permintaan ulasan" : "Minta ulasan via WhatsApp"}
      </Button>
      {rated && (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400" title="Ulasan pelanggan">
          {"★".repeat(status!.rating!)}
          <span className="text-muted-foreground">{"★".repeat(5 - status!.rating!)}</span>
        </span>
      )}
      {!rated && (status?.requested || sent) && <span className="text-xs text-muted-foreground">Menunggu pelanggan mengisi</span>}
    </span>
  );
}
