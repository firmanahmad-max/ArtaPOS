"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Images, PackageX, Undo2, Trash2, ShoppingCart } from "lucide-react";
import { addUsedItemToGalleryAction } from "@/server/gallery/actions";
import { deleteUsedItemAction, setUsedItemAvailabilityAction } from "@/server/used-items/actions";
import type { UsedStatus } from "@/lib/used-item";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsedItemActions({
  id,
  name,
  status,
  gallery,
}: {
  id: string;
  name: string;
  status: UsedStatus;
  /** Dipajang di Galeri Publik? (null = belum). */
  gallery: { active: boolean } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, success?: string) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? success ?? "Tersimpan");
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  function remove() {
    if (!confirm(`Hapus "${name}" dari daftar barang bekas? Tindakan ini tidak bisa dibatalkan.`)) return;
    start(async () => {
      const r = await deleteUsedItemAction(id);
      if (r.ok) {
        toast.success("Barang bekas dihapus");
        router.push("/used-items");
      } else toast.error(r.message ?? "Gagal menghapus.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tindakan</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {status === "AVAILABLE" && (
          <>
            <Link href="/pos" className={buttonVariants({ size: "sm" })}>
              <ShoppingCart className="size-4" /> Jual di Kasir (tab Bekas)
            </Link>
            {gallery ? (
              <Link href="/gallery" className="inline-flex items-center gap-1 px-2 text-sm font-medium text-success hover:underline">
                <Images className="size-4" /> {gallery.active ? "Tampil di Galeri" : "Di Galeri (disembunyikan)"}
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => addUsedItemToGalleryAction(id))}>
                <Images className="size-4" /> Tampilkan di Galeri
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm(`Tarik "${name}" dari penjualan? (mis. rusak, dipakai sendiri, dikembalikan)`)) {
                  run(() => setUsedItemAvailabilityAction(id, false));
                }
              }}
            >
              <PackageX className="size-4" /> Tarik dari penjualan
            </Button>
          </>
        )}
        {status === "WITHDRAWN" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setUsedItemAvailabilityAction(id, true))}>
            <Undo2 className="size-4" /> Jual kembali
          </Button>
        )}
        {status !== "AVAILABLE" && gallery && (
          <p className="w-full text-xs text-muted-foreground">
            <Images className="mr-1 inline size-3.5" />
            Otomatis disembunyikan dari Galeri Publik selama tidak tersedia.
          </p>
        )}
        {status !== "SOLD" && (
          <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={pending} onClick={remove}>
            <Trash2 className="size-4" /> Hapus
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
