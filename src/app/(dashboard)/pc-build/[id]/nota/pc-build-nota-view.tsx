"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Printer, ArrowLeft, MessageCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { buildPcBuildNotaText, waLink } from "@/lib/whatsapp";
import { shareNodeAsImage } from "@/lib/share-image";

export interface PcBuildNotaItem {
  name: string;
  qty: number;
}

export interface PcBuildNotaData {
  storeName: string;
  storeLogo?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  receiptFooter?: string | null;
  number: string;
  dateText: string;
  statusLabel: string;
  name: string;
  customerName: string | null;
  customerPhone: string | null;
  items: PcBuildNotaItem[];
  discount: number;
  total: number;
}

export function PcBuildNotaView({ data, backHref }: { data: PcBuildNotaData; backHref: string }) {
  const notaRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  async function shareImage() {
    if (!notaRef.current) return;
    setSharing(true);
    try {
      const { mode } = await shareNodeAsImage(notaRef.current, {
        fileName: `Nota-Rakit-${data.number}.png`,
        title: `Nota Rakit PC ${data.number}`,
        text: `Nota rakit PC ${data.storeName} — ${data.number}`,
      });
      if (mode === "downloaded") {
        toast.info("Gambar nota diunduh. Buka WhatsApp lalu lampirkan gambarnya.");
        if (data.customerPhone) window.open(waLink("", data.customerPhone), "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gambar nota.");
    } finally {
      setSharing(false);
    }
  }

  function sendWhatsApp() {
    const text = buildPcBuildNotaText({
      storeName: data.storeName,
      number: data.number,
      dateText: data.dateText,
      statusLabel: data.statusLabel,
      name: data.name,
      customerName: data.customerName,
      items: data.items,
      discount: data.discount,
      total: data.total,
      footer: data.receiptFooter,
    });
    window.open(waLink(text, data.customerPhone ?? undefined), "_blank", "noopener,noreferrer");
  }

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
        ref={notaRef}
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
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide">NOTA RAKIT PC</p>
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span>No</span><span>{data.number}</span></div>
          <div className="flex justify-between"><span>Tanggal</span><span>{data.dateText}</span></div>
          <div className="flex justify-between"><span>Status</span><span className="font-semibold">{data.statusLabel}</span></div>
          <div className="flex justify-between"><span>Rakitan</span><span className="text-right">{data.name}</span></div>
          <div className="flex justify-between"><span>Pelanggan</span><span>{data.customerName ?? "Umum"}</span></div>
          {data.customerPhone && (
            <div className="flex justify-between"><span>No. HP</span><span>{data.customerPhone}</span></div>
          )}
        </div>

        <div className="my-2 border-t border-dashed" />
        <p className="mb-1 text-[10px] font-semibold tracking-wide">SPESIFIKASI KOMPONEN</p>
        {data.items.length > 0 ? (
          <div className="space-y-0.5">
            {data.items.map((it, i) => (
              <div key={i} className="flex gap-1.5">
                <span className="text-black/60">{i + 1}.</span>
                <span className="flex-1">
                  {it.name}
                  {it.qty > 1 && <span className="text-black/60"> ({it.qty}x)</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-black/60">Belum ada komponen.</p>
        )}

        <div className="my-2 border-t border-dashed" />
        {data.discount > 0 && (
          <div className="mb-1 space-y-0.5 text-[11px]">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(data.total + data.discount)}</span></div>
            <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(data.discount)}</span></div>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL RAKITAN</span>
          <span>{formatRupiah(data.total)}</span>
        </div>

        <div className="my-2 border-t border-dashed" />
        <p className="whitespace-pre-line text-center text-[10px]">
          {data.receiptFooter || "Terima kasih telah mempercayakan rakitan kepada kami 🙏"}
        </p>
      </div>

      <div className="no-print mx-auto w-[320px] space-y-2">
        <Button
          className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]"
          onClick={shareImage}
          disabled={sharing}
        >
          {sharing ? <Loader2 className="animate-spin" /> : <ImageIcon />} Kirim Nota (Gambar) via WhatsApp
        </Button>
        <Button variant="outline" className="w-full" onClick={sendWhatsApp}>
          <MessageCircle /> Kirim sebagai Teks
        </Button>
        <div className="flex gap-2">
          <Link href={backHref} className={`${buttonVariants({ variant: "outline" })} flex-1`}>
            <ArrowLeft /> Kembali
          </Link>
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer /> Cetak Nota
          </Button>
        </div>
      </div>
    </div>
  );
}
