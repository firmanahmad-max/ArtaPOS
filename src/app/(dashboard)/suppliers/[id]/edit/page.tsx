import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { getSupplier } from "@/server/suppliers/service";
import { updateSupplierAction } from "@/server/suppliers/actions";
import { buttonVariants } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";

export const metadata: Metadata = { title: "Edit Supplier" };

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await getAuthContext();
  const supplier = await getSupplier(tenantId, id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/suppliers" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Supplier</h1>
      </div>
      <ContactForm
        action={updateSupplierAction.bind(null, supplier.id)}
        backHref="/suppliers"
        initial={{
          name: supplier.name,
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
        }}
      />
    </div>
  );
}
