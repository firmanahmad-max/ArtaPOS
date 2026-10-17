"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Copy, Eye, Loader2, MessageCircle, Settings2, SkipForward, X } from "lucide-react";
import { markReportAction, prepareReportAction } from "@/server/scheduled-reports/actions";
import { REPORT_KIND_LABEL, type ReportKind } from "@/lib/report-schedule";
import { waLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export interface DueReportView {
  kind: ReportKind;
  periodKey: string;
  label: string;
}

/**
 * Laporan WhatsApp terjadwal yang sudah jatuh jadwal (semi-otomatis): kirim 1 klik ke
 * nomor penerima di Pengaturan, pratinjau, atau lewati. Isi laporan dihitung saat diklik.
 */
export function ScheduledReportsCard({
  reports,
  hasPhone,
  canConfigure,
}: {
  reports: DueReportView[];
  hasPhone: boolean;
  canConfigure: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; text: string } | null>(null);

  if (reports.length === 0) return null;
  const keyOf = (r: DueReportView) => `${r.kind}:${r.periodKey}`;

  /** Jendela WA dibuka SINKRON saat klik (anti popup-blocker), lalu diarahkan setelah laporan siap. */
  const send = (r: DueReportView) => {
    const w = window.open("about:blank", "_blank");
    setBusy(keyOf(r));
    start(async () => {
      const res = await prepareReportAction(r.kind, r.periodKey);
      if (!res.ok || !res.text) {
        w?.close();
        setBusy(null);
        toast.error(res.message ?? "Gagal menyusun laporan.");
        return;
      }
      const href = waLink(res.text, res.phone ?? undefined);
      if (w) {
        w.opener = null;
        w.location.href = href;
      } else window.open(href, "_blank", "noopener,noreferrer");
      const m = await markReportAction(r.kind, r.periodKey, "SENT");
      setBusy(null);
      if (!m.ok) toast.error(m.message ?? "Gagal menandai terkirim.");
      else toast.success(`${REPORT_KIND_LABEL[r.kind]} dibuka di WhatsApp.`);
      router.refresh();
    });
  };

  const showPreview = (r: DueReportView) => {
    if (preview?.key === keyOf(r)) return setPreview(null);
    setBusy(keyOf(r));
    start(async () => {
      const res = await prepareReportAction(r.kind, r.periodKey);
      setBusy(null);
      if (!res.ok || !res.text) return void toast.error(res.message ?? "Gagal menyusun laporan.");
      setPreview({ key: keyOf(r), text: res.text });
    });
  };

  const skip = (r: DueReportView) =>
    start(async () => {
      const m = await markReportAction(r.kind, r.periodKey, "SKIPPED");
      if (!m.ok) return void toast.error(m.message ?? "Gagal.");
      if (preview?.key === keyOf(r)) setPreview(null);
      router.refresh();
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-4 elevate">
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/10" />
      <div className="relative flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarClock className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Laporan WhatsApp siap dikirim</p>
          <p className="text-sm text-muted-foreground">
            Sesuai jadwal laporan toko.{" "}
            {!hasPhone &&
              (canConfigure ? (
                <Link href="/settings#laporan" className="font-medium text-primary hover:underline">
                  Atur No. WA penerima
                </Link>
              ) : (
                "No. WA penerima belum diatur — pilih kontak saat mengirim."
              ))}
          </p>
        </div>
        {canConfigure && (
          <Link
            href="/settings#laporan"
            title="Atur jadwal laporan"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings2 className="size-4" />
          </Link>
        )}
      </div>

      <ul className="relative mt-3 space-y-2">
        {reports.map((r) => {
          const k = keyOf(r);
          const loading = pending && busy === k;
          return (
            <li key={k} className="rounded-xl border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{REPORT_KIND_LABEL[r.kind]}</p>
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="whatsapp" size="sm" onClick={() => send(r)} disabled={pending}>
                    {loading ? <Loader2 className="animate-spin" /> : <MessageCircle />} Kirim via WA
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => showPreview(r)} disabled={pending}>
                    {preview?.key === k ? <X /> : <Eye />} {preview?.key === k ? "Tutup" : "Pratinjau"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => skip(r)} disabled={pending} title="Lewati periode ini">
                    <SkipForward /> Lewati
                  </Button>
                </div>
              </div>
              {preview?.key === k && (
                <div className="mt-3 space-y-2">
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-sans text-xs leading-relaxed">
                    {preview.text}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(preview.text).then(
                        () => toast.success("Teks laporan disalin."),
                        () => toast.error("Gagal menyalin."),
                      )
                    }
                  >
                    <Copy /> Salin teks
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
