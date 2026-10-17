"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, SkipForward, Undo2, Check } from "lucide-react";
import { clearReminderStatusAction, setReminderStatusAction } from "@/server/service-catalog/actions";
import { buildServiceReminderText, waLink } from "@/lib/whatsapp";
import { buildPortalUrl } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export interface ReminderView {
  key: string;
  sourceTicketId: string;
  sourceTicketNumber: string;
  catalogItemId: string;
  serviceName: string;
  customerName: string;
  customerId: string | null;
  portalToken: string | null;
  isMember: boolean;
  phone: string | null;
  waConsent: boolean;
  device: string;
  lastServiceText: string;
  dueText: string;
  daysToDue: number;
  monthsAgo: number;
  state: "pending" | "reminded" | "skipped";
  actedText: string | null;
}

export function ReminderList({
  rows,
  storeName,
  pointsMultiplier,
}: {
  rows: ReminderView[];
  storeName: string;
  /** Pengali poin jasa servis bila program poin aktif (null = tidak disebut). */
  pointsMultiplier: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  function remind(r: ReminderView) {
    if (!r.phone) return;
    const text = buildServiceReminderText({
      storeName,
      customerName: r.customerName,
      device: r.device,
      serviceName: r.serviceName,
      monthsAgo: r.monthsAgo,
      pointsMultiplier,
      portalUrl: r.portalToken ? buildPortalUrl(window.location.origin, r.portalToken) : null,
    });
    // Buka WA dulu (harus sinkron di event klik agar tak diblokir popup), lalu tandai.
    window.open(waLink(text, r.phone), "_blank", "noopener,noreferrer");
    run(() => setReminderStatusAction(r.sourceTicketId, r.catalogItemId, "REMINDED"));
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {rows.map((r) => {
        const overdue = r.daysToDue <= 0;
        const canWa = !!r.phone && r.waConsent;
        return (
          <Card key={r.key} className="space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.customerId ? (
                    <Link href={`/customers/${r.customerId}/edit`} className="hover:underline">
                      {r.customerName}
                    </Link>
                  ) : (
                    r.customerName
                  )}
                  {r.isMember && <Badge variant="success">Member</Badge>}
                </p>
                <p className="truncate text-sm text-muted-foreground">{r.device || "Perangkat"}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  overdue ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                {overdue ? (r.daysToDue === 0 ? "Jatuh tempo hari ini" : `Lewat ${-r.daysToDue} hari`) : `${r.daysToDue} hari lagi`}
              </span>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{r.serviceName}</span>
              <span className="text-muted-foreground">
                {" "}
                · terakhir {r.lastServiceText} (
                <Link href={`/service/${r.sourceTicketId}`} className="hover:underline">
                  {r.sourceTicketNumber}
                </Link>
                ) · jatuh tempo {r.dueText}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {r.state === "pending" ? (
                <>
                  {canWa ? (
                    <Button size="sm" variant="whatsapp" disabled={pending} onClick={() => remind(r)}>
                      <MessageCircle className="size-4" /> Ingatkan via WA
                    </Button>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {!r.phone ? "Tanpa No. HP — hubungi manual." : "Pelanggan tidak bersedia dihubungi via WA."}
                      </span>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setReminderStatusAction(r.sourceTicketId, r.catalogItemId, "REMINDED"))}>
                        <Check className="size-4" /> Tandai sudah dihubungi
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setReminderStatusAction(r.sourceTicketId, r.catalogItemId, "SKIPPED"))}>
                    <SkipForward className="size-4" /> Lewati
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">
                    {r.state === "reminded" ? "Diingatkan" : "Dilewati"} {r.actedText}
                  </span>
                  {r.state === "reminded" && canWa && (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => remind(r)}>
                      <MessageCircle className="size-4" /> Kirim ulang
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => clearReminderStatusAction(r.sourceTicketId, r.catalogItemId))}>
                    <Undo2 className="size-4" /> Batalkan
                  </Button>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
