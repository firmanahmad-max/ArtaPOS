import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { getCustomer, listPointEntries } from "@/server/customers/service";
import { updateCustomerAction } from "@/server/customers/actions";
import { buttonVariants } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";
import { PointsManager } from "../../points-manager";

export const metadata: Metadata = { title: "Edit Pelanggan" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenantId } = await getAuthContext();
  const customer = await getCustomer(tenantId, id);
  if (!customer) notFound();
  const entries = await listPointEntries(tenantId, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Pelanggan</h1>
      </div>
      <ContactForm
        action={updateCustomerAction.bind(null, customer.id)}
        backHref="/customers"
        initial={{
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
        }}
      />
      <PointsManager
        customerId={customer.id}
        balance={customer.points}
        entries={entries.map((e) => ({
          id: e.id,
          points: e.points,
          type: e.type,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
