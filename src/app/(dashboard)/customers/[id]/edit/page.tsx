import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCustomer, getLoyaltyConfig, listPointEntries } from "@/server/customers/service";
import { updateCustomerAction } from "@/server/customers/actions";
import { buttonVariants } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/contact-form";
import { PointsManager } from "../../points-manager";
import { PortalCard } from "../../portal-card";
import { CustomerReferralCard } from "../../referral-card";
import { getCustomerReferral, getReferralConfig } from "@/server/referrals/service";

export const metadata: Metadata = { title: "Edit Pelanggan" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { tenantId } = user;
  const customer = await getCustomer(tenantId, id);
  if (!customer) notFound();
  const [entries, loyalty, refCfg] = await Promise.all([
    listPointEntries(tenantId, id),
    getLoyaltyConfig(tenantId),
    getReferralConfig(tenantId),
  ]);
  const referral =
    refCfg.enabled && customer.isActive ? await getCustomerReferral(tenantId, customer.id).catch(() => null) : null;
  const slug = refCfg.slug;

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
        waConsent={customer.waConsent}
        initial={{
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
        }}
      />
      {customer.isActive && (
        <PortalCard
          customerId={customer.id}
          customerName={customer.name}
          phone={customer.phone}
          storeName={user.tenant.name}
          initialToken={customer.portalToken}
          tokenAt={customer.portalTokenAt?.toISOString() ?? null}
          views={customer.portalViews}
          lastSeenAt={customer.portalLastSeenAt?.toISOString() ?? null}
        />
      )}
      {referral && slug && (
        <CustomerReferralCard
          customerId={customer.id}
          slug={slug}
          storeName={user.tenant.name}
          config={{
            referrerPoints: refCfg.referrerPoints,
            friendPoints: refCfg.friendPoints,
            minPurchase: refCfg.minPurchase,
            validDays: refCfg.validDays,
          }}
          info={referral}
        />
      )}
      <PointsManager
        customerId={customer.id}
        balance={customer.points}
        loyalty={loyalty}
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
