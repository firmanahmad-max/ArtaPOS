"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adjustStockAction } from "@/server/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StockAdjustForm({
  productId,
  currentStock,
}: {
  productId: string;
  currentStock: number;
}) {
  const [state, action, pending] = useActionState(adjustStockAction, undefined);
  const router = useRouter();

  // Setelah sukses, segarkan data server (stok terbaru). Efek cleanup-free, aman.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesuaikan Stok</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="productId" value={productId} />
          <p className="text-sm text-muted-foreground">
            Stok saat ini: <span className="font-medium text-foreground">{currentStock}</span>.
            Masukkan angka positif untuk menambah, negatif untuk mengurangi.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="qty">Jumlah (mis. 10 atau -3)</Label>
              <Input id="qty" name="qty" type="number" placeholder="0" required />
            </div>
            <div className="flex flex-[2] flex-col gap-2">
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" name="note" placeholder="mis. koreksi opname" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Terapkan
            </Button>
          </div>
          {state?.message && (
            <p
              className={
                state.ok
                  ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
                  : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
