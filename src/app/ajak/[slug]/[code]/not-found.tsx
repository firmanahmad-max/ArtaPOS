import { Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ReferralNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-3 p-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
            <Gift className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Link ajakan tidak berlaku</h1>
          <p className="text-sm text-muted-foreground">
            Kode ajakan salah ketik atau program sedang tidak aktif. Silakan minta link terbaru ke teman Anda atau hubungi toko.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
