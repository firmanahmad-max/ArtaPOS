import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_USED_ITEM, UsedItemForm } from "../used-item-form";

export const metadata: Metadata = { title: "Tambah Barang Bekas" };

export default async function NewUsedItemPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/used-items" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tambah Barang Bekas</h1>
          <p className="text-sm text-muted-foreground">Nomor BK dibuat otomatis &amp; bisa dicetak sebagai label barcode.</p>
        </div>
      </div>
      <UsedItemForm id={null} initial={EMPTY_USED_ITEM} />
    </div>
  );
}
