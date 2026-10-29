"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { linkReferralCodeAction } from "@/server/referrals/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferralShareCard } from "@/components/referrals/referral-share-card";

/**
 * Program Ajak Teman di halaman pelanggan: kode/link pribadi pelanggan ini, siapa
 * yang mengajaknya, dan input "kode ajak" untuk teman yang datang langsung ke toko.
 */
export function CustomerReferralCard({
  customerId,
  slug,
  storeName,
  config,
  info,
  notice,
}: {
  customerId: string;
  slug: string;
  storeName: string;
  config: { referrerPoints: number; friendPoints: number; minPurchase: number; validDays: number };
  info: {
    code: string | null;
    referredBy: { name: string | null; status: "PENDING" | "REWARDED" | "CANCELLED" } | null;
    friends: { rewarded: number; pending: number; points: number };
  };
  notice?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  function link() {
    start(async () => {
      const r = await linkReferralCodeAction(customerId, code);
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan.");
        setCode("");
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Ajak Teman</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {info.code && (
          <ReferralShareCard
            compact
            slug={slug}
            code={info.code}
            storeName={storeName}
            stats={info.friends}
            notice={notice}
            {...config}
          />
        )}
        {info.referredBy ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Diajak oleh </span>
            <b>{info.referredBy.name ?? "member"}</b>
            <span className="text-muted-foreground">
              {" "}
              ·{" "}
              {info.referredBy.status === "REWARDED"
                ? "bonus sudah diberikan"
                : info.referredBy.status === "CANCELLED"
                  ? "dibatalkan"
                  : "bonus menunggu transaksi pertama lunas"}
            </span>
          </p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="ref-code" className="text-sm font-medium">
              Pelanggan baru diajak teman? Masukkan kode ajaknya
            </label>
            <div className="flex gap-2">
              <Input
                id="ref-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="mis. DEWI7K2"
                maxLength={12}
                className="max-w-48 font-mono uppercase"
              />
              <Button variant="outline" onClick={link} disabled={pending || code.trim().length < 4}>
                {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Tautkan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hanya untuk pelanggan yang belum pernah bertransaksi. Bonus otomatis masuk ke keduanya setelah transaksi pertama lunas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
