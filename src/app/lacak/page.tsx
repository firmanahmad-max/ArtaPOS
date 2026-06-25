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
  const { storeName, promo } = await getTrackPagePromo();
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

        {promo && (
          <Card className="mt-4 border-primary/30 bg-primary/5">
            <CardContent className="flex gap-3 p-4">
              <Megaphone className="size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-primary">Info &amp; Promo</p>
                <p className="whitespace-pre-line break-words text-sm">{promo}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">Dilayani oleh ArtaPOS</p>
      </div>
    </div>
  );
}
