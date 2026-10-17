import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MemberNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-3 p-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Link tidak berlaku</h1>
          <p className="text-sm text-muted-foreground">
            Link portal member ini sudah tidak aktif atau salah ketik. Silakan minta link terbaru ke toko via WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
