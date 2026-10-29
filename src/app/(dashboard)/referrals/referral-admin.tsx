"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, Save, X } from "lucide-react";
import { cancelReferralAction, updateReferralConfigAction } from "@/server/referrals/actions";
import { buildReferralRewardText, waLink } from "@/lib/whatsapp";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CurrencyInput } from "@/components/ui/currency-input";

export interface ReferralConfigView {
  enabled: boolean;
  referrerPoints: number;
  friendPoints: number;
  minPurchase: number;
  validDays: number;
}

/** Pengaturan program (izin settings.manage). */
export function ReferralSettingsForm({
  initial,
  canManage,
  pointValue,
}: {
  initial: ReferralConfigView;
  canManage: boolean;
  pointValue: number;
}) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [pending, start] = useTransition();
  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^0-9]/g, "")) || 0));
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);

  function save() {
    start(async () => {
      const r = await updateReferralConfigAction(c);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan.");
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={c.enabled}
          disabled={!canManage}
          onChange={(e) => setC({ ...c, enabled: e.target.checked })}
        />
        Aktifkan Program Ajak Teman
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Bonus pengajak (poin)</span>
          <Input inputMode="numeric" value={String(c.referrerPoints)} disabled={!canManage} onChange={(e) => setC({ ...c, referrerPoints: num(e.target.value) })} />
          {pointValue > 0 && <span className="block text-xs text-muted-foreground">≈ {formatRupiah(c.referrerPoints * pointValue)}</span>}
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Bonus teman baru (poin)</span>
          <Input inputMode="numeric" value={String(c.friendPoints)} disabled={!canManage} onChange={(e) => setC({ ...c, friendPoints: num(e.target.value) })} />
          {pointValue > 0 && <span className="block text-xs text-muted-foreground">≈ {formatRupiah(c.friendPoints * pointValue)}</span>}
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Minimal transaksi pertama</span>
          <CurrencyInput value={c.minPurchase} disabled={!canManage} onValueChange={(v) => setC({ ...c, minPurchase: v })} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Masa berlaku (hari)</span>
          <Input inputMode="numeric" value={String(c.validDays)} disabled={!canManage} onChange={(e) => setC({ ...c, validDays: num(e.target.value) })} />
        </label>
      </div>
      {canManage && (
        <Button onClick={save} disabled={pending || !dirty}>
          <Save /> Simpan pengaturan
        </Button>
      )}
    </div>
  );
}

export interface ReferralRow {
  id: string;
  view: "pending" | "rewarded" | "expired" | "cancelled";
  referrerId: string;
  referrerName: string | null;
  referrerPhone: string | null;
  friendId: string;
  friendName: string | null;
  createdText: string;
  expiresText: string;
  rewardedText: string | null;
  qualifyingDoc: string | null;
  qualifyingTotal: number | null;
  referrerPoints: number;
  friendPoints: number;
}

const VIEW_META = {
  pending: { label: "Menunggu transaksi", variant: "warning" },
  rewarded: { label: "Bonus diberikan", variant: "success" },
  expired: { label: "Kedaluwarsa", variant: "muted" },
  cancelled: { label: "Dibatalkan", variant: "muted" },
} as const;

/** Daftar ajakan + kabari pengajak via WA + batalkan. */
export function ReferralList({ rows, storeName }: { rows: ReferralRow[]; storeName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (rows.length === 0) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Belum ada teman yang diajak.</Card>;
  }
  return (
    <Card className="divide-y">
      {rows.map((r) => {
        const meta = VIEW_META[r.view];
        return (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0 text-sm">
              <p>
                <Link href={`/customers/${r.friendId}/edit`} className="font-semibold hover:underline">{r.friendName ?? "Teman"}</Link>
                <span className="text-muted-foreground"> diajak oleh </span>
                <Link href={`/customers/${r.referrerId}/edit`} className="font-semibold hover:underline">{r.referrerName ?? "member"}</Link>
              </p>
              <p className="text-xs text-muted-foreground">
                Daftar {r.createdText}
                {r.view === "pending" && ` · berlaku s/d ${r.expiresText}`}
                {r.view === "rewarded" &&
                  ` · ${r.qualifyingDoc ?? ""} ${r.qualifyingTotal ? formatRupiah(r.qualifyingTotal) : ""} · +${r.referrerPoints} / +${r.friendPoints} poin · ${r.rewardedText}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {r.view === "rewarded" && r.referrerPhone && r.referrerPoints > 0 && (
                <a
                  href={waLink(
                    buildReferralRewardText({ storeName, referrerName: r.referrerName, friendName: r.friendName, points: r.referrerPoints }),
                    r.referrerPhone,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#25D366] px-3 text-xs font-semibold text-white hover:opacity-90"
                >
                  <MessageCircle className="size-3.5" /> Kabari pengajak
                </a>
              )}
              {r.view === "pending" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await cancelReferralAction(r.id);
                      if (res.ok) {
                        toast.success(res.message ?? "Dibatalkan.");
                        router.refresh();
                      } else toast.error(res.message ?? "Gagal.");
                    })
                  }
                >
                  <X className="size-3.5" /> Batalkan
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
