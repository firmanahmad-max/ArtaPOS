import { listPromoCodes } from "@/server/platform/service";
import { PromoClient } from "./promo-client";

export default async function AdminPromoPage() {
  const codes = await listPromoCodes();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kode Promo / Aktivasi</h1>
        <p className="text-muted-foreground">
          Buat kode yang ditukar toko untuk mengaktifkan / memperpanjang paket lisensinya.
        </p>
      </div>
      <PromoClient
        codes={codes.map((c) => ({
          id: c.id,
          code: c.code,
          plan: c.plan,
          durationDays: c.durationDays,
          maxTransactions: c.maxTransactions,
          maxRedemptions: c.maxRedemptions,
          redemptionsUsed: c.redemptionsUsed,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          isActive: c.isActive,
          note: c.note,
          redemptions: c._count.redemptions,
        }))}
      />
    </div>
  );
}
