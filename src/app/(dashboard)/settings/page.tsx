import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getLicense } from "@/server/license/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreSettingsForm, StoreLogoForm, LicenseForm, ColorThemePicker } from "./settings-client";

export const metadata: Metadata = { title: "Pengaturan" };

const PLAN_LABEL: Record<string, string> = {
  DEMO_DAILY: "Demo Harian",
  DEMO_MONTHLY: "Demo Bulanan",
  DEMO_TRANSACTIONS: "Demo (batas transaksi)",
  UNLIMITED: "Unlimited",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "settings.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const license = await getLicense(user.tenantId);
  const storeInfo = await getReceiptStoreInfo(user.tenantId);
  const canLicense = can(user.role, "license.manage");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        {can(user.role, "users.manage") && (
          <Link href="/users" className={buttonVariants({ variant: "outline" })}>
            <Users /> Kelola Pengguna
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tema Warna</CardTitle>
          <CardDescription>Pilih nuansa pastel aplikasi. Berlaku langsung & tersimpan di perangkat ini (terpisah dari mode terang/gelap).</CardDescription>
        </CardHeader>
        <CardContent>
          <ColorThemePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil Toko</CardTitle>
          <CardDescription>Nama & identitas yang tampil pada struk penjualan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <StoreLogoForm logo={storeInfo.logo} />
          <StoreSettingsForm
            name={user.tenant.name}
            address={storeInfo.address}
            phone={storeInfo.phone}
            receiptFooter={storeInfo.receiptFooter}
            trackPromo={storeInfo.trackPromo}
          />
        </CardContent>
      </Card>

      {license && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Lisensi
              <Badge variant={license.status === "ACTIVE" ? "success" : "warning"}>{license.status}</Badge>
            </CardTitle>
            <CardDescription>
              Paket: {PLAN_LABEL[license.plan] ?? license.plan}
              {license.plan === "DEMO_TRANSACTIONS" && license.maxTransactions != null
                ? ` · Transaksi ${license.transactionsUsed}/${license.maxTransactions}`
                : ` · Transaksi terpakai: ${license.transactionsUsed}`}
              {license.validUntil
                ? ` · Berlaku s/d ${new Date(license.validUntil).toLocaleDateString("id-ID", { dateStyle: "medium" })}`
                : ""}
            </CardDescription>
          </CardHeader>
          {canLicense && (
            <CardContent>
              <LicenseForm
                plan={license.plan}
                status={license.status}
                maxTransactions={license.maxTransactions}
                validUntil={license.validUntil ? new Date(license.validUntil).toISOString().slice(0, 10) : null}
              />
            </CardContent>
          )}
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Total nilai transaksi & laporan ada di menu Keuangan. Contoh format Rupiah: {formatRupiah(1500000)}.
      </p>
    </div>
  );
}
