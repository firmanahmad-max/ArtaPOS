"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, Loader2, MessageCircle, RefreshCw, ShieldOff, UserRound } from "lucide-react";
import {
  ensurePortalLinkAction,
  regeneratePortalLinkAction,
  revokePortalLinkAction,
} from "@/server/customers/actions";
import { buildPortalUrl } from "@/lib/portal";
import { buildPortalInviteText, waLink } from "@/lib/whatsapp";
import { formatLocalDateTime } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Kartu kelola link Portal Pelanggan (/member/<token>) di halaman edit pelanggan. */
export function PortalCard({
  customerId,
  customerName,
  phone,
  storeName,
  initialToken,
  tokenAt,
}: {
  customerId: string;
  customerName: string;
  phone: string | null;
  storeName: string;
  initialToken: string | null;
  tokenAt: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [createdAt, setCreatedAt] = useState(tokenAt);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"regen" | "revoke" | null>(null);

  const url = (t: string) => buildPortalUrl(window.location.origin, t);

  const run = (fn: () => Promise<{ ok: boolean; token?: string | null; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.message ?? "Gagal.");
        return;
      }
      if (r.token !== undefined) {
        if (r.token !== token) setCreatedAt(r.token ? new Date().toISOString() : null);
        setToken(r.token);
      }
      if (r.message) toast.success(r.message);
    });

  const copy = (t: string) =>
    navigator.clipboard.writeText(url(t)).then(
      () => toast.success("Link portal disalin."),
      () => toast.error("Gagal menyalin."),
    );

  const waHref = (t: string) =>
    waLink(buildPortalInviteText({ storeName, customerName, portalUrl: url(t) }), phone ?? undefined);
  const sendWa = (t: string) => window.open(waHref(t), "_blank", "noopener,noreferrer");

  /** Buat link lalu kirim: jendela dibuka SINKRON saat klik (agar tak diblokir popup blocker). */
  const createAndSend = () => {
    const w = window.open("about:blank", "_blank");
    start(async () => {
      const r = await ensurePortalLinkAction(customerId);
      if (!r.ok || !r.token) {
        w?.close();
        toast.error(r.message ?? "Gagal.");
        return;
      }
      setToken(r.token);
      setCreatedAt(new Date().toISOString());
      if (w) {
        w.opener = null;
        w.location.href = waHref(r.token);
      } else sendWa(r.token);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-5 text-primary" /> Portal Pelanggan
        </CardTitle>
        <CardDescription>
          Link pribadi untuk pelanggan melihat poin, riwayat servis per perangkat, garansi, dan belanjanya — tanpa
          password. Bagikan HANYA ke nomor WA pelanggan ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {token ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 flex-1 truncate font-mono text-xs">/member/{token}</code>
            </div>
            {createdAt && (
              <p className="text-xs text-muted-foreground">
                Aktif sejak {formatLocalDateTime(createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="whatsapp" size="sm" onClick={() => sendWa(token)} disabled={!phone || pending}>
                <MessageCircle /> Kirim via WA
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy(token)}>
                <Copy /> Salin
              </Button>
              <a
                href={`/member/${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent [&_svg]:size-4"
              >
                <ExternalLink /> Buka
              </a>
              <Button variant="outline" size="sm" onClick={() => setConfirm("regen")} disabled={pending}>
                <RefreshCw /> Buat ulang
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm("revoke")} disabled={pending}>
                <ShieldOff /> Nonaktifkan
              </Button>
            </div>
            {!phone && <p className="text-xs text-muted-foreground">Isi No. HP pelanggan untuk kirim via WA.</p>}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => run(() => ensurePortalLinkAction(customerId))} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Buat link portal
            </Button>
            {phone && (
              <Button
                variant="whatsapp"
                size="sm"
                disabled={pending}
                onClick={createAndSend}
              >
                <MessageCircle /> Buat & kirim via WA
              </Button>
            )}
            <p className="w-full text-xs text-muted-foreground">
              Belum ada link. Link juga dibuat otomatis saat struk/nota dikirim via WA ke member ini.
            </p>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirm === "regen"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Buat ulang link portal?"
        description="Link lama langsung tidak berlaku. Gunakan bila link pernah terkirim ke orang lain. Kirim link baru ke pelanggan setelahnya."
        confirmText="Buat ulang"
        onConfirm={() => run(() => regeneratePortalLinkAction(customerId))}
      />
      <ConfirmDialog
        open={confirm === "revoke"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Nonaktifkan link portal?"
        description="Pelanggan tidak bisa membuka portalnya lagi sampai link baru dibuat."
        confirmText="Nonaktifkan"
        destructive
        onConfirm={() => run(() => revokePortalLinkAction(customerId))}
      />
    </Card>
  );
}
