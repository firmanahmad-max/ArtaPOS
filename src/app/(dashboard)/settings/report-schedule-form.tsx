"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateReportSettingsAction } from "@/server/scheduled-reports/actions";
import { MORNING_HOUR, REPORT_KIND_LABEL, type ReportKind } from "@/lib/report-schedule";
import { formatLocalDateTime } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export interface DispatchView {
  id: string;
  kind: ReportKind;
  periodKey: string;
  status: "SENT" | "SKIPPED";
  actedAt: string;
}

/** Jadwal Laporan WhatsApp (semi-otomatis) + No. WA penerima + riwayat kirim. */
export function ReportScheduleForm({
  initial,
  history,
}: {
  initial: { daily: boolean; weekly: boolean; monthly: boolean; dailyHour: number; phone: string };
  history: DispatchView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      const r = await updateReportSettingsAction(v);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        router.refresh();
      } else toast.error(r.message ?? "Gagal menyimpan.");
    });

  const toggles: { key: "daily" | "weekly" | "monthly"; title: string; desc: string }[] = [
    { key: "daily", title: "Harian", desc: "Ringkasan hari ini + hal yang perlu perhatian (servis, piutang lewat tempo, stok habis)." },
    { key: "weekly", title: "Mingguan", desc: `Senin mulai jam ${MORNING_HOUR}.00 — minggu lalu vs minggu sebelumnya + produk terlaris.` },
    { key: "monthly", title: "Bulanan", desc: `Tanggal 1 mulai jam ${MORNING_HOUR}.00 — laba-rugi bulan lalu vs bulan sebelumnya + terlaris.` },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {toggles.map((t) => (
          <label
            key={t.key}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              v[t.key] ? "border-primary/40 bg-primary/5" : "hover:bg-accent/40",
            )}
          >
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--primary)]"
              checked={v[t.key]}
              onChange={(e) => setV({ ...v, [t.key]: e.target.checked })}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {t.title}
                {t.key === "daily" && v.daily && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    siap jam
                    <Select
                      value={String(v.dailyHour)}
                      onChange={(e) => setV({ ...v, dailyHour: Number(e.target.value) })}
                      className="h-7 w-24 py-0 text-xs"
                      aria-label="Jam laporan harian"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}.00 WIB
                        </option>
                      ))}
                    </Select>
                  </span>
                )}
              </span>
              <span className="block text-xs text-muted-foreground">{t.desc}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rp-phone">No. WhatsApp penerima laporan</Label>
        <Input
          id="rp-phone"
          inputMode="tel"
          placeholder="mis. 0812xxxxxxx (pemilik / grup admin)"
          value={v.phone}
          onChange={(e) => setV({ ...v, phone: e.target.value })}
          className="sm:max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Kosongkan untuk memilih kontak/grup sendiri saat mengirim (WhatsApp tidak bisa langsung ke grup lewat nomor).
        </p>
      </div>

      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Mode <b>semi-otomatis</b>: saat jadwal tiba, kartu <b>&quot;Laporan WhatsApp siap dikirim&quot;</b> muncul di
        Dashboard untuk pemilik/admin. Tekan <b>Kirim via WA</b> — pesan sudah terisi, tinggal tekan kirim di WhatsApp.
        Laporan yang terlewat tetap menunggu sampai dikirim atau dilewati.
      </p>

      <Button onClick={save} disabled={!dirty || pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan jadwal laporan
      </Button>

      {history.length > 0 && (
        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Riwayat terakhir</p>
          <ul className="divide-y text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  {REPORT_KIND_LABEL[h.kind]} <span className="font-mono text-xs text-muted-foreground">{h.periodKey}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className={h.status === "SENT" ? "font-medium text-success" : ""}>
                    {h.status === "SENT" ? "Dikirim" : "Dilewati"}
                  </span>{" "}
                  · {formatLocalDateTime(h.actedAt, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
