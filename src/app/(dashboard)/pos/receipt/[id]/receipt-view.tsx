"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Printer, Plus, Bluetooth, Loader2, MessageCircle, Image as ImageIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { buildSaleReceiptText, waLink } from "@/lib/whatsapp";
import { buildReceiptEscpos } from "@/lib/escpos";
import { imageToEscposRaster } from "@/lib/escpos-image";
import { printViaBluetooth } from "@/lib/bluetooth-printer";
import { shareNodeAsImage } from "@/lib/share-image";

export interface ReceiptItem {
  productName: string;
  qty: number;
  price: number;
  subtotal: number;
}
export interface ReceiptData {
  storeName: string;
  storeLogo?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  receiptFooter?: string | null;
  number: string;
  createdAt: string;
  customerName: string | null;
  customerPhone?: string | null;
  cashierName: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paid: number;
  change: number;
  items: ReceiptItem[];
}

const METHOD: Record<string, string> = { CASH: "Tunai", TRANSFER: "Transfer", QRIS: "QRIS", CREDIT: "Kredit" };

export function ReceiptView({ data }: { data: ReceiptData }) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [btStatus, setBtStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function shareImage() {
    if (!receiptRef.current) return;
    setSharing(true);
    try {
      const { mode } = await shareNodeAsImage(receiptRef.current, {
        fileName: `Struk-${data.number}.png`,
        title: `Struk ${data.number}`,
        text: `Struk penjualan ${data.storeName} — ${data.number}`,
      });
      if (mode === "downloaded") {
        toast.info("Gambar struk diunduh. Buka WhatsApp lalu lampirkan gambarnya.");
        if (data.customerPhone) window.open(waLink("", data.customerPhone), "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat gambar struk.");
    } finally {
      setSharing(false);
    }
  }

  async function printBluetooth() {
    setBtStatus(null);
    setPrinting(true);
    try {
      const logo = data.storeLogo
        ? await imageToEscposRaster(data.storeLogo).catch(() => undefined)
        : undefined;
      const buffer = buildReceiptEscpos({
        storeName: data.storeName,
        logo,
        number: data.number,
        dateText: new Date(data.createdAt).toLocaleString("id-ID", {
          dateStyle: "short",
          timeStyle: "short",
        }),
        cashierName: data.cashierName,
        customerName: data.customerName,
        addressLines: data.storeAddress ? data.storeAddress.split("\n") : undefined,
        phone: data.storePhone ?? undefined,
        items: data.items.map((i) => ({
          name: i.productName,
          qty: i.qty,
          price: i.price,
          subtotal: i.subtotal,
        })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        methodLabel: METHOD[data.paymentMethod] ?? data.paymentMethod,
        paid: data.paid,
        change: data.change,
        footer: data.receiptFooter || "Terima kasih telah berbelanja",
      });
      await printViaBluetooth(buffer);
      setBtStatus({ ok: true, text: "Struk terkirim ke printer." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mencetak.";
      // Pembatalan dialog perangkat bukan error yang perlu ditonjolkan.
      if (!/cancel|user gesture|chooser/i.test(msg)) {
        setBtStatus({ ok: false, text: msg });
      }
    } finally {
      setPrinting(false);
    }
  }

  function sendWhatsApp() {
    const text = buildSaleReceiptText({
      storeName: data.storeName,
      number: data.number,
      dateText: new Date(data.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }),
      cashierName: data.cashierName,
      customerName: data.customerName,
      items: data.items.map((i) => ({ name: i.productName, qty: i.qty, price: i.price, subtotal: i.subtotal })),
      subtotal: data.subtotal,
      discount: data.discount,
      total: data.total,
      methodLabel: METHOD[data.paymentMethod] ?? data.paymentMethod,
      paid: data.paid,
      change: data.change,
      footer: data.receiptFooter || undefined,
    });
    window.open(waLink(text, data.customerPhone ?? undefined), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-4">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #receipt, #receipt * { visibility: visible !important; }
        #receipt { position: absolute; left: 0; top: 0; width: 80mm; }
        .no-print { display: none !important; }
      }`}</style>

      <div
        id="receipt"
        ref={receiptRef}
        className="mx-auto w-[300px] rounded-lg border bg-white p-4 font-mono text-xs text-black"
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
          <p className="mt-0.5 text-[10px]">Struk Penjualan</p>
        </div>
        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between"><span>No</span><span>{data.number}</span></div>
          <div className="flex justify-between">
            <span>Tanggal</span>
            <span>{new Date(data.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</span>
          </div>
          <div className="flex justify-between"><span>Kasir</span><span>{data.cashierName ?? "-"}</span></div>
          <div className="flex justify-between"><span>Pelanggan</span><span>{data.customerName ?? "Umum"}</span></div>
        </div>
        <div className="my-2 border-t border-dashed" />
        <div className="space-y-1">
          {data.items.map((it, i) => (
            <div key={i}>
              <div>{it.productName}</div>
              <div className="flex justify-between">
                <span>{it.qty} x {formatRupiah(it.price)}</span>
                <span>{formatRupiah(it.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="my-2 border-t border-dashed" />
        <div className="space-y-0.5">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(data.subtotal)}</span></div>
          {data.discount > 0 && (
            <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(data.discount)}</span></div>
          )}
          <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatRupiah(data.total)}</span></div>
          <div className="flex justify-between"><span>Bayar ({METHOD[data.paymentMethod] ?? data.paymentMethod})</span><span>{formatRupiah(data.paid)}</span></div>
          <div className="flex justify-between"><span>Kembali</span><span>{formatRupiah(data.change)}</span></div>
        </div>
        <div className="my-2 border-t border-dashed" />
        <p className="whitespace-pre-line text-center text-[10px]">
          {data.receiptFooter || "Terima kasih telah berbelanja 🙏"}
        </p>
      </div>

      <div className="no-print mx-auto w-[300px] space-y-2">
        <Button
          className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5b]"
          onClick={shareImage}
          disabled={sharing}
        >
          {sharing ? <Loader2 className="animate-spin" /> : <ImageIcon />} Kirim Struk (Gambar) via WhatsApp
        </Button>
        <Button variant="outline" className="w-full" onClick={sendWhatsApp}>
          <MessageCircle /> Kirim sebagai Teks
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={printBluetooth} disabled={printing}>
            {printing ? <Loader2 className="animate-spin" /> : <Bluetooth />} Print Bluetooth
          </Button>
          <Button variant="outline" size="icon" title="Cetak via browser" onClick={() => window.print()}>
            <Printer />
          </Button>
        </div>
        {btStatus && (
          <p
            className={
              btStatus.ok
                ? "rounded-md bg-success/10 px-3 py-2 text-xs text-success"
                : "rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
            }
          >
            {btStatus.text}
          </p>
        )}
        <Link href="/pos" className={`${buttonVariants({ variant: "outline" })} w-full`}>
          <Plus /> Transaksi Baru
        </Link>
      </div>
    </div>
  );
}
