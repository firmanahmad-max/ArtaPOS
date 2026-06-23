import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getTicket, listProductsForService } from "@/server/service-jobs/service";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketDetail } from "../ticket-detail";
import { ServicePhotos } from "../photos";

export const metadata: Metadata = { title: "Detail Servis" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const [ticket, products] = await Promise.all([
    getTicket(user.tenantId, id),
    listProductsForService(user.tenantId),
  ]);
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/service" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.number}</h1>
        <Link
          href={`/service/${ticket.id}/nota`}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} ml-auto`}
        >
          <Printer /> Cetak Nota
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-muted-foreground">Pelanggan: </span>{ticket.customerName || "—"}{ticket.customerPhone ? ` (${ticket.customerPhone})` : ""}</div>
          <div><span className="text-muted-foreground">Teknisi: </span>{ticket.technicianName || "Belum ditugaskan"}</div>
          <div><span className="text-muted-foreground">Perangkat: </span>{ticket.deviceType}{ticket.deviceBrand ? ` · ${ticket.deviceBrand}` : ""}{ticket.deviceInfo ? ` · ${ticket.deviceInfo}` : ""}</div>
          <div><span className="text-muted-foreground">Masuk: </span>{new Date(ticket.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Keluhan: </span>{ticket.complaint}</div>
          {ticket.diagnosis && <div className="sm:col-span-2"><span className="text-muted-foreground">Diagnosa: </span>{ticket.diagnosis}</div>}
        </CardContent>
      </Card>

      <TicketDetail
        ticket={{
          id: ticket.id,
          status: ticket.status,
          laborCost: ticket.laborCost,
          partsCost: ticket.partsCost,
          total: ticket.total,
          paid: ticket.paid,
          items: ticket.items.map((i) => ({
            id: i.id,
            name: i.name,
            qty: i.qty,
            price: i.price,
            subtotal: i.subtotal,
            isPart: i.isPart,
          })),
        }}
        products={products.map((p) => ({ id: p.id, name: p.name, sellPrice: p.sellPrice, stock: p.stock }))}
        number={ticket.number}
        device={[ticket.deviceType, ticket.deviceBrand].filter(Boolean).join(" ")}
        customerPhone={ticket.customerPhone}
        storeName={user.tenant.name}
      />

      <ServicePhotos
        ticketId={ticket.id}
        photos={ticket.photos.map((p) => ({
          id: p.id,
          dataUrl: p.dataUrl,
          caption: p.caption,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
