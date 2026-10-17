import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { daysFromNow, formatLocalDate } from "@/lib/timezone";
import { wibDateKey } from "@/lib/daily-content";
import { listDailyContent } from "@/server/daily-content/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { Card } from "@/components/ui/card";
import { ContentManager } from "./content-manager";

export const metadata: Metadata = { title: "Konten Harian" };

export default async function DailyContentPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "settings.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const now = daysFromNow(0);
  const [items, store] = await Promise.all([
    listDailyContent(user.tenantId).catch(() => null),
    getReceiptStoreInfo(user.tenantId),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konten Harian</h1>
        <p className="text-muted-foreground">
          Tulis motivasi, tips, fakta, atau promo toko Anda sendiri. Konten ikut bergilir di Dashboard dan dibagikan sebagai
          gambar Status WA / Story IG dengan desain yang sama.
        </p>
      </div>
      {items === null ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Fitur belum aktif — database belum dimigrasi.
        </Card>
      ) : (
        <ContentManager
          items={items}
          today={wibDateKey(now)}
          dateLabel={formatLocalDate(new Date(now), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          store={{
            name: user.tenant.name,
            logo: store.logo,
            phone: store.phone,
            footer: store.address ? store.address.split("\n")[0] : null,
          }}
        />
      )}
    </div>
  );
}
