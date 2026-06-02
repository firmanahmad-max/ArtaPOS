import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrackForm } from "./track-form";

export const metadata: Metadata = { title: "Lacak Servis" };

export default function LacakPage() {
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
            <CardDescription>Masukkan nomor tiket & nomor HP Anda untuk melihat progres.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrackForm />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">Dilayani oleh ArtaPOS</p>
      </div>
    </div>
  );
}
