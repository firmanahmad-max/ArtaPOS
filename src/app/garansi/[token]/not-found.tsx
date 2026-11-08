import { ShieldX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function WarrantyNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-3 p-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
            <ShieldX className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Kartu garansi tidak ditemukan</h1>
          <p className="text-sm text-muted-foreground">
            QR/link ini tidak terdaftar di sistem toko. Hati-hati terhadap kartu garansi palsu — hubungi toko tempat Anda
            membeli untuk memastikan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
