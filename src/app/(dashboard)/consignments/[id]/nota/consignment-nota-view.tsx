"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Printer, ArrowLeft, MessageCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { buildConsignmentText, waLink } from "@/lib/whatsapp";
import { shareNodeAsImage } from "@/lib/share-image";
import { buildGalleryUrl } from "@/lib/track-link";

export interface ConsignmentNotaData {
  storeName: string;
  storeLogo?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  /** Slug Galeri Publik toko (null = tak ada pajangan aktif → tautan tak disertakan). */
  gallerySlug?: string | null;
  number: string;
  dateText: string;
  customerName: string;
  customerPhone: string | null;
  note: string | null;
  askingTotal: number;
  owner: { total: number; paid: number; owed: number } | null;
  items: {
    category: string;
    name: string;
    serialNumber: string | null;
    condition: string | null;
    askingPrice: number;
    statusLabel?: string;
    commissionText: string;
    sold: { price: number; commission: number; ownerShare: number; paid: boolean } | null;
  }[];
}

export function ConsignmentNotaView({ data, backHref }: { data: ConsignmentNotaData; backHref: string }) {
  const notaRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const galleryUrl = () =>
    data.gallerySlug ? buildGalleryUrl(window.location.origin, data.gallerySlug, "titip") : null;

  async function shareImage() {
    if (!notaRef.current) return;
    setSharing(true);
    try {
      const gUrl = galleryUrl();
      const { mode } = await shareNodeAsImage(notaRef.current, {
        fileName: `Tanda-Titip-Jual-${data.number}.png`,
        title: `Tanda Titip Jual ${data.number}`,
        text: `Tanda titip jual ${data.storeName} — ${data.number}${gUrl ? `\n🛍️ Lihat galeri produk kami: ${gUrl}` : ""}`,
      });
      if (mode === "downloaded") {
        toast.info("Gambar tanda titip diunduh. Buka WhatsApp lalu lampirkan gambarnya.");
        if (data.customerPhone) window.open(waLink("", data.customerPhone), "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gambar.");
    } finally {
      setSharing(false);
    }
  }

  function sendText() {
    const text = buildConsignmentText({
      storeName: data.storeName,
      number: data.number,
      dateText: data.dateText,
      customerName: data.customerName,
      items: data.items,
      askingTotal: data.askingTotal,
      note: data.note,
      owner: data.owner,
      galleryUrl: galleryUrl(),
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

      <div id="nota" ref={notaRef} className="mx-auto w-[320px] rounded-lg border bg-white p-4 font-mono text-xs text-black">
        <div className="text-center">
          {data.storeLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.storeLogo} alt="Logo toko" className="mx-auto mb-1 max-h-16 w-auto object-contain" />
          )}
          <p className="text-sm font-bold">{data.storeName}</p>
          {data.storeAddress && <p className="whitespace-pre-line text-[10px] leading-tight">{data.storeAddress}</p>}
          {data.storePhone && <p className="text-[10px] leading-tight">Telp: {data.storePhone}</p>}
          <p className="mt-0.5 text-[10px] font-semibold tracking-wide">TANDA TITIP JUAL</p>
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span>No</span><span>{data.number}</span></div>
          <div className="flex justify-between"><span>Tanggal</span><span>{data.dateText}</span></div>
          <div className="flex justify-between gap-2"><span>Pemilik</span><span className="text-right">{data.customerName}</span></div>
          {data.customerPhone && <div className="flex justify-between"><span>No. HP</span><span>{data.customerPhone}</span></div>}
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="space-y-2">
          {data.items.map((it, i) => (
            <div key={i} className="space-y-0.5">
              <div className="font-semibold">{i + 1}. {it.category} — {it.name}</div>
              {it.serialNumber && <div className="text-[10px]">SN: {it.serialNumber}</div>}
              {it.condition && <div className="whitespace-pre-line text-[10px] leading-tight">Kondisi: {it.condition}</div>}
              <div className="flex justify-between">
                <span>Harga jual{it.statusLabel ? ` · ${it.statusLabel}` : ""}</span>
                <span>{formatRupiah(it.askingPrice)}</span>
              </div>
              <div className="text-[10px] text-black/60">Komisi toko: {it.commissionText}</div>
              {it.sold && (
                <div className="mt-0.5 space-y-0.5 rounded border border-dashed border-black/30 p-1 text-[10px]">
                  <div className="flex justify-between"><span>Laku</span><span>{formatRupiah(it.sold.price)}</span></div>
                  <div className="flex justify-between"><span>Komisi toko</span><span>-{formatRupiah(it.sold.commission)}</span></div>
                  <div className="flex justify-between font-semibold">
                    <span>Hak pemilik ({it.sold.paid ? "dibayar" : "belum"})</span>
                    <span>{formatRupiah(it.sold.ownerShare)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed" />
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatRupiah(data.askingTotal)}</span>
        </div>
        <p className="text-[10px] text-black/60">Total harga jual yang diinginkan pemilik ({data.items.length} barang)</p>
        {data.owner && data.owner.total > 0 && (
          <div className="mt-2 space-y-0.5 text-[11px]">
            <div className="flex justify-between"><span>Hak pemilik (barang laku)</span><span>{formatRupiah(data.owner.total)}</span></div>
            <div className="flex justify-between"><span>Sudah dibayar</span><span>{formatRupiah(data.owner.paid)}</span></div>
            <div className="flex justify-between font-bold"><span>Belum dibayar</span><span>{formatRupiah(data.owner.owed)}</span></div>
          </div>
        )}
        {data.note && <p className="mt-1 whitespace-pre-line text-[10px] leading-tight"><span className="font-semibold">Catatan:</span> {data.note}</p>}

        <div className="my-2 border-t border-dashed" />
        <p className="text-center text-[10px] leading-tight">
          Simpan tanda titip ini sebagai bukti. Hubungi kami untuk perubahan harga atau pengambilan barang.
        </p>
      </div>

      <div className="no-print mx-auto w-[320px] space-y-2">
        <Button variant="whatsapp" className="w-full" onClick={shareImage} disabled={sharing}>
          {sharing ? <Loader2 className="animate-spin" /> : <ImageIcon />} Kirim Tanda Titip (Gambar) via WhatsApp
        </Button>
        <Button variant="outline" className="w-full" onClick={sendText}>
          <MessageCircle /> Kirim sebagai Teks
        </Button>
        {!data.customerPhone && (
          <p className="text-center text-xs text-muted-foreground">No. WhatsApp pemilik belum diisi — pilih kontak manual di WhatsApp.</p>
        )}
        <div className="flex gap-2">
          <Link href={backHref} className={`${buttonVariants({ variant: "outline" })} flex-1`}>
            <ArrowLeft /> Detail
          </Link>
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer /> Cetak
          </Button>
        </div>
      </div>
    </div>
  );
}
