import type { Metadata } from "next";
import { Wrench, Megaphone } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTrackPagePromo } from "@/server/public/track-info";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Lacak Servis" };

export default async function LacakPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>;
}) {
  const { no } = await searchParams;
  const { storeName, promo, promoImage } = await getTrackPagePromo();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wrench className="size-6" />
            </div>
            <CardTitle className="text-xl">Lacak Status Servis</CardTitle>
            <CardDescription>
              {storeName ? `${storeName} — ` : ""}Masukkan nomor tiket & nomor HP Anda untuk melihat progres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrackForm defaultNumber={no ?? ""} />
          </CardContent>
        </Card>

        {(promo || promoImage) && (
          <Card className="mt-4 overflow-hidden border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <Megaphone className="size-4" /> Info &amp; Promo
              </p>
              {promoImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={promoImage} alt="Foto promo" className="mb-3 w-full rounded-lg border" />
              )}
              {promo && <p className="whitespace-pre-line break-words text-sm">{promo}</p>}
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">Dilayani oleh ArtaPOS</p>
      </div>
    </div>
  );
}
