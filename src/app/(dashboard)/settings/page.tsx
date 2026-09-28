import type { Metadata } from "next";
import Link from "next/link";
import { Users, BookOpen, AlertTriangle, ArrowRight, Tag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getLicense } from "@/server/license/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreSettingsForm, StoreLogoForm, RedeemLicenseForm, ColorThemePicker, TrackPromoImageForm, ShowQuickStartButton } from "./settings-client";
import { formatLocalDate } from "@/lib/timezone";

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

  // Status masa berlaku lisensi → CTA perpanjang (ke /harga) bila hampir/sudah habis.
  const validMs = license?.validUntil ? new Date(license.validUntil).getTime() : null;
  const daysLeft = validMs != null ? Math.ceil((validMs - Date.now()) / 86_400_000) : null;
  const licenseExpired = !!license && (license.status !== "ACTIVE" || (daysLeft != null && daysLeft < 0));
  const licenseExpiringSoon = daysLeft != null && daysLeft >= 0 && daysLeft <= 14;

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
          <div className="space-y-2 border-t pt-6">
            <p className="text-sm font-medium">Foto Promo (Halaman Lacak)</p>
            <TrackPromoImageForm image={storeInfo.trackPromoImage} />
          </div>
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
                ? ` · Berlaku s/d ${formatLocalDate(license.validUntil, { dateStyle: "medium" })}`
                : ""}
            </CardDescription>
          </CardHeader>
          {canLicense && (
            <CardContent className="space-y-4">
              {(licenseExpired || licenseExpiringSoon) && (
                <div
                  className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    licenseExpired ? "border-rose-500/40 bg-rose-500/5" : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2.5 text-sm">
                    <AlertTriangle className={`size-5 shrink-0 ${licenseExpired ? "text-rose-500" : "text-amber-500"}`} />
                    <div>
                      <p className="font-medium text-foreground">
                        {licenseExpired
                          ? "Lisensi sudah berakhir"
                          : `Lisensi berakhir dalam ${daysLeft} hari`}
                      </p>
                      <p className="text-muted-foreground">Perpanjang agar toko tetap berjalan tanpa gangguan.</p>
                    </div>
                  </div>
                  <Link href="/harga" className={`${buttonVariants({ size: "sm" })} shrink-0 gap-1.5`}>
                    Lihat paket &amp; perpanjang <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
              <RedeemLicenseForm />
              <Link
                href="/harga"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Tag className="size-4" /> Lihat semua paket harga
              </Link>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bantuan & Panduan</CardTitle>
          <CardDescription>Pelajari cara memakai ArtaPOS kapan pun.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ShowQuickStartButton />
          <Link href="/about#panduan" className={buttonVariants({ variant: "outline" })}>
            <BookOpen /> Panduan Lengkap
          </Link>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Total nilai transaksi & laporan ada di menu Keuangan. Contoh format Rupiah: {formatRupiah(1500000)}.
      </p>
    </div>
  );
}
