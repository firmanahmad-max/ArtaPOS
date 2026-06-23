"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";

export interface NotaItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  isPart: boolean;
}

export interface ServiceNotaData {
  storeName: string;
  storeLogo?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  receiptFooter?: string | null;
  number: string;
  dateText: string;
  statusLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  device: string;
  technicianName: string | null;
  complaint: string;
  diagnosis: string | null;
  items: NotaItem[];
  laborCost: number;
  total: number;
  paid: number;
}

export function ServiceNotaView({ data, backHref }: { data: ServiceNotaData; backHref: string }) {
  const outstanding = Math.max(0, data.total - data.paid);

  return (
    <div className="space-y-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #nota, #nota * { visibility: visible !important; }
        #nota { position: absolute; left: 0; top: 0; width: 80mm; }
        .no-print { display: none !important; }
      }`}</style>

      <div
        id="nota"
        className="mx-auto w-[320px] rounded-lg border bg-white p-4 font-mono text-xs text-black"
      >
        <div className="text-center">
          {data.storeLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.storeLogo} alt="Logo toko" className="mx-auto mb-1 max-h-16 w-auto object-contain" />
          )}
          <p className="text-sm font-bold">{data.storeName}</p>
          {data.storeAddress && (
            <p className="whitespace-pre-line text-[10px] leading-tight">{data.storeAddress}</p>
          )}
          {data.storePhone && <p className="text-[10px] leading-tight">Telp: {data.storePhone}</p>}
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide">NOTA SERVIS</p>
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span>No</span><span>{data.number}</span></div>
          <div className="flex justify-between"><span>Tanggal</span><span>{data.dateText}</span></div>
          <div className="flex justify-between"><span>Status</span><span className="font-semibold">{data.statusLabel}</span></div>
          <div className="flex justify-between"><span>Pelanggan</span><span>{data.customerName ?? "Umum"}</span></div>
          {data.customerPhone && (
            <div className="flex justify-between"><span>No. HP</span><span>{data.customerPhone}</span></div>
          )}
          <div className="flex justify-between"><span>Perangkat</span><span className="text-right">{data.device || "—"}</span></div>
          {data.technicianName && (
            <div className="flex justify-between"><span>Teknisi</span><span>{data.technicianName}</span></div>
          )}
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5 text-[10px] leading-tight">
          <div><span className="font-semibold">Keluhan:</span> {data.complaint}</div>
          {data.diagnosis && <div><span className="font-semibold">Diagnosa:</span> {data.diagnosis}</div>}
        </div>

        <div className="my-2 border-t border-dashed" />
        {data.items.length > 0 ? (
          <div className="space-y-1">
            {data.items.map((it, i) => (
              <div key={i}>
                <div>
                  {it.name}
                  {it.isPart && <span className="ml-1 text-[9px] text-black/60">(part)</span>}
                </div>
                <div className="flex justify-between">
                  <span>{it.qty} x {formatRupiah(it.price)}</span>
                  <span>{formatRupiah(it.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-black/60">Tanpa sparepart/jasa tambahan.</p>
        )}

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5">
          {data.laborCost > 0 && (
            <div className="flex justify-between"><span>Biaya Jasa</span><span>{formatRupiah(data.laborCost)}</span></div>
          )}
          <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatRupiah(data.total)}</span></div>
          <div className="flex justify-between"><span>Dibayar</span><span>{formatRupiah(data.paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Sisa</span><span>{formatRupiah(outstanding)}</span></div>
        </div>

        <div className="my-2 border-t border-dashed" />
        <p className="whitespace-pre-line text-center text-[10px]">
          {data.receiptFooter || "Terima kasih telah mempercayakan servis kepada kami 🙏"}
        </p>
      </div>

      <div className="no-print mx-auto flex w-[320px] gap-2">
        <Link href={backHref} className={`${buttonVariants({ variant: "outline" })} flex-1`}>
          <ArrowLeft /> Kembali
        </Link>
        <Button className="flex-1" onClick={() => window.print()}>
          <Printer /> Cetak Nota
        </Button>
      </div>
    </div>
  );
}
